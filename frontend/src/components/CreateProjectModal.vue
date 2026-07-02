<template>
  <a-modal
    :open="open"
    title="新建项目"
    :width="480"
    centered
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="create-modal">
      <!-- Project Name -->
      <div class="create-modal__field">
        <label class="create-modal__label">
          项目名称
          <span class="create-modal__required">*</span>
        </label>
        <input
          v-model="title"
          type="text"
          placeholder="例如：星际觉醒、长安迷局..."
          class="create-modal__input"
          autofocus
          maxlength="30"
          @keyup.enter="handleCreate"
        />
        <div class="create-modal__char-count">{{ title.length }}/30</div>
      </div>

      <!-- Genre -->
      <div class="create-modal__field">
        <label class="create-modal__label">题材类型（选填）</label>
        <div class="create-modal__chips">
          <button
            v-for="g in GENRE_OPTIONS"
            :key="g"
            type="button"
            class="create-modal__chip"
            :class="{ 'create-modal__chip--active': genre === g }"
            @click="genre = genre === g ? '' : g"
          >
            {{ g }}
          </button>
        </div>
        <input
          v-model="genre"
          type="text"
          placeholder="或手动输入题材..."
          class="create-modal__input create-modal__input--genre"
        />
      </div>

      <!-- Actions -->
      <div class="create-modal__actions">
        <button
          type="button"
          class="create-modal__btn-cancel"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          type="button"
          class="create-modal__btn-create"
          :disabled="!title.trim() || creating"
          @click="handleCreate"
        >
          创建并开始
        </button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const GENRE_OPTIONS = ['科幻', '玄幻', '仙侠', '都市', '古风', '悬疑', '末日', '历史', '军事', '其他'];

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'created': [title: string, genre?: string];
}>();

const title = ref('');
const genre = ref('');
const creating = ref(false);

function handleCancel() {
  title.value = '';
  genre.value = '';
  emit('update:open', false);
}

async function handleCreate() {
  const trimmed = title.value.trim();
  if (!trimmed) return;
  creating.value = true;
  try {
    emit('created', trimmed, genre.value.trim() || undefined);
    title.value = '';
    genre.value = '';
    emit('update:open', false);
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.create-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.create-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.create-modal__label {
  font-size: var(--font-size-body);
  color: #374151;
}

.create-modal__required {
  color: #ef4444;
  margin-left: 2px;
}

.create-modal__input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: var(--font-size-body);
  color: #111827;
  background: #f9fafb;
  outline: none;
  box-sizing: border-box;
}

.create-modal__input:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}

.create-modal__input::placeholder {
  color: #9ca3af;
}

.create-modal__input--genre {
  margin-top: 6px;
}

.create-modal__char-count {
  text-align: right;
  font-size: var(--font-size-caption);
  color: #9ca3af;
  margin-top: 2px;
}

.create-modal__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.create-modal__chip {
  font-size: var(--font-size-caption);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.15s;
}

.create-modal__chip:hover {
  background: #f9fafb;
}

.create-modal__chip--active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.create-modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}

.create-modal__btn-cancel {
  font-size: var(--font-size-body);
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
}

.create-modal__btn-cancel:hover {
  background: #f9fafb;
}

.create-modal__btn-create {
  font-size: var(--font-size-body);
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.create-modal__btn-create:hover:not(:disabled) {
  background: #374151;
}

.create-modal__btn-create:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
