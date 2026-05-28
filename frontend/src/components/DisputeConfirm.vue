<template>
  <div data-testid="dispute-confirm-backdrop">
    <a-modal
      :open="visible"
      title="强制标记 DISPUTED"
      :mask-closable="true"
      :get-container="false"
      @cancel="emit('cancel')"
      centered
      width="480px"
    >
      <div v-if="chapterTitle || originalVerdict" class="dispute-modal__info">
        <template v-if="chapterTitle">{{ chapterTitle }}</template>
        <template v-if="originalVerdict"> · {{ originalVerdict }}</template>
      </div>

      <div data-testid="risk-warning" class="dispute-modal__warning">
        <p>审核结论维持不变。选择强制标记 DISPUTED 将跳过本次审核要求，自行承担合规风险。</p>
        <p>确认后此章节将标记为 DISPUTED，下一章将解锁。此操作不可撤销。</p>
      </div>

      <template #footer>
        <a-button data-testid="dispute-cancel-btn" @click="emit('cancel')">
          取消
        </a-button>
        <a-button
          danger
          type="primary"
          data-testid="dispute-confirm-btn"
          @click="emit('confirm')"
        >
          确认标记 DISPUTED
        </a-button>
      </template>
    </a-modal>
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
  margin-bottom: 8px;
}

.dispute-modal__warning p {
  margin: 0 0 8px 0;
}

.dispute-modal__warning p:last-child {
  margin-bottom: 0;
}
</style>
