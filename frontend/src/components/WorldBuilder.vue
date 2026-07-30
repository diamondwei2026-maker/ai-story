<template>
  <div data-testid="world-builder">
    <a-empty
      v-if="!hasContent"
      data-testid="world-empty"
      description="暂无世界观数据，请先生成设定"
    />

    <div v-if="hasContent" class="world-builder__grid">
      <div
        v-for="dim in dimensions"
        :key="dim.key"
        :data-testid="`dimension-${dim.key}`"
        class="world-builder__card"
      >
        <!-- Card header: title + edit/save/cancel -->
        <div class="world-builder__card-header">
          <span class="world-builder__card-title">{{ dim.label }}</span>
          <button
            v-if="!readonly && editingDim !== dim.key"
            class="world-builder__edit-btn"
            :data-testid="`edit-dim-${dim.key}-btn`"
            @click="startEdit(dim.key)"
          >
            <EditOutlined />
          </button>
          <div v-if="editingDim === dim.key" class="world-builder__edit-actions">
            <button
              class="world-builder__save-btn"
              :data-testid="`save-dim-${dim.key}-btn`"
              @click="saveEdit(dim.key)"
            >
              <CheckOutlined />
            </button>
            <button
              class="world-builder__cancel-btn"
              :data-testid="`cancel-dim-${dim.key}-btn`"
              @click="cancelEdit"
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        <!-- View mode -->
        <template v-if="editingDim !== dim.key">
          <MarkdownRenderer
            v-if="dim.value"
            :content="dim.value"
          />
          <p v-else class="world-builder__card-empty">尚未生成。</p>
        </template>

        <!-- Edit mode -->
        <a-textarea
          v-else
          v-model:value="edits[dim.key]"
          :rows="5"
          class="world-builder__card-textarea"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { parseSections } from '@/utils/contentParser';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

interface Dimension {
  key: string;
  label: string;
  sectionHeader: string;
  value: string;
}

/**
 * 默认维度配置（保持向后兼容：当父组件未传入 dimensions 时使用）
 */
const DEFAULT_DIMENSIONS: Omit<Dimension, 'value'>[] = [
  { key: 'era', label: '时代背景', sectionHeader: '时代背景' },
  { key: 'geography', label: '地理环境', sectionHeader: '地理环境' },
  { key: 'society', label: '社会结构', sectionHeader: '社会结构' },
  { key: 'power', label: '力量体系', sectionHeader: '力量体系' },
];

const props = defineProps<{
  content?: string;
  readonly?: boolean;
  /** 动态维度配置：第4维度根据体裁动态变化，如 阶级体系 / 情感羁绊体系 / 科技体系 */
  dimensions?: Array<{ key: string; label: string; sectionHeader: string }>;
}>();

/** Which dimension key is currently being edited (null = view mode) */
const editingDim = ref<string | null>(null);
const savedEdits = ref<Record<string, string>>({});

watch(() => props.content, () => {
  savedEdits.value = {};
});

const parsed = computed(() => parseSections(props.content ?? ''));

const dimensions = computed<Dimension[]>(() => {
  const base = props.dimensions ?? DEFAULT_DIMENSIONS;
  return base.map((d) => ({
    ...d,
    value: savedEdits.value[d.key] || parsed.value[d.sectionHeader] || '',
  }));
});

const hasContent = computed(() =>
  dimensions.value.some((d) => d.value),
);

const edits = ref<Record<string, string>>({});

function startEdit(key: string) {
  const dim = dimensions.value.find((d) => d.key === key);
  edits.value = {
    ...edits.value,
    [key]: dim?.value ?? '',
  };
  editingDim.value = key;
}

function saveEdit(key: string) {
  if (edits.value[key] !== undefined) {
    savedEdits.value = {
      ...savedEdits.value,
      [key]: edits.value[key],
    };
  }
  editingDim.value = null;
}

function cancelEdit() {
  editingDim.value = null;
}
</script>

<style scoped>
/* ── Grid ─────────────────────────────────────────── */
.world-builder__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* ── Card ─────────────────────────────────────────── */
.world-builder__card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.world-builder__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.world-builder__card-title {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.world-builder__card-empty {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

.world-builder__card-textarea {
  min-height: 100px;
}

/* ── Edit buttons ─────────────────────────────────── */
.world-builder__edit-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
}
.world-builder__edit-btn:hover { color: #4b5563; }

.world-builder__edit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.world-builder__save-btn {
  background: none;
  border: none;
  color: #059669;
  cursor: pointer;
  padding: 2px;
}
.world-builder__save-btn:hover { color: #047857; }

.world-builder__cancel-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
}
.world-builder__cancel-btn:hover { color: #4b5563; }
</style>
