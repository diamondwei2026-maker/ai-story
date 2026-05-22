<template>
  <div data-testid="relation-graph" class="relation-graph edit-card">
    <div class="relation-graph__header edit-card__header">
      <h3 data-testid="relation-graph-title" class="edit-card__title">角色关系图</h3>
      <button
        v-if="!editing && hasContent"
        data-testid="edit-relation-btn"
        class="edit-card__edit-btn"
        @click="enterEditMode"
      >
        编辑
      </button>
      <button
        v-if="editing"
        data-testid="save-relation-btn"
        class="edit-card__save-btn"
        @click="save"
      >
        保存
      </button>
    </div>

    <template v-if="!editing">
      <div data-testid="relation-conflicts" class="relation-graph__section">
        <h4 class="edit-card__section-label">冲突关系</h4>
        <p class="edit-card__section-text">{{ conflicts }}</p>
      </div>
      <div data-testid="relation-bonds" class="relation-graph__section">
        <h4 class="edit-card__section-label">情感纽带</h4>
        <p class="edit-card__section-text">{{ bonds }}</p>
      </div>
    </template>

    <template v-else>
      <div data-testid="relation-conflicts" class="relation-graph__section">
        <h4 class="edit-card__section-label">冲突关系</h4>
        <textarea
          v-model="edits.conflicts"
          class="edit-card__section-textarea"
          rows="4"
        />
      </div>
      <div data-testid="relation-bonds" class="relation-graph__section">
        <h4 class="edit-card__section-label">情感纽带</h4>
        <textarea
          v-model="edits.bonds"
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

const props = defineProps<{
  content?: string;
}>();

const editing = ref(false);
const savedEdits = ref<{ conflicts: string; bonds: string }>({ conflicts: '', bonds: '' });

function parseRelationParts(text: string): { conflicts: string; bonds: string } {
  const conflictsMatch = text.match(/冲突关系[：:]\s*([\s\S]*?)(?=情感纽带[：:]|$)/);
  const bondsMatch = text.match(/情感纽带[：:]\s*([\s\S]*?)$/);

  return {
    conflicts: conflictsMatch ? conflictsMatch[1].trim() : text.trim() || '',
    bonds: bondsMatch ? bondsMatch[1].trim() : '',
  };
}

const parsed = computed(() => parseSections(props.content ?? ''));
const relationText = computed(() => parsed.value['角色关系'] ?? '');
const parsedParts = computed(() => parseRelationParts(relationText.value));

const conflicts = computed(() => savedEdits.value.conflicts || parsedParts.value.conflicts || '');
const bonds = computed(() => savedEdits.value.bonds || parsedParts.value.bonds || '');

const hasContent = computed(() => !!relationText.value);

const edits = ref({ conflicts: '', bonds: '' });

function enterEditMode() {
  edits.value = {
    conflicts: conflicts.value,
    bonds: bonds.value,
  };
  editing.value = true;
}

function save() {
  savedEdits.value = { ...edits.value };
  editing.value = false;
}
</script>

<style scoped>
@import url('@/styles/edit-card.css');

.relation-graph__section {
  margin-bottom: 16px;
}
</style>
