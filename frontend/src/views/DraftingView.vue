<template>
  <div data-testid="drafting-view" class="drafting-view">
    <!-- Loading -->
    <div v-if="chapterStore.loading" data-testid="drafting-loading" class="drafting-loading">
      <LoadingOutlined spin class="drafting-content__loading-icon" />
      <span>加载章节列表...</span>
    </div>

    <!-- Error -->
    <div v-else-if="chapterStore.error" data-testid="drafting-error" class="drafting-error">
      <a-alert type="error" :message="chapterStore.error" show-icon />
      <a-button class="drafting-error__retry" @click="chapterStore.loadChapters(projectId)">重试</a-button>
    </div>

    <!-- Empty state -->
    <div v-else-if="sortedChapters.length === 0" data-testid="drafting-empty-state" class="drafting-empty">
      <FileTextOutlined class="drafting-empty__icon" />
      <p class="drafting-empty__text">暂无章节，请先在 BEATS 阶段生成细纲</p>
      <p class="drafting-empty__hint">完成细纲拆解后，章节将在此处展示并可逐章生成正文。</p>
    </div>

    <!-- Three-panel layout -->
    <div v-else class="drafting-layout">
      <!-- Left: Chapter List Sidebar -->
      <aside class="chapter-sidebar">
        <div class="chapter-sidebar__header">
          <span class="chapter-sidebar__title">章节列表</span>
          <span class="chapter-sidebar__progress">{{ completedCount }}/{{ sortedChapters.length }} 完成</span>
        </div>
        <div class="chapter-sidebar__progress-bar">
          <div
            class="chapter-sidebar__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </div>

        <div class="chapter-sidebar__list">
          <button
            v-for="chapter in sortedChapters"
            :key="chapter.id"
            data-testid="chapter-list-item"
            class="chapter-sidebar__item"
            :class="{ 'chapter-sidebar__item--active': selectedChapterId === chapter.id }"
            @click="selectChapter(chapter)"
          >
            <span
              class="chapter-sidebar__item-number"
              :class="{ 'chapter-sidebar__item-number--done': chapter.status === 'COMPLETED' }"
            >
              <CheckOutlined v-if="chapter.status === 'COMPLETED'" />
              <template v-else>{{ chapter.chapterNumber }}</template>
            </span>
            <div class="chapter-sidebar__item-info">
              <span class="chapter-sidebar__item-name" data-testid="chapter-title">
                {{ chapter.title || `第${chapter.chapterNumber}章` }}
              </span>
              <div class="chapter-sidebar__item-meta">
                <span
                  data-testid="chapter-status-badge"
                  class="chapter-sidebar__item-status"
                  :class="sidebarStatusClass(chapter.status)"
                >{{ chapterStatusLabel(chapter.status) }}</span>
                <span v-if="wordCount(chapter.content) > 0" class="chapter-sidebar__item-words">
                  {{ wordCount(chapter.content) }}字
                </span>
              </div>
            </div>
          </button>
        </div>

        <!-- Completion Button -->
        <div v-if="allChaptersCompleted" class="chapter-sidebar__complete">
          <button
            data-testid="completion-btn"
            class="chapter-sidebar__done-btn"
            @click="handleConfirmCompletion({ action: 'direct-complete' })"
          >
            <CheckOutlined />
            完本
          </button>
        </div>
      </aside>

      <!-- Right: Editor / Review Content -->
      <div class="drafting-content">
        <!-- No chapter selected -->
        <div v-if="!selectedChapter" class="drafting-content__empty">
          <FileTextOutlined class="drafting-content__empty-icon" />
          <p>从左侧选择章节开始创作</p>
        </div>

        <template v-else>
          <!-- Editor Header Toolbar -->
          <div class="editor-toolbar">
            <div class="editor-toolbar__left">
              <button class="editor-toolbar__back-btn" @click="closeWorkspace">
                <ArrowLeftOutlined />
              </button>
              <span class="editor-toolbar__title">{{ selectedChapter.title || `第${selectedChapter.chapterNumber}章` }}</span>
              <span
                data-testid="workspace-status-badge"
                class="sidebar-chapter-status"
                :class="sidebarStatusClass(selectedChapter.status)"
              >{{ chapterStatusLabel(selectedChapter.status) }}</span>
            </div>

            <div class="editor-toolbar__right">
              <span v-if="wordCount(selectedChapter.content) > 0" class="editor-toolbar__word-count">
                {{ wordCount(selectedChapter.content) }} 字
              </span>

              <!-- Regenerate dropdown for content-ready chapters -->
              <div v-if="(selectedChapter.status === 'PENDING_REVIEW' || selectedChapter.status === 'DRAFT') && !isGenerating" class="editor-toolbar__dropdown">
                <button class="editor-toolbar__btn" @click="showRegenMenu = !showRegenMenu">
                  <ReloadOutlined />
                  重新生成
                  <DownOutlined />
                </button>
                <div v-if="showRegenMenu" class="editor-toolbar__dropdown-menu">
                  <button
                    v-for="mode in regenModes"
                    :key="mode.value"
                    class="editor-toolbar__dropdown-item"
                    @click="handleRetry(selectedChapter.id, '', mode.value); showRegenMenu = false"
                  >
                    <span>{{ mode.label }}</span>
                    <span class="editor-toolbar__dropdown-desc">{{ mode.desc }}</span>
                  </button>
                </div>
              </div>

              <!-- Submit Review -->
              <button
                v-if="selectedChapter.status === 'PENDING_REVIEW' || selectedChapter.status === 'DRAFT'"
                class="editor-toolbar__btn editor-toolbar__btn--review"
                @click="handleSubmitReview(selectedChapter.id)"
              >
                <SafetyOutlined />
                提交审核
              </button>

              <!-- View Review -->
              <button
                v-if="selectedChapter.status === 'REVIEWING'"
                class="editor-toolbar__btn editor-toolbar__btn--review-outline"
                @click="showReviewPanel = true"
              >
                <SafetyOutlined />
                查看审核结果
              </button>
            </div>
          </div>

          <!-- Generating/Reviewing Loading -->
          <div v-if="isGenerating || isReviewing" class="drafting-content__loading">
            <LoadingOutlined spin class="drafting-content__loading-icon" />
            <span>{{ isGenerating ? 'AI 正在生成章节正文...' : 'AI 正在进行内容安全审核...' }}</span>
          </div>

          <!-- Review Panel -->
          <div v-if="showReviewPanel && selectedChapter.reviewResult" class="drafting-content__review">
            <ReviewPanel
              :review-result="selectedChapter.reviewResult as any"
              :chapter-status="selectedChapter.status"
              @back="showReviewPanel = false"
              @confirm="handleConfirm(selectedChapter.id)"
              @dispute="handleDispute(selectedChapter.id)"
              @appeal="handleAppeal(selectedChapter.id, $event)"
            />
          </div>

          <!-- Editor / Empty state -->
          <div v-else-if="!showReviewPanel" class="drafting-content__editor">
            <div v-if="selectedChapter.status === 'PENDING'" class="drafting-content__empty-chapter">
              <FileTextOutlined class="drafting-content__empty-icon" />
              <p>本章正文尚未生成</p>
              <button
                data-testid="generate-chapter-btn"
                class="drafting-content__generate-btn"
                :disabled="isGenerating"
                @click="handleGenerate(selectedChapter)"
              >
                <ThunderboltOutlined />
                生成正文
              </button>
            </div>

            <textarea
              v-else
              class="drafting-content__textarea"
              :value="selectedChapter.content || ''"
              @input="handleContentChange(selectedChapter.id, ($event.target as HTMLTextAreaElement).value)"
              placeholder="章节内容..."
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  CheckOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  DownOutlined,
  SafetyOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import * as chapterApi from "@/api/chapter";
import * as projectApi from "@/api/project";
import * as beatsApi from "@/api/beats";
import { request } from "@/api/common";
import type { BeatDataResponse } from "@/api/beats";
import type { Chapter } from "@/stores/useChapterStore";
import { useChapterStore } from "@/stores/useChapterStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import ReviewPanel from "@/components/ReviewPanel.vue";
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
const workflowStore = useWorkflowStore();

// ─── Local state ────────────────────────────────────────────────────

const beats = ref<BeatDataResponse[]>([]);
const selectedChapterId = ref<string | null>(null);
const isGenerating = ref(false);
const isPaused = ref(false);
const showRegenMenu = ref(false);
const showReviewPanel = ref(false);
const isReviewing = ref(false);

const regenModes = [
  { value: 'new-continue', label: '新建续写', desc: '忽略现有正文，独立创作整章' },
  { value: 'paragraph-rewrite', label: '段落改写', desc: '保留剧情骨架，重新组织结构' },
  { value: 'style-upgrade', label: '文笔升级', desc: '仅提升场景描写和文字品质' },
];

// ─── Derived ────────────────────────────────────────────────────────

const sortedChapters = computed(() =>
  [...chapterStore.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
);

const selectedChapter = computed(() => {
  if (!selectedChapterId.value) return null;
  return chapterStore.chapters.find((c) => c.id === selectedChapterId.value) ?? null;
});

const completedCount = computed(() =>
  sortedChapters.value.filter((ch) => TERMINAL_CHAPTER_STATUSES.has(ch.status)).length
);

const progressPercent = computed(() =>
  sortedChapters.value.length > 0
    ? Math.round((completedCount.value / sortedChapters.value.length) * 100)
    : 0
);

const allChaptersCompleted = computed(() => {
  const list = sortedChapters.value;
  return list.length > 0 && list.every((ch) => TERMINAL_CHAPTER_STATUSES.has(ch.status));
});

// ─── Helpers ────────────────────────────────────────────────────────

function wordCount(content: string | null): number {
  if (!content) return 0;
  return content.replace(/\s/g, "").length;
}

const SIDEBAR_STATUS_CLASS: Record<string, string> = {
  PENDING: 'status--pending',
  DRAFT: 'status--draft',
  PENDING_REVIEW: 'status--reviewing',
  REVIEWING: 'status--review',
  COMPLETED: 'status--completed',
  DISPUTED: 'status--disputed',
};

function sidebarStatusClass(status: string): string {
  return SIDEBAR_STATUS_CLASS[status] ?? 'status--pending';
}

// ─── Chapter selection ──────────────────────────────────────────────

function selectChapter(chapter: Chapter) {
  selectedChapterId.value = chapter.id;
  showReviewPanel.value = false;
  showRegenMenu.value = false;
}

function closeWorkspace() {
  selectedChapterId.value = null;
  isPaused.value = false;
  showReviewPanel.value = false;
  showRegenMenu.value = false;
}

// ─── Handlers ───────────────────────────────────────────────────────

function handleContentChange(chapterId: string, content: string) {
  chapterStore.replaceChapterContent(chapterId, content);
}

async function handleRetry(chapterId: string, feedback: string, mode: string) {
  try {
    isGenerating.value = true;
    await chapterApi.retryChapter(props.projectId, chapterId, {
      mode: mode || 'new-continue',
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

async function handleAppeal(chapterId: string, reason: string) {
  try {
    // TODO: 后端上诉 API 就绪后替换为 chapterApi.appealChapter(projectId, chapterId, { reason })
    await request(`/projects/${props.projectId}/chapters/${chapterId}/appeal`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await chapterStore.loadChapters(props.projectId);
    showReviewPanel.value = false;
  } catch (e: any) {
    chapterStore.error = e.message || "上诉提交失败";
  }
}

async function handleSubmitReview(chapterId: string) {
  isReviewing.value = true;
  try {
    await chapterApi.reviewChapter(props.projectId, chapterId);
    await chapterStore.loadChapters(props.projectId);
    // Don't auto-show review panel — let user click "查看审核结果" (Figma two-step flow)
  } catch (e: any) {
    chapterStore.error = e.message || "提交审核失败";
  } finally {
    isReviewing.value = false;
  }
}

async function handleGenerate(chapter: Chapter) {
  isGenerating.value = true;
  try {
    await chapterApi.generateChapter(props.projectId, chapter.id, {
      mode: "new-continue",
    });
    await chapterStore.loadChapters(props.projectId);
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

async function fetchBeats() {
  try {
    beats.value = await beatsApi.getBeats(props.projectId);
  } catch {
    // silently ignore
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────

onMounted(() => {
  for (const phase of ['IDEA', 'SETTING', 'OUTLINE', 'BEATS'] as const) {
    if (workflowStore.getStepStatus(phase) !== 'CONFIRMED') {
      workflowStore.setStepStatus(phase, 'CONFIRMED');
    }
  }
  if (workflowStore.getStepStatus('DRAFTING') !== 'CONFIRMED') {
    workflowStore.setStepStatus('DRAFTING', 'IN_PROGRESS');
  }

  chapterStore.loadChapters(props.projectId);
  fetchBeats();
});
</script>

<style scoped>
/* ── View ──────────────────────────────────────────── */
.drafting-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drafting-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  color: #2563eb;
  font-size: var(--font-size-body);
}

.drafting-error { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; }
.drafting-error__retry { margin-top: 8px; }

.drafting-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  color: #9ca3af;
}
.drafting-empty__icon { font-size: 32px; opacity: 0.3; margin-bottom: 12px; }
.drafting-empty__text { font-size: var(--font-size-body); margin: 0; }
.drafting-empty__hint { font-size: var(--font-size-body); color: #9ca3af; margin: 4px 0 0; }

/* ── Layout ───────────────────────────────────────────── */
.drafting-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Left Sidebar ────────────────────────────────────── */
.chapter-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.chapter-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.chapter-sidebar__title { font-size: var(--font-size-body); color: #374151; }
.chapter-sidebar__progress { font-size: var(--font-size-caption); color: #9ca3af; }

.chapter-sidebar__progress-bar {
  height: 6px;
  background: #e5e7eb;
}
.chapter-sidebar__progress-fill {
  height: 6px;
  background: #10b981;
  transition: width 0.3s;
}

.chapter-sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.chapter-sidebar__item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.chapter-sidebar__item:hover { background: #f9fafb; }
.chapter-sidebar__item--active { background: #f9fafb; }

.chapter-sidebar__item-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #4b5563;
  font-size: var(--font-size-caption);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.chapter-sidebar__item-number--done {
  background: #d1fae5;
  color: #059669;
}

.chapter-sidebar__item-info {
  flex: 1;
  min-width: 0;
}
.chapter-sidebar__item-name {
  font-size: var(--font-size-body);
  color: #1f2937;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chapter-sidebar__item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

/* ── Sidebar Status Colors ──────────────────────────── */
.status--pending { background: #f3f4f6; color: #6b7280; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }
.status--draft { background: #fef3c7; color: #92400e; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }
.status--review { background: #ede9fe; color: #6d28d9; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }
.status--reviewing { background: #dbeafe; color: #2563eb; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }
.status--completed { background: #d1fae5; color: #059669; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }
.status--disputed { background: #fce7f3; color: #be185d; font-size: var(--font-size-caption); padding: 1px 6px; border-radius: 4px; }

.chapter-sidebar__item-words {
  font-size: var(--font-size-caption);
  color: #9ca3af;
}
.sidebar-chapter-status { display: inline-block; }

.chapter-sidebar__complete {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
}

.chapter-sidebar__done-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 10px 0;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
}
.chapter-sidebar__done-btn:hover { background: #374151; }

/* ── Right Content Area ─────────────────────────────── */
.drafting-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.drafting-content__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
.drafting-content__empty-icon { font-size: 32px; opacity: 0.3; margin-bottom: 8px; }

/* ── Editor Toolbar ──────────────────────────────────── */
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 20px;
}

.editor-toolbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.editor-toolbar__back-btn {
  display: flex;
  align-items: center;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.editor-toolbar__back-btn:hover { color: #4b5563; }
.editor-toolbar__title { font-size: var(--font-size-body); color: #374151; }

.editor-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.editor-toolbar__word-count { font-size: var(--font-size-caption); color: #9ca3af; }

.editor-toolbar__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: background 0.15s;
}
.editor-toolbar__btn:hover { background: #f9fafb; }

.editor-toolbar__btn--review {
  background: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}
.editor-toolbar__btn--review:hover { background: #6d28d9; }

.editor-toolbar__btn--review-outline {
  background: #ede9fe;
  color: #6d28d9;
  border-color: #ddd6fe;
}

.editor-toolbar__dropdown { position: relative; }
.editor-toolbar__dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 10;
  width: 224px;
  overflow: hidden;
}
.editor-toolbar__dropdown-item {
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-body);
  color: #1f2937;
}
.editor-toolbar__dropdown-item:last-child { border-bottom: none; }
.editor-toolbar__dropdown-item:hover { background: #f9fafb; }
.editor-toolbar__dropdown-desc { font-size: var(--font-size-caption); color: #9ca3af; }

/* ── Loading Banner ──────────────────────────────────── */
.drafting-content__loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  color: #2563eb;
  font-size: var(--font-size-body);
}
.drafting-content__loading-icon { font-size: 16px; }

/* ── Review Panel Area ──────────────────────────────── */
.drafting-content__review {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 20px;
}

/* ── Editor Area ────────────────────────────────────── */
.drafting-content__editor { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.drafting-content__empty-chapter {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #9ca3af;
}
.drafting-content__generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
}
.drafting-content__generate-btn:hover:not(:disabled) { background: #374151; }
.drafting-content__generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.drafting-content__textarea {
  flex: 1;
  width: 100%;
  padding: 24px;
  font-size: var(--font-size-body);
  color: #1f2937;
  line-height: 2;
  resize: none;
  outline: none;
  border: none;
  background: #fff;
}
</style>