<script setup lang="ts">
withDefaults(defineProps<{
  sourceContent: string;
  patchContent: string;
  loading?: boolean;
}>(), {
  loading: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <div class="targeted-fix-diff" data-testid="targeted-fix-diff">
    <div class="targeted-fix-diff__panels">
      <div class="targeted-fix-diff__panel">
        <h4 class="targeted-fix-diff__panel-title">原始内容</h4>
        <pre
          data-testid="diff-source"
          class="targeted-fix-diff__content targeted-fix-diff__content--source"
        >{{ sourceContent }}</pre>
      </div>
      <div class="targeted-fix-diff__panel">
        <h4 class="targeted-fix-diff__panel-title">修补内容</h4>
        <pre
          data-testid="diff-patch"
          class="targeted-fix-diff__content targeted-fix-diff__content--patch"
        >{{ patchContent }}</pre>
      </div>
    </div>

    <div class="targeted-fix-diff__actions">
      <button
        data-testid="diff-confirm"
        class="targeted-fix-diff__btn targeted-fix-diff__btn--primary"
        :disabled="loading"
        @click="emit('confirm')"
      >
        确认应用
      </button>
      <button
        data-testid="diff-cancel"
        class="targeted-fix-diff__btn"
        :disabled="loading"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>

.targeted-fix-diff {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.targeted-fix-diff__panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.targeted-fix-diff__panel {
  display: flex;
  flex-direction: column;
}

.targeted-fix-diff__panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
}

.targeted-fix-diff__content {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  min-height: 120px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.targeted-fix-diff__content--source {
  border-left: 3px solid #c0392b;
}

.targeted-fix-diff__content--patch {
  border-left: 3px solid #2d7d2d;
}

.targeted-fix-diff__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.targeted-fix-diff__btn {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  color: var(--color-text-primary);
  transition: background-color 0.2s;
}

.targeted-fix-diff__btn:hover:not(:disabled) {
  background: var(--color-bg);
}

.targeted-fix-diff__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.targeted-fix-diff__btn--primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.targeted-fix-diff__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}
</style>
