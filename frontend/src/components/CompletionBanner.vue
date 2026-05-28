<template>
  <div v-if="visible" data-testid="completion-banner" class="completion-banner">
    <div class="completion-banner__content">
      <span
        data-testid="completion-banner-text"
        class="completion-banner__text"
      >
        所有章节已全部完成，可以确认完本了！
      </span>
      <a-button
        type="primary"
        data-testid="confirm-completion-btn"
        @click="handleConfirmClick"
      >
        确认完本
      </a-button>
    </div>

    <div data-testid="completion-options-dialog">
      <a-modal
        :open="showDialog"
        title="事实簿存在待同步数据"
        :mask-closable="true"
        :get-container="false"
        @cancel="handleOption('cancel')"
        centered
        width="400px"
      >
        <p
          data-testid="completion-queue-depth"
          class="completion-options-dialog__depth"
        >
          队列深度: {{ pendingUpdateCount }}
        </p>
        <template #footer>
          <div class="completion-options-dialog__options">
            <a-button
              data-testid="completion-option-sync"
              type="primary"
              block
              @click="handleOption('sync-and-complete')"
              style="margin-bottom: 8px"
            >
              立即同步并完本
            </a-button>
            <a-button
              data-testid="completion-option-skip"
              block
              @click="handleOption('skip-and-complete')"
              style="margin-bottom: 8px"
            >
              跳过并完本（队列保留）
            </a-button>
            <a-button
              data-testid="completion-option-cancel"
              block
              @click="handleOption('cancel')"
            >
              取消
            </a-button>
          </div>
        </template>
      </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  visible: boolean;
  pendingUpdateCount?: number;
}>();

const emit = defineEmits<{
  "confirm-completion": [payload: { action: string }];
}>();

const showDialog = ref(false);

function handleConfirmClick() {
  if ((props.pendingUpdateCount ?? 0) > 0) {
    showDialog.value = true;
  } else {
    emit("confirm-completion", { action: "direct-complete" });
  }
}

function handleOption(action: string) {
  showDialog.value = false;
  if (action !== "cancel") {
    emit("confirm-completion", { action });
  }
}
</script>

<style scoped>
.completion-banner {
  padding: 12px 20px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-accent-light), #fde68a);
  border: 2px solid var(--color-accent);
}

.completion-banner__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.completion-banner__text {
  font-size: 15px;
  font-weight: 700;
  color: #92400e;
}

.completion-options-dialog__depth {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.completion-options-dialog__options {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
