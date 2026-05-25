<template>
  <div class="text-toolbar" data-testid="text-toolbar">
    <button
      v-if="isGenerating && !isPaused"
      data-testid="btn-pause"
      class="toolbar-btn btn-pause"
      @click="$emit('pause')"
    >
      暂停
    </button>

    <button
      v-if="isPaused"
      data-testid="btn-continue"
      class="toolbar-btn btn-continue"
      @click="$emit('continue')"
    >
      继续
    </button>

    <template v-if="showRetryFeedback">
      <input
        data-testid="retry-feedback-input"
        v-model="feedback"
        class="feedback-input"
        placeholder="输入反馈意见（仅本次生效）"
      />
    </template>

    <button
      v-if="!isGenerating"
      data-testid="btn-retry"
      class="toolbar-btn btn-retry"
      @click="$emit('retry', feedback)"
    >
      重试
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isGenerating: boolean;
  isPaused: boolean;
  showRetryFeedback: boolean;
}>();

defineEmits<{
  pause: [];
  continue: [];
  retry: [feedback: string];
}>();

const feedback = ref('');
</script>
