<template>
  <div
    v-if="visible"
    data-testid="appeal-modal-backdrop"
    class="appeal-modal-overlay"
    @click.self="emit('cancel')"
    @keydown.escape="emit('cancel')"
  >
    <div class="appeal-modal">
      <h3 class="appeal-modal__title">审核上诉</h3>

      <p v-if="originalVerdict || chapterTitle" class="appeal-modal__verdict-info">
        <template v-if="originalVerdict">原始审核结论：<strong>{{ originalVerdict }}</strong></template>
        <template v-if="chapterTitle"> · {{ chapterTitle }}</template>
      </p>

      <div data-testid="appeal-once-notice" class="appeal-modal__notice">
        上诉仅一次机会。请详细说明你的异议理由。
      </div>

      <textarea
        v-model="reason"
        data-testid="appeal-reason-input"
        class="appeal-modal__input"
        rows="4"
        placeholder="请描述你认为审核中存在的误判或不合理之处..."
      />

      <div class="appeal-modal__actions">
        <button
          data-testid="appeal-cancel-btn"
          class="appeal-modal__cancel-btn"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          data-testid="appeal-submit-btn"
          class="appeal-modal__submit-btn"
          :disabled="!reason.trim()"
          @click="handleSubmit"
        >
          提交上诉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  chapterTitle?: string;
  originalVerdict?: string;
}>();

const emit = defineEmits<{
  submit: [reason: string];
  cancel: [];
}>();

const reason = ref('');

watch(
  () => props.visible,
  (newVisible) => {
    if (!newVisible) {
      reason.value = '';
    }
  },
);

function handleSubmit() {
  if (!reason.value.trim()) return;
  emit('submit', reason.value.trim());
  reason.value = '';
}
</script>

<style scoped>

.appeal-modal-overlay {
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

.appeal-modal {
  background: #fff;
  border-radius: 8px;
  padding: 28px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.appeal-modal__title {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.appeal-modal__verdict-info {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
}

.appeal-modal__notice {
  font-size: 12px;
  color: #b8860b;
  margin-bottom: 12px;
  padding: 6px 10px;
  background: #fff9f0;
  border-radius: 4px;
  border-left: 3px solid #b8860b;
}

.appeal-modal__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
}

.appeal-modal__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.appeal-modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.appeal-modal__cancel-btn,
.appeal-modal__submit-btn {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-primary);
}

.appeal-modal__submit-btn {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.appeal-modal__submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.appeal-modal__submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}
</style>
