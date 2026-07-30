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
        <label class="create-modal__label">
          题材类型（选填，可多选）
          <span class="create-modal__hint">— 第一个标签为主标签，决定世界观文化背景</span>
        </label>
        <div class="create-modal__chips">
          <button
            v-for="g in GENRE_OPTIONS"
            :key="g"
            type="button"
            class="create-modal__chip"
            :class="{ 'create-modal__chip--active': genres.includes(g) }"
            @click="toggleGenre(g)"
          >
            {{ g }}
          </button>
        </div>
        <div class="create-modal__genre-input-row">
          <input
            v-model="customGenre"
            type="text"
            placeholder="输入自定义标签后按回车添加..."
            class="create-modal__input"
            @keyup.enter="addCustomGenre"
          />
        </div>
        <!-- 已选标签预览 -->
        <div v-if="genres.length > 0" class="create-modal__selected-tags">
          <span
            v-for="(g, i) in genres"
            :key="g"
            class="create-modal__selected-tag"
            :class="{ 'create-modal__selected-tag--primary': i === 0 }"
          >
            {{ g }}
            <button class="create-modal__tag-remove" @click="removeGenre(g)">×</button>
            <span v-if="i === 0" class="create-modal__primary-badge">主</span>
          </span>
        </div>
      </div>

      <!-- Skip Idea Stage -->
      <!-- Figma(ProjectCenter.tsx:371-401) -->
      <div class="create-modal__skip-section">
        <label class="create-modal__skip-check">
          <input
            v-model="skipIdea"
            type="checkbox"
            class="create-modal__checkbox"
          />
          <span>
            <span class="create-modal__skip-title">我已有灵感与简介，跳过灵感提取阶段</span>
            <span class="create-modal__skip-hint">创建后将直接进入设定集，灵感提取会标记为已完成。</span>
          </span>
        </label>

        <div v-if="skipIdea" class="create-modal__skip-desc">
          <label class="create-modal__label">
            故事简介
            <span class="create-modal__required">*</span>
          </label>
          <textarea
            v-model="description"
            placeholder="粘贴你已有的故事简介，AI 将基于它继续设定集创作..."
            class="create-modal__textarea"
            rows="4"
            maxlength="1000"
          />
          <div class="create-modal__char-count">{{ description.length }}/1000</div>
        </div>
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
          :disabled="!title.trim() || (skipIdea && !description.trim()) || creating"
          @click="handleCreate"
        >
          {{ skipIdea ? '创建并进入设定集' : '创建并开始' }}
        </button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const GENRE_OPTIONS = [
  '科幻', '玄幻', '仙侠', '都市', '古风', '历史', '悬疑',
  '末日', '军事', '武侠', '蒸汽朋克', '群像', '种田', '基建',
  '美食', '医疗', '商战', '电竞', '娱乐圈', '其他',
];

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'created': [input: { title: string; genre?: string; skipIdea: boolean; description?: string }];
}>();

const title = ref('');
const genres = ref<string[]>([]);
const customGenre = ref('');
const skipIdea = ref(false);
const description = ref('');
const creating = ref(false);

function toggleGenre(g: string) {
  const idx = genres.value.indexOf(g);
  if (idx >= 0) {
    genres.value.splice(idx, 1);
  } else {
    genres.value.push(g);
  }
}

function removeGenre(g: string) {
  const idx = genres.value.indexOf(g);
  if (idx >= 0) genres.value.splice(idx, 1);
}

function addCustomGenre() {
  const tag = customGenre.value.trim();
  if (tag && !genres.value.includes(tag)) {
    genres.value.push(tag);
  }
  customGenre.value = '';
}

function handleCancel() {
  title.value = '';
  genres.value = [];
  customGenre.value = '';
  skipIdea.value = false;
  description.value = '';
  emit('update:open', false);
}

async function handleCreate() {
  const trimmed = title.value.trim();
  if (!trimmed || (skipIdea.value && !description.value.trim())) return;
  creating.value = true;
  try {
    emit('created', {
      title: trimmed,
      genre: genres.value.length > 0 ? genres.value.join(',') : undefined,
      skipIdea: skipIdea.value,
      description: skipIdea.value ? description.value.trim() : undefined,
    });
    title.value = '';
    genres.value = [];
    customGenre.value = '';
    skipIdea.value = false;
    description.value = '';
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

.create-modal__hint {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 400;
  margin-left: 4px;
}

.create-modal__genre-input-row {
  margin-top: 6px;
}

/* ── Selected tags preview ──────────────────────────────── */
.create-modal__selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.create-modal__selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.create-modal__selected-tag--primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.create-modal__tag-remove {
  background: none;
  border: none;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.6;
}

.create-modal__tag-remove:hover {
  opacity: 1;
}

.create-modal__primary-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255,255,255,0.25);
  color: inherit;
  font-weight: 600;
  letter-spacing: 0.05em;
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

/* ── Skip Idea Stage ─────────────────────────────────────────── */
/* Figma(ProjectCenter.tsx:371-401) */
.create-modal__skip-section {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 14px;
}

.create-modal__skip-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.create-modal__checkbox {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  accent-color: #111827;
  flex-shrink: 0;
}

.create-modal__skip-title {
  display: block;
  font-size: var(--font-size-body);
  color: #1f2937;
}

.create-modal__skip-hint {
  display: block;
  margin-top: 4px;
  font-size: var(--font-size-caption);
  line-height: 1.5;
  color: #6b7280;
}

.create-modal__skip-desc {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.create-modal__textarea {
  width: 100%;
  min-height: 104px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 12px;
  font-size: var(--font-size-body);
  line-height: 1.5;
  color: #374151;
  outline: none;
  box-sizing: border-box;
}

.create-modal__textarea:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}

.create-modal__textarea::placeholder {
  color: #9ca3af;
}
</style>
