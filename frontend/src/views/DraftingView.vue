<template>
  <div data-testid="drafting-view" class="drafting-view">
    <h2 data-testid="drafting-title" class="section-title">正文迭代</h2>

    <!-- Loading -->
    <div v-if="chapterStore.loading" data-testid="drafting-loading" class="drafting-loading">
      <a-spin tip="加载章节列表..." />
    </div>

    <!-- Error -->
    <div v-else-if="chapterStore.error" data-testid="drafting-error" class="drafting-error">
      <a-alert type="error" :message="chapterStore.error" show-icon />
      <a-button class="drafting-error__retry" @click="chapterStore.loadChapters(projectId)">重试</a-button>
    </div>

    <!-- Empty state -->
    <div v-else-if="sortedChapters.length === 0" data-testid="drafting-empty-state" class="drafting-empty">
      <a-card>
        <a-empty description="暂无章节，请先在 BEATS 阶段生成细纲">
          <template #children>
            <p class="drafting-empty__hint">完成细纲拆解后，章节将在此处展示并可逐章生成正文。</p>
          </template>
        </a-empty>
      </a-card>
    </div>

    <!-- EditorWorkspace (when a chapter is selected) -->
    <EditorWorkspace
      v-else-if="selectedChapter"
      :key="selectedChapter.id"
      :chapter-id="selectedChapter.id"
      :chapter-title="selectedChapter.title || '未命名章节'"
      :chapter-content="selectedChapter.content || ''"
      :chapter-status="selectedChapter.status"
      :target-word-count="selectedChapter.targetWordCount"
      :generation-mode="generationMode"
      :is-generating="isGenerating"
      :is-paused="isPaused"
      :review-result="selectedChapter.reviewResult as any"
      @close="closeWorkspace"
      @mode-change="handleModeChange"
      @content-change="(val: string) => handleContentChange(selectedChapter.id, val)"
      @pause="handlePause(selectedChapter.id)"
      @continue="handleContinue(selectedChapter.id)"
      @retry="(feedback: string) => handleRetry(selectedChapter.id, feedback)"
      @confirm="handleConfirm(selectedChapter.id)"
      @dispute="handleDispute(selectedChapter.id)"
      @generate="handleGenerateFromWorkspace"
      @submit-review="handleSubmitReview(selectedChapter.id)"
      @adopt-suggestions="() => {}"
      @adopt-and-re-review="() => {}"
      @manual-edit="() => {}"
      @appeal="(reason: string) => {}"
    />

    <!-- Chapter list (when no chapter selected) -->
    <div v-else data-testid="chapter-list" class="chapter-list">
      <!-- Total word count -->
      <div data-testid="total-word-count" class="chapter-list__stats">
        <a-tag color="blue">总计字数：{{ totalWordCount }}</a-tag>
      </div>

      <a-card
        v-for="chapter in sortedChapters"
        :key="chapter.id"
        data-testid="chapter-list-item"
        class="chapter-list__item"
        @click="selectChapter(chapter)"
      >
        <div class="chapter-list__item-header">
          <span
            data-testid="chapter-number"
            :data-chapter-number="chapter.chapterNumber"
            class="chapter-list__item-number"
          >
            第 {{ chapter.chapterNumber }} 章
          </span>
          <span data-testid="chapter-title" class="chapter-list__item-title">
            {{ chapter.title || '未命名章节' }}
          </span>
          <a-tag
            data-testid="chapter-status-badge"
            :color="chapterStatusColor(chapter.status)"
          >
            {{ chapterStatusLabel(chapter.status) }}
          </a-tag>
        </div>

        <div class="chapter-list__item-meta">
          <span data-testid="chapter-word-count" class="chapter-list__item-word-count">
            已写：{{ wordCount(chapter.content) }} 字
          </span>
          <span data-testid="chapter-target-word-count" class="chapter-list__item-target">
            目标：{{ chapter.targetWordCount }} 字
          </span>
        </div>

        <!-- Beat info (Issue #24) -->
        <div
          v-if="getChapterBeat(chapter.chapterNumber)"
          class="chapter-list__item-beat"
        >
          <span
            data-testid="beat-conflict-summary"
            class="chapter-list__item-beat-conflict"
          >
            {{ getChapterBeat(chapter.chapterNumber)!.plan.conflictPoint || '—' }}
          </span>
          <span
            data-testid="beat-hook-summary"
            class="chapter-list__item-beat-hooks"
          >
            钩子 ×{{ getChapterBeat(chapter.chapterNumber)!.hookCount }}
          </span>
          <a-tag
            v-if="getChapterBeat(chapter.chapterNumber)!.status === 'STALE'"
            data-testid="beat-stale-badge"
            color="red"
            size="small"
          >
            待更新
          </a-tag>
        </div>

        <div class="chapter-list__item-actions">
          <a-button
            v-if="showGenerateButton(chapter)"
            data-testid="generate-chapter-btn"
            type="primary"
            size="small"
            :disabled="!canGenerate(chapter)"
            @click.stop="handleGenerate(chapter)"
          >
            {{ chapter.status === 'DRAFT' ? '生成中...' : '生成正文' }}
          </a-button>
        </div>
      </a-card>

      <!-- Completion banner -->
      <CompletionBanner
        v-if="allChaptersCompleted"
        :visible="allChaptersCompleted"
        @confirm-completion="handleConfirmCompletion"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import * as chapterApi from "@/api/chapter";
import * as projectApi from "@/api/project";
import * as beatsApi from "@/api/beats";
import type { BeatDataResponse } from "@/api/beats";
import type { Chapter } from "@/stores/useChapterStore";
import { useChapterStore } from "@/stores/useChapterStore";
import CompletionBanner from "@/components/CompletionBanner.vue";
import EditorWorkspace from "@/components/EditorWorkspace.vue";
import type { GenerationMode } from "@/stores/useChapterStore";
import {
  TERMINAL_CHAPTER_STATUSES,
  ACTIVE_CHAPTER_STATUSES,
  chapterStatusLabel,
  chapterStatusColor,
} from "@/types";

// ─── Props ──────────────────────────────────────────────────────────

const props = defineProps<{
  projectId: string;
}>();

// ─── Store ──────────────────────────────────────────────────────────

const chapterStore = useChapterStore();

// ─── Local state ────────────────────────────────────────────────────

const beats = ref<BeatDataResponse[]>([]);
const selectedChapterId = ref<string | null>(null);
const isGenerating = ref(false);
const isPaused = ref(false);
const generationMode = ref<GenerationMode>("new-continue");

// ─── Derived ────────────────────────────────────────────────────────

const sortedChapters = computed(() =>
  [...chapterStore.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
);

const selectedChapter = computed(() => {
  if (!selectedChapterId.value) return null;
  return chapterStore.chapters.find((c) => c.id === selectedChapterId.value) ?? null;
});

const totalWordCount = computed(() =>
  sortedChapters.value.reduce((sum, ch) => sum + wordCount(ch.content), 0)
);

/** Beat lookup by chapterNumber */
const beatByChapter = computed(() => {
  const map = new Map<number, BeatDataResponse>();
  for (const b of beats.value) {
    map.set(b.chapterNumber, b);
  }
  return map;
});

function getChapterBeat(chapterNumber: number): BeatDataResponse | undefined {
  return beatByChapter.value.get(chapterNumber);
}

const allChaptersCompleted = computed(() => {
  const list = sortedChapters.value;
  return list.length > 0 && list.every((ch) => TERMINAL_CHAPTER_STATUSES.has(ch.status));
});

// ─── Helpers ────────────────────────────────────────────────────────

/** 统计中文字数（CJK 逐字 + ASCII 逐词，剔除空白） */
function wordCount(content: string | null): number {
  if (!content) return 0;
  return content.replace(/\s/g, "").length;
}

function showGenerateButton(chapter: Chapter): boolean {
  return !TERMINAL_CHAPTER_STATUSES.has(chapter.status);
}

function canGenerate(chapter: Chapter): boolean {
  if (ACTIVE_CHAPTER_STATUSES.has(chapter.status)) return false;
  if (chapter.chapterNumber === 1) return true;
  const idx = sortedChapters.value.findIndex((c) => c.id === chapter.id);
  if (idx <= 0) return false;
  return TERMINAL_CHAPTER_STATUSES.has(sortedChapters.value[idx - 1].status);
}

// ─── Chapter selection ──────────────────────────────────────────────

function selectChapter(chapter: Chapter) {
  selectedChapterId.value = chapter.id;
}

function closeWorkspace() {
  selectedChapterId.value = null;
  isPaused.value = false;
}

// ─── Workspace event handlers ───────────────────────────────────────

function handleModeChange(mode: string) {
  generationMode.value = mode as GenerationMode;
}

function handleContentChange(_chapterId: string, _content: string) {
  // Content changes are handled by the parent via SSE or manual editing
}

async function handlePause(chapterId: string) {
  isPaused.value = true;
  try {
    await chapterApi.pauseChapter(props.projectId, chapterId);
  } catch (e: any) {
    chapterStore.error = e.message || "暂停失败";
  }
}

async function handleContinue(chapterId: string) {
  const chapter = chapterStore.chapters.find((c) => c.id === chapterId);
  try {
    isPaused.value = false;
    isGenerating.value = true;
    await chapterApi.continueChapter(props.projectId, chapterId, {
      currentContent: chapter?.content ?? "",
    });
    isGenerating.value = false;
    await chapterStore.loadChapters(props.projectId);
  } catch (e: any) {
    isGenerating.value = false;
    chapterStore.error = e.message || "继续生成失败";
  }
}

async function handleRetry(chapterId: string, feedback: string) {
  try {
    isGenerating.value = true;
    await chapterApi.retryChapter(props.projectId, chapterId, {
      mode: generationMode.value,
      feedback: feedback || undefined,
    });
    isGenerating.value = false;
    await chapterStore.loadChapters(props.projectId);
  } catch (e: any) {
    isGenerating.value = false;
    chapterStore.error = e.message || "重试失败";
  }
}

async function handleConfirm(chapterId: string) {
  try {
    await chapterApi.confirmChapter(props.projectId, chapterId);
    chapterStore.updateChapterStatus(chapterId, 'COMPLETED');
  } catch (e: any) {
    chapterStore.error = e.message || "确认失败";
  }
}

async function handleDispute(chapterId: string) {
  try {
    await chapterApi.disputeChapter(props.projectId, chapterId);
    chapterStore.updateChapterStatus(chapterId, 'DISPUTED');
  } catch (e: any) {
    chapterStore.error = e.message || "争议标记失败";
  }
}

async function handleSubmitReview(chapterId: string) {
  try {
    await chapterApi.reviewChapter(props.projectId, chapterId);
    await chapterStore.loadChapters(props.projectId);
  } catch (e: any) {
    chapterStore.error = e.message || "提交审核失败";
  }
}

// ─── Actions ────────────────────────────────────────────────────────

async function handleGenerateFromWorkspace() {
  const chapter = selectedChapter.value;
  if (!chapter) return;
  await handleGenerate(chapter);
}

async function fetchBeats() {
  try {
    beats.value = await beatsApi.getBeats(props.projectId);
  } catch {
    // silently ignore — beat info is supplementary
  }
}

async function handleGenerate(chapter: Chapter) {
  isGenerating.value = true;
  try {
    await chapterApi.generateChapter(props.projectId, chapter.id, {
      mode: "new-continue",
    });
    await chapterStore.loadChapters(props.projectId);
    // 生成完成后自动选中章节，让用户立即看到生成的正文
    selectChapter(chapter);
  } catch (e: any) {
    chapterStore.error = e.message || "生成失败";
  } finally {
    isGenerating.value = false;
  }
}

async function handleConfirmCompletion(payload: { action: string }) {
  try {
    await projectApi.confirmCompletion(props.projectId, { action: payload.action });
    await chapterStore.loadChapters(props.projectId);
  } catch (e: any) {
    chapterStore.error = e.message || "完本操作失败";
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────

onMounted(() => {
  chapterStore.loadChapters(props.projectId);
  fetchBeats();
});
</script>

<style scoped>
.drafting-view {
  padding: var(--space-md) 0;
}

.drafting-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-xl);
}

.drafting-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
}

.drafting-error__retry {
  margin-top: var(--space-sm);
}

.drafting-empty {
  padding: var(--space-lg) 0;
}

.drafting-empty__hint {
  margin-top: var(--space-sm);
  color: var(--color-text-muted);
  font-size: 13px;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chapter-list__stats {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--space-sm);
}

.chapter-list__item {
  transition: box-shadow 0.2s ease;
}

.chapter-list__item:hover {
  box-shadow: var(--shadow-md);
}

.chapter-list__item-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.chapter-list__item-number {
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

.chapter-list__item-title {
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
}

.chapter-list__item-meta {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.chapter-list__item-word-count,
.chapter-list__item-target {
  white-space: nowrap;
}

.chapter-list__item-beat {
  margin-top: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.chapter-list__item-beat-conflict {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-list__item-beat-hooks {
  white-space: nowrap;
}

.chapter-list__item-actions {
  margin-top: var(--space-sm);
  display: flex;
  gap: var(--space-sm);
}
</style>