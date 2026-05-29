<template>
  <div data-testid="dispute-confirm-backdrop">
    <a-modal
      :open="visible"
      title="强制标记争议"
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

      <a-alert
        data-testid="risk-warning"
        type="error"
        message="合规风险警告"
        description="审核结论维持不变。选择强制标记 DISPUTED 将跳过本次审核要求，自行承担合规风险。确认后此章节将标记为 DISPUTED，下一章将解锁。此操作不可撤销。"
        banner
        class="dispute-modal__warning"
      />

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
          确认标记争议
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
  margin-bottom: var(--space-md);
}

.dispute-modal__warning {
  margin-bottom: var(--space-sm);
}
</style>
