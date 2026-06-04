<template>
  <div data-testid="drafting-view" class="drafting-view">
    <h2 data-testid="drafting-title" class="section-title">正文迭代</h2>

    <!-- Loading -->
    <div v-if="loading" data-testid="drafting-loading" class="drafting-loading">
      <a-spin tip="加载章节列表..." />
    </div>

    <!-- Error -->
    <div v-else-if="error" data-testid="drafting-error" class="drafting-error">
      <a-alert type="error" :message="error" show-icon />
      <a-button class="drafting-error__retry" @click="fetchChapters">重试</a-button>
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

    <!-- Chapter list -->
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
            :color="statusTagColor(chapter.status)"
          >
            {{ statusLabel(chapter.status) }}
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

        <div class="chapter-list__item-actions">
          <a-button
            v-if="showGenerateButton(chapter)"
            data-testid="generate-chapter-btn"
            type="primary"
            size="small"
            :disabled="!canGenerate(chapter)"
            @click="handleGenerate(chapter)"
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
import type { Chapter } from "@/stores/useChapterStore";
import CompletionBanner from "@/components/CompletionBanner.vue";

// ─── Constants ──────────────────────────────────────────────────────

const CHAPTER_STATUS_LABEL: Record<string, string> = {
  PENDING: "待生成",
  DRAFT: "生成中",
  REVIEWING: "审核中",
  COMPLETED: "已完成",
  DISPUTED: "已标记争议",
};

const CHAPTER_STATUS_COLOR: Record<string, string> = {
  PENDING: "default",
  DRAFT: "processing",
  REVIEWING: "orange",
  COMPLETED: "green",
  DISPUTED: "red",
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "DISPUTED"]);
const ACTIVE_STATUSES = new Set(["DRAFT", "REVIEWING"]);

// ─── Props ──────────────────────────────────────────────────────────

const props = defineProps<{
  projectId: string;
}>();

// ─── State ──────────────────────────────────────────────────────────

const chapters = ref<Chapter[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// ─── Derived ────────────────────────────────────────────────────────

const sortedChapters = computed(() =>
  [...chapters.value].sort((a, b) => a.chapterNumber - b.chapterNumber)
);

const totalWordCount = computed(() =>
  sortedChapters.value.reduce((sum, ch) => sum + wordCount(ch.content), 0)
);

const allChaptersCompleted = computed(() => {
  const list = sortedChapters.value;
  return list.length > 0 && list.every((ch) => TERMINAL_STATUSES.has(ch.status));
});

// ─── Helpers ────────────────────────────────────────────────────────

/** 统计中文字数（CJK 逐字 + ASCII 逐词，剔除空白） */
function wordCount(content: string | null): number {
  if (!content) return 0;
  return content.replace(/\s/g, "").length;
}

function statusLabel(status: string): string {
  return CHAPTER_STATUS_LABEL[status] ?? status;
}

function statusTagColor(status: string): string {
  return CHAPTER_STATUS_COLOR[status] ?? "default";
}

function showGenerateButton(chapter: Chapter): boolean {
  return !TERMINAL_STATUSES.has(chapter.status);
}

function canGenerate(chapter: Chapter): boolean {
  if (ACTIVE_STATUSES.has(chapter.status)) return false;

  // First chapter is always available
  if (chapter.chapterNumber === 1) return true;

  // Sequential lock: previous chapter must be in terminal state
  const idx = sortedChapters.value.findIndex((c) => c.id === chapter.id);
  if (idx <= 0) return false;

  return TERMINAL_STATUSES.has(sortedChapters.value[idx - 1].status);
}

// ─── Actions ────────────────────────────────────────────────────────

async function fetchChapters() {
  loading.value = true;
  error.value = null;
  try {
    chapters.value = await chapterApi.getChapters(props.projectId);
  } catch (e: any) {
    error.value = e.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

async function handleGenerate(chapter: Chapter) {
  try {
    await chapterApi.generateChapter(props.projectId, chapter.id, {
      mode: "new-continue",
    });
    await fetchChapters();
  } catch (e: any) {
    error.value = e.message || "生成失败";
  }
}

async function handleConfirmCompletion(payload: { action: string }) {
  try {
    await projectApi.confirmCompletion(props.projectId, { action: payload.action });
    await fetchChapters();
  } catch (e: any) {
    error.value = e.message || "完本操作失败";
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────

onMounted(() => {
  fetchChapters();
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

.chapter-list__item-actions {
  margin-top: var(--space-sm);
  display: flex;
  gap: var(--space-sm);
}
</style>