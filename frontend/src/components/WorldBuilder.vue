<template>
  <div data-testid="world-builder" class="world-builder edit-card">
    <div class="world-builder__header edit-card__header">
      <h3 class="edit-card__title">世界观设定</h3>
      <button
        v-if="!editing"
        data-testid="edit-world-btn"
        class="edit-card__edit-btn"
        @click="enterEditMode"
      >
        编辑
      </button>
      <button
        v-else
        data-testid="save-world-btn"
        class="edit-card__save-btn"
        @click="save"
      >
        保存
      </button>
    </div>

    <template v-if="!editing">
      <div
        v-for="dim in dimensions"
        :key="dim.key"
        :data-testid="`dimension-${dim.key}`"
        class="world-builder__dimension"
      >
        <h4 class="edit-card__section-label">{{ dim.label }}</h4>
        <p class="edit-card__section-text">{{ dim.value }}</p>
      </div>
    </template>

    <template v-else>
      <div
        v-for="dim in dimensions"
        :key="dim.key"
        :data-testid="`dimension-${dim.key}`"
        class="world-builder__dimension"
      >
        <h4 class="edit-card__section-label">{{ dim.label }}</h4>
        <textarea
          v-model="edits[dim.key]"
          class="edit-card__section-textarea"
          rows="4"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { parseSections } from '@/composables/useContentParser';

interface Dimension {
  key: string;
  label: string;
  sectionHeader: string;
  value: string;
}

const DIMENSIONS: Omit<Dimension, 'value'>[] = [
  { key: 'era', label: '时代背景', sectionHeader: '时代背景' },
  { key: 'geography', label: '地理环境', sectionHeader: '地理环境' },
  { key: 'society', label: '社会结构', sectionHeader: '社会结构' },
  { key: 'power', label: '力量体系', sectionHeader: '力量体系' },
];

const props = defineProps<{
  content?: string;
}>();

const editing = ref(false);
const savedEdits = ref<Record<string, string>>({});

const parsed = computed(() => parseSections(props.content ?? ''));

const dimensions = computed<Dimension[]>(() =>
  DIMENSIONS.map((d) => ({
    ...d,
    value: savedEdits.value[d.key] ?? parsed.value[d.sectionHeader] ?? '',
  })),
);

const edits = ref<Record<string, string>>({});

function enterEditMode() {
  const map: Record<string, string> = {};
  dimensions.value.forEach((d) => {
    map[d.key] = d.value;
  });
  edits.value = map;
  editing.value = true;
}

function save() {
  savedEdits.value = { ...edits.value };
  editing.value = false;
}
</script>

<style scoped>
@import url('@/styles/edit-card.css');

.world-builder__dimension {
  margin-bottom: 16px;
}
</style>
