<template>
  <div class="text-toolbar" data-testid="text-toolbar">
    <a-button
      v-if="isGenerating && !isPaused"
      data-testid="btn-pause"
      @click="$emit('pause')"
    >
      暂停
    </a-button>

    <a-button
      v-if="isPaused"
      type="primary"
      data-testid="btn-continue"
      @click="$emit('continue')"
    >
      继续
    </a-button>

    <a-button
      v-if="showGenerate && !isGenerating"
      type="primary"
      data-testid="btn-generate"
      @click="$emit('generate')"
    >
      生成正文
    </a-button>

    <template v-if="showRetryFeedback">
      <a-input
        data-testid="retry-feedback-input"
        v-model:value="feedback"
        placeholder="输入反馈意见（仅本次生效）"
      />
    </template>

    <a-button
      v-if="!isGenerating && !showGenerate"
      data-testid="btn-retry"
      @click="$emit('retry', feedback)"
    >
      重试
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isGenerating: boolean;
  isPaused: boolean;
  showRetryFeedback: boolean;
  showGenerate?: boolean;
}>();

defineEmits<{
  pause: [];
  continue: [];
  retry: [feedback: string];
  generate: [];
}>();

const feedback = ref('');
</script>
