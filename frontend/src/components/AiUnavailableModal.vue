<template>
  <ErrorModal
    :visible="visible"
    :message="message"
    :retry-label="retryLabel"
    test-id="ai-unavailable-modal"
    @retry="emit('retry')"
    @close="emit('close')"
  />
</template>

<script setup lang="ts">
import ErrorModal from './ErrorModal.vue';

withDefaults(defineProps<{
  visible: boolean;
  message?: string;
  retryLabel?: string;
}>(), {
  message: 'AI 服务暂时不可用，请稍后重试',
  retryLabel: '手动重试',
});

const emit = defineEmits<{
  retry: [];
  close: [];
}>();
</script>
