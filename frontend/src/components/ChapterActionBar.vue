<template>
  <div class="chapter-action-bar" data-testid="chapter-action-bar">
    <template v-if="!isTerminal">
      <!-- PENDING: generate -->
      <div v-if="chapterStatus === 'PENDING' && !isGenerating" class="chapter-action-bar__row">
        <a-button
          data-testid="btn-generate"
          type="primary"
          @click="$emit('generate')"
        >
          生成正文
        </a-button>
      </div>

      <!-- Generating: pause -->
      <div v-if="isGenerating && !isPaused" class="chapter-action-bar__row">
        <a-button
          data-testid="btn-pause"
          @click="$emit('pause')"
        >
          暂停
        </a-button>
      </div>

      <!-- Paused: continue -->
      <div v-if="isPaused" class="chapter-action-bar__row">
        <a-button
          data-testid="btn-continue"
          type="primary"
          @click="$emit('continue')"
        >
          继续
        </a-button>
      </div>

      <!-- ====== Content exists, no review verdict: submit-review + retry ====== -->
      <template v-if="showRetrySection">
        <!-- Row 1: Primary actions -->
        <div class="chapter-action-bar__row">
          <a-button
            v-if="chapterStatus === 'PENDING_REVIEW'"
            data-testid="btn-save-content"
            @click="$emit('save-content')"
          >
            保存修改
          </a-button>
          <a-button
            data-testid="btn-submit-review"
            type="primary"
            @click="$emit('submit-review')"
          >
            提交审核
          </a-button>
        </div>

        <!-- Retry section -->
        <div class="chapter-action-bar__retry-section">
          <!-- Row 2: Feedback input (full width) -->
          <div class="chapter-action-bar__row">
            <a-input
              data-testid="retry-feedback-input"
              v-model:value="feedback"
              placeholder="输入反馈意见（仅本次生效）"
              class="chapter-action-bar__feedback-input"
            />
          </div>

          <!-- Row 3: Mode selector + tip + retry button -->
          <div class="chapter-action-bar__row">
            <a-select
              v-model:value="retryMode"
              data-testid="retry-mode-select"
              size="small"
              style="width: 200px"
              :options="modeOptions"
            />
            <span data-testid="retry-mode-hint" class="chapter-action-bar__mode-hint">
              {{ currentModeDescription }}
            </span>
            <a-button
              data-testid="btn-retry"
              @click="$emit('retry', feedback, retryMode)"
            >
              重试
            </a-button>
          </div>
        </div>
      </template>

      <!-- ====== Verdict: PASS — confirm ====== -->
      <div v-if="reviewVerdict === 'PASS'" class="chapter-action-bar__row">
        <a-button
          data-testid="btn-confirm"
          type="primary"
          @click="$emit('confirm')"
        >
          确认完成
        </a-button>
      </div>

      <!-- ====== Verdict: PASS_WITH_SUGGESTIONS ====== -->
      <template v-if="reviewVerdict === 'PASS_WITH_SUGGESTIONS'">
        <div class="chapter-action-bar__row">
          <a-button
            data-testid="btn-adopt-suggestions"
            type="primary"
            @click="$emit('adopt-suggestions')"
          >
            采纳建议并重新审核
          </a-button>
          <a-button
            data-testid="btn-ignore-and-confirm"
            @click="$emit('ignore-and-confirm')"
          >
            忽略并确认
          </a-button>
        </div>
      </template>

      <!-- ====== Verdict: NEEDS_REVISION ====== -->
      <template v-if="reviewVerdict === 'NEEDS_REVISION'">
        <!-- Row 1: Primary verdict actions -->
        <div class="chapter-action-bar__row">
          <a-button
            data-testid="btn-adopt-and-re-review"
            type="primary"
            @click="$emit('adopt-and-re-review')"
          >
            采纳修改并重新审核
          </a-button>
          <a-button
            data-testid="btn-manual-edit"
            @click="$emit('manual-edit')"
          >
            手动修改正文
          </a-button>
          <a-button
            v-if="appealCount < 1"
            data-testid="btn-appeal"
            @click="$emit('appeal')"
          >
            上诉
          </a-button>
          <a-button
            v-else
            data-testid="btn-force-dispute"
            type="primary"
            danger
            @click="$emit('force-dispute')"
          >
            强制标记争议
          </a-button>
        </div>

        <!-- Retry section -->
        <div class="chapter-action-bar__retry-section">
          <div class="chapter-action-bar__row">
            <a-input
              data-testid="retry-feedback-input"
              v-model:value="feedback"
              placeholder="输入反馈意见，重新生成（可选）"
              class="chapter-action-bar__feedback-input"
            />
          </div>
          <div class="chapter-action-bar__row">
            <a-select
              v-model:value="retryMode"
              data-testid="retry-mode-select"
              size="small"
              style="width: 200px"
              :options="modeOptions"
            />
            <a-button
              data-testid="btn-retry"
              @click="$emit('retry', feedback, retryMode)"
            >
              重新生成
            </a-button>
          </div>
        </div>
      </template>

      <!-- ====== Verdict: BLOCKED ====== -->
      <template v-if="reviewVerdict === 'BLOCKED'">
        <!-- Row 1: Primary action -->
        <div class="chapter-action-bar__row">
          <a-button
            data-testid="btn-manual-edit"
            @click="$emit('manual-edit')"
          >
            手动修改正文
          </a-button>
          <a-button
            v-if="appealCount < 1"
            data-testid="btn-appeal"
            @click="$emit('appeal')"
          >
            上诉
          </a-button>
          <a-button
            v-else
            data-testid="btn-force-dispute"
            type="primary"
            danger
            @click="$emit('force-dispute')"
          >
            强制标记争议
          </a-button>
        </div>

        <!-- Retry section -->
        <div class="chapter-action-bar__retry-section">
          <div class="chapter-action-bar__row">
            <a-input
              data-testid="retry-feedback-input"
              v-model:value="feedback"
              placeholder="输入反馈意见，重新生成（可选）"
              class="chapter-action-bar__feedback-input"
            />
          </div>
          <div class="chapter-action-bar__row">
            <a-select
              v-model:value="retryMode"
              data-testid="retry-mode-select"
              size="small"
              style="width: 200px"
              :options="modeOptions"
            />
            <a-button
              data-testid="btn-retry"
              @click="$emit('retry', feedback, retryMode)"
            >
              重新生成
            </a-button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ReviewVerdict } from '@/types';

const props = defineProps<{
  chapterStatus: 'PENDING' | 'DRAFT' | 'PENDING_REVIEW' | 'REVIEWING' | 'COMPLETED' | 'DISPUTED';
  reviewVerdict: ReviewVerdict | null;
  appealCount: number;
  isGenerating: boolean;
  isPaused: boolean;
  hasContent: boolean;
}>();

defineEmits<{
  generate: [];
  pause: [];
  continue: [];
  retry: [feedback: string, mode: string];
  confirm: [];
  'submit-review': [];
  'save-content': [];
  'adopt-suggestions': [];
  'ignore-and-confirm': [];
  'adopt-and-re-review': [];
  'manual-edit': [];
  appeal: [];
  'force-dispute': [];
}>();

const feedback = ref('');
const retryMode = ref('new-continue');

const modeOptions = [
  { value: 'new-continue', label: '新建续写（从头撰写完整章节）' },
  { value: 'paragraph-rewrite', label: '段落改写（调整结构节奏）' },
  { value: 'style-upgrade', label: '文笔升级（提升文字品质）' },
];

const modeDescriptions: Record<string, string> = {
  'new-continue': '全新撰写：忽略现有正文，根据节拍计划独立创作整章',
  'paragraph-rewrite': '段落改写：保留剧情骨架，重新组织段落结构和叙事节奏',
  'style-upgrade': '文笔升级：保持剧情和结构不变，仅提升场景描写和文字品质',
};

const currentModeDescription = computed(() => modeDescriptions[retryMode.value] ?? '');

const TERMINAL_STATUSES = new Set(['COMPLETED', 'DISPUTED']);

const isTerminal = computed(() => TERMINAL_STATUSES.has(props.chapterStatus));

const showRetrySection = computed(() => {
  if (props.isGenerating) return false;
  if (props.isPaused) return false;
  return props.hasContent && !props.reviewVerdict;
});
</script>

<style scoped>
.chapter-action-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
}

.chapter-action-bar__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

/* Retry section — visually separated from primary actions */
.chapter-action-bar__retry-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

/* feedback input takes available width */
.chapter-action-bar__feedback-input {
  flex: 1;
  min-width: 240px;
}

.chapter-action-bar__mode-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}
</style>
