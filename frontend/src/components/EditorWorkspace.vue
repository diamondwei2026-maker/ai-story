<template>
  <div data-testid="editor-workspace" class="editor-workspace">
    <!-- Header -->
    <div class="editor-workspace__header">
      <a-button
        data-testid="close-workspace-btn"
        type="text"
        class="editor-workspace__back"
        @click="emit('close')"
      >
        ← 返回章节列表
      </a-button>
      <div class="editor-workspace__header-info">
        <span data-testid="workspace-title" class="editor-workspace__title">
          {{ chapterTitle || '未命名章节' }}
        </span>
        <a-tag
          data-testid="workspace-status-badge"
          :color="chapterStatusColor(chapterStatus)"
        >
          {{ chapterStatusLabel(chapterStatus) }}
        </a-tag>
        <span class="editor-workspace__word-count">
          目标字数：{{ targetWordCount }}
        </span>
      </div>
    </div>

    <!-- Mode Switcher (hidden for terminal chapters) -->
    <div v-if="!isTerminal" class="editor-workspace__mode">
      <ModeSwitcher
        :mode="generationMode"
        :disabled="isGenerating"
        @update:mode="(val: string) => emit('mode-change', val)"
      />
    </div>

    <!-- Streaming Editor -->
    <StreamingEditor
      :content="chapterContent"
      :is-streaming="isGenerating"
      :is-editable="isEditable"
      @update:content="(val: string) => emit('content-change', val)"
    />

    <!-- Chapter Action Bar (unified) -->
    <div class="editor-workspace__action-bar">
      <ChapterActionBar
        :chapter-status="chapterStatus"
        :review-verdict="reviewResult?.verdict ?? null"
        :appeal-count="reviewResult?.appealCount ?? 0"
        :is-generating="isGenerating"
        :is-paused="isPaused"
        :has-content="!!chapterContent"
        @generate="emit('generate')"
        @pause="emit('pause')"
        @continue="emit('continue')"
        @retry="(feedback: string) => emit('retry', feedback)"
        @confirm="emit('confirm')"
        @submit-review="emit('submit-review')"
        @adopt-suggestions="emit('adopt-suggestions')"
        @ignore-and-confirm="emit('confirm')"
        @adopt-and-re-review="emit('adopt-and-re-review')"
        @manual-edit="emit('manual-edit')"
        @appeal="openAppealModal"
        @force-dispute="openDisputeModal"
      />
    </div>

    <!-- Review Panel (display only — actions handled by ChapterActionBar) -->
    <div v-if="reviewResult && chapterStatus !== 'PENDING' && chapterStatus !== 'DRAFT'" class="editor-workspace__review">
      <ReviewPanel
        :review-result="reviewResult"
        :chapter-status="chapterStatus"
      />
    </div>

    <!-- Appeal Modal -->
    <AppealModal
      :visible="showAppealModal"
      :chapter-title="chapterTitle"
      :original-verdict="reviewResult?.verdict"
      @submit="handleAppealSubmit"
      @cancel="showAppealModal = false"
    />

    <!-- Dispute Confirm Modal -->
    <DisputeConfirm
      :visible="showDisputeModal"
      :chapter-title="chapterTitle"
      :original-verdict="reviewResult?.verdict"
      @confirm="handleDisputeConfirm"
      @cancel="showDisputeModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ReviewResult } from '@/types';
import {
  TERMINAL_CHAPTER_STATUSES,
  chapterStatusLabel,
  chapterStatusColor,
} from '@/types';
import ModeSwitcher from '@/components/ModeSwitcher.vue';
import StreamingEditor from '@/components/StreamingEditor.vue';
import ChapterActionBar from '@/components/ChapterActionBar.vue';
import ReviewPanel from '@/components/ReviewPanel.vue';
import AppealModal from '@/components/AppealModal.vue';
import DisputeConfirm from '@/components/DisputeConfirm.vue';

const props = defineProps<{
  chapterId: string;
  chapterTitle: string;
  chapterContent: string;
  chapterStatus: 'PENDING' | 'DRAFT' | 'REVIEWING' | 'COMPLETED' | 'DISPUTED';
  targetWordCount: number;
  generationMode: string;
  isGenerating: boolean;
  isPaused: boolean;
  reviewResult: ReviewResult | null;
}>();

const emit = defineEmits<{
  (e: 'mode-change', value: string): void;
  (e: 'content-change', value: string): void;
  (e: 'pause'): void;
  (e: 'continue'): void;
  (e: 'retry', feedback: string): void;
  (e: 'generate'): void;
  (e: 'submit-review'): void;
  (e: 'close'): void;
  (e: 'adopt-suggestions'): void;
  (e: 'confirm'): void;
  (e: 'adopt-and-re-review'): void;
  (e: 'manual-edit'): void;
  (e: 'appeal', reason: string): void;
  (e: 'dispute'): void;
}>();

const showAppealModal = ref(false);
const showDisputeModal = ref(false);

const isTerminal = computed(() => TERMINAL_CHAPTER_STATUSES.has(props.chapterStatus));

const isEditable = computed(() => {
  return !props.isGenerating && !isTerminal.value;
});

function openAppealModal() {
  showAppealModal.value = true;
}

function openDisputeModal() {
  showDisputeModal.value = true;
}

function handleAppealSubmit(reason: string) {
  showAppealModal.value = false;
  emit('appeal', reason);
}

function handleDisputeConfirm() {
  showDisputeModal.value = false;
  emit('dispute');
}
</script>

<style scoped>
.editor-workspace {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
}

.editor-workspace__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.editor-workspace__back {
  flex-shrink: 0;
}

.editor-workspace__header-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.editor-workspace__title {
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.editor-workspace__word-count {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.editor-workspace__mode {
  display: flex;
  justify-content: center;
}

.editor-workspace__toolbar {
  display: flex;
  justify-content: center;
  padding: var(--space-sm) 0;
}

.editor-workspace__review {
  margin-top: var(--space-sm);
}
</style>
