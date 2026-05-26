<template>
  <div
    v-if="visible"
    data-testid="dispute-confirm-backdrop"
    class="dispute-modal-overlay"
    @click.self="emit('cancel')"
    @keydown.escape="emit('cancel')"
  >
    <div class="dispute-modal">
      <h3 class="dispute-modal__title">强制标记 DISPUTED</h3>

      <div v-if="chapterTitle || originalVerdict" class="dispute-modal__info">
        <template v-if="chapterTitle">{{ chapterTitle }}</template>
        <template v-if="originalVerdict"> · {{ originalVerdict }}</template>
      </div>

      <div data-testid="risk-warning" class="dispute-modal__warning">
        <p>审核结论维持不变。选择强制标记 DISPUTED 将跳过本次审核要求，自行承担合规风险。</p>
        <p>确认后此章节将标记为 DISPUTED，下一章将解锁。此操作不可撤销。</p>
      </div>

      <div class="dispute-modal__actions">
        <button
          data-testid="dispute-cancel-btn"
          class="dispute-modal__cancel-btn"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          data-testid="dispute-confirm-btn"
          class="dispute-modal__confirm-btn btn-danger"
          @click="emit('confirm')"
        >
          确认标记 DISPUTED
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  chapterTitle?: string;
  originalVerdict?: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.dispute-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.dispute-modal {
  background: #fff;
  border-radius: 8px;
  padding: 28px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dispute-modal__title {
  font-size: 18px;
  color: #a71d2a;
  margin: 0 0 12px 0;
}

.dispute-modal__info {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.dispute-modal__warning {
  font-size: 13px;
  line-height: 1.7;
  color: #a71d2a;
  padding: 12px 14px;
  background: #fef5f5;
  border-radius: 6px;
  border-left: 4px solid #a71d2a;
  margin-bottom: 20px;
}

.dispute-modal__warning p {
  margin: 0 0 8px 0;
}

.dispute-modal__warning p:last-child {
  margin-bottom: 0;
}

.dispute-modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dispute-modal__cancel-btn {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-primary);
}

.dispute-modal__confirm-btn {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  color: #fff;
}

.btn-danger,
.dispute-modal__confirm-btn.btn-danger {
  background: #a71d2a;
  border: 1px solid #8e1924;
}

.dispute-modal__confirm-btn.btn-danger:hover {
  background: #8e1924;
}
</style>
