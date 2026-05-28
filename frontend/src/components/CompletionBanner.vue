<template>
  <div v-if="visible" data-testid="completion-banner" class="completion-banner">
    <div class="completion-banner__content">
      <span
        data-testid="completion-banner-text"
        class="completion-banner__text"
      >
        所有章节已全部完成，可以确认完本了！
      </span>
      <button
        data-testid="confirm-completion-btn"
        class="completion-banner__confirm-btn"
        @click="handleConfirmClick"
      >
        确认完本
      </button>
    </div>

    <div
      v-if="showDialog"
      data-testid="completion-options-dialog"
      class="completion-options-dialog"
    >
      <div
        class="completion-options-dialog__mask"
        @click="handleOption('cancel')"
      />
      <div class="completion-options-dialog__panel">
        <h3>事实簿存在待同步数据</h3>
        <p
          data-testid="completion-queue-depth"
          class="completion-options-dialog__depth"
        >
          队列深度: {{ pendingUpdateCount }}
        </p>
        <div class="completion-options-dialog__options">
          <button
            data-testid="completion-option-sync"
            class="completion-options-dialog__option"
            @click="handleOption('sync-and-complete')"
          >
            立即同步并完本
          </button>
          <button
            data-testid="completion-option-skip"
            class="completion-options-dialog__option"
            @click="handleOption('skip-and-complete')"
          >
            跳过并完本（队列保留）
          </button>
          <button
            data-testid="completion-option-cancel"
            class="completion-options-dialog__option completion-options-dialog__option--cancel"
            @click="handleOption('cancel')"
          >
            取消
          </button>
        </div>
      </div>
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

.completion-banner__confirm-btn {
  padding: 8px 24px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.completion-banner__confirm-btn:hover {
  opacity: 0.85;
}

.completion-options-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.completion-options-dialog__mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
}

.completion-options-dialog__panel {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 24px 32px;
  min-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.completion-options-dialog__depth {
  font-size: 14px;
  color: var(--color-text-secondary, #666);
  margin-bottom: 20px;
}

.completion-options-dialog__options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.completion-options-dialog__option {
  padding: 10px 20px;
  border: 1px solid var(--color-border-light, #ddd);
  border-radius: 6px;
  background-color: #f9f9f9;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.completion-options-dialog__option:hover {
  background-color: #eee;
}

.completion-options-dialog__option--cancel {
  color: #999;
}
</style>
