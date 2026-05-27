<template>
  <div
    v-if="visible"
    :data-testid="testId"
    class="error-modal-overlay"
    @close="emit('close')"
    @click.self="emit('close')"
    @keydown.escape="emit('close')"
  >
    <div class="error-modal">
      <div class="error-modal__icon">&#9888;</div>
      <h3 class="error-modal__title">AI 服务异常</h3>
      <p class="error-modal__message">{{ message }}</p>
      <div class="error-modal__actions">
        <button
          data-testid="retry-button"
          class="error-modal__retry-btn"
          @click="emit('retry')"
        >
          {{ retryLabel }}
        </button>
      </div>
    </div>
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

<style scoped>

.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-modal {
  background: #fff;
  border-radius: 8px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.error-modal__icon {
  font-size: 48px;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.error-modal__title {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.error-modal__message {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.error-modal__retry-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border: none;
  padding: 8px 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.error-modal__retry-btn:hover {
  opacity: 0.9;
}
</style>
