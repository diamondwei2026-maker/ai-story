<template>
  <div :data-testid="testId">
    <a-modal
      :open="visible"
      title="AI 服务异常"
      :footer="null"
      :mask-closable="true"
      :get-container="false"
      @cancel="emit('close')"
      centered
      width="420px"
    >
      <div style="text-align: center; padding: 16px 0;">
        <p style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 20px;">
          {{ message }}
        </p>
        <a-button
          type="primary"
          data-testid="retry-button"
          @click="emit('retry')"
          block
        >
          {{ retryLabel }}
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean;
  message?: string;
  retryLabel?: string;
  testId?: string;
}>(), {
  message: 'AI 服务暂时不可用，请稍后重试',
  retryLabel: '手动重试',
  testId: 'error-modal',
});

const emit = defineEmits<{
  retry: [];
  close: [];
}>();
</script>
