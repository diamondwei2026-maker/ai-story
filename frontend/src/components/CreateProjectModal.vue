<template>
  <a-modal
    :open="open"
    title="创建新项目"
    :width="440"
    centered
    :confirm-loading="creating"
    @ok="handleCreate"
    @cancel="$emit('update:open', false)"
  >
    <a-input
      v-model:value="title"
      placeholder="请输入小说名称..."
      size="large"
      autofocus
      @pressEnter="handleCreate"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'created': [title: string];
}>();

const title = ref('');
const creating = ref(false);

async function handleCreate() {
  const trimmed = title.value.trim();
  if (!trimmed) return;
  creating.value = true;
  try {
    emit('created', trimmed);
    title.value = '';
    emit('update:open', false);
  } finally {
    creating.value = false;
  }
}
</script>
