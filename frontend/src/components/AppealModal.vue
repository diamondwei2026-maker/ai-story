<template>
  <div data-testid="appeal-modal-backdrop">
    <a-modal
      :open="visible"
      title="审核上诉"
      :mask-closable="true"
      :get-container="false"
      @cancel="emit('cancel')"
      centered
      width="480px"
    >
      <p v-if="originalVerdict || chapterTitle" class="appeal-modal__verdict-info">
        <template v-if="originalVerdict">原始审核结论：<strong>{{ originalVerdict }}</strong></template>
        <template v-if="chapterTitle"> · {{ chapterTitle }}</template>
      </p>

      <a-alert
        data-testid="appeal-once-notice"
        type="warning"
        message="上诉仅一次机会。请详细说明你的异议理由。"
        banner
        class="appeal-modal__notice"
      />

      <a-textarea
        v-model:value="reason"
        data-testid="appeal-reason-input"
        :rows="4"
        placeholder="请描述你认为审核中存在的误判或不合理之处..."
      />

      <template #footer>
        <a-button data-testid="appeal-cancel-btn" @click="emit('cancel')">
          取消
        </a-button>
        <a-button
          type="primary"
          data-testid="appeal-submit-btn"
          :disabled="!reason.trim()"
          @click="handleSubmit"
        >
          提交上诉
        </a-button>
      </template>
    </a-modal>
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
.appeal-modal__verdict-info {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-sm) 0;
}

.appeal-modal__notice {
  margin-bottom: var(--space-sm);
}
</style>
