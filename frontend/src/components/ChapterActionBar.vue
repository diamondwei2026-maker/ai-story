<template>
  <div class="chapter-action-bar" data-testid="chapter-action-bar">
    <template v-if="!isTerminal">
      <!-- PENDING: generate -->
      <a-button
        v-if="chapterStatus === 'PENDING' && !isGenerating"
        data-testid="btn-generate"
        type="primary"
        @click="$emit('generate')"
      >
        生成正文
      </a-button>

      <!-- Generating: pause -->
      <a-button
        v-if="isGenerating && !isPaused"
        data-testid="btn-pause"
        @click="$emit('pause')"
      >
        暂停
      </a-button>

      <!-- Paused: continue -->
      <a-button
        v-if="isPaused"
        data-testid="btn-continue"
        type="primary"
        @click="$emit('continue')"
      >
        继续
      </a-button>

      <!-- Content exists, no review verdict: submit-review + retry -->
      <template v-if="showRetrySection">
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

        <a-input
          data-testid="retry-feedback-input"
          v-model:value="feedback"
          placeholder="输入反馈意见（仅本次生效）"
        />

        <a-select
          v-model:value="retryMode"
          data-testid="retry-mode-select"
          size="small"
          style="width: 120px"
          :options="modeOptions"
        />

        <a-button
          data-testid="btn-retry"
          @click="$emit('retry', feedback, retryMode)"
        >
          重试
        </a-button>
      </template>

      <!-- Verdict: PASS — confirm -->
      <a-button
        v-if="reviewVerdict === 'PASS'"
        data-testid="btn-confirm"
        type="primary"
        @click="$emit('confirm')"
      >
        确认完成
      </a-button>

      <!-- Verdict: PASS_WITH_SUGGESTIONS -->
      <template v-if="reviewVerdict === 'PASS_WITH_SUGGESTIONS'">
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
      </template>

      <!-- Verdict: NEEDS_REVISION -->
      <template v-if="reviewVerdict === 'NEEDS_REVISION'">
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
        <a-input
          data-testid="retry-feedback-input"
          v-model:value="feedback"
          placeholder="输入反馈意见（仅本次生效）"
        />
        <a-select
          v-model:value="retryMode"
          data-testid="retry-mode-select"
          size="small"
          style="width: 120px"
          :options="modeOptions"
        />
        <a-button
          data-testid="btn-retry"
          @click="$emit('retry', feedback, retryMode)"
        >
          重新生成
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
      </template>

      <!-- Verdict: BLOCKED -->
      <template v-if="reviewVerdict === 'BLOCKED'">
        <a-button
          data-testid="btn-manual-edit"
          @click="$emit('manual-edit')"
        >
          手动修改正文
        </a-button>
        <a-input
          data-testid="retry-feedback-input"
          v-model:value="feedback"
          placeholder="输入反馈意见（仅本次生效）"
        />
        <a-select
          v-model:value="retryMode"
          data-testid="retry-mode-select"
          size="small"
          style="width: 120px"
          :options="modeOptions"
        />
        <a-button
          data-testid="btn-retry"
          @click="$emit('retry', feedback, retryMode)"
        >
          重新生成
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
  { value: 'new-continue', label: '新建续写' },
  { value: 'paragraph-rewrite', label: '段落改写' },
  { value: 'style-upgrade', label: '文笔升级' },
];

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
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
}
</style>
