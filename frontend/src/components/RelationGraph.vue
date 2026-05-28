<template>
  <a-card data-testid="relation-graph">
    <template #title>
      <span data-testid="relation-graph-title">角色关系图</span>
    </template>
    <template #extra>
      <a-button
        v-if="!editing && hasContent"
        size="small"
        data-testid="edit-relation-btn"
        @click="enterEditMode"
      >
        编辑
      </a-button>
      <a-button
        v-if="editing"
        size="small"
        type="primary"
        data-testid="save-relation-btn"
        @click="save"
      >
        保存
      </a-button>
    </template>

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
        <a-textarea
          v-model:value="edits.conflicts"
          :rows="4"
        />
      </div>
      <div data-testid="relation-bonds" class="relation-graph__section">
        <h4 class="edit-card__section-label">情感纽带</h4>
        <a-textarea
          v-model:value="edits.bonds"
          :rows="4"
        />
      </div>
    </template>
  </a-card>
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
.relation-graph__section {
  margin-bottom: 16px;
}

.edit-card__section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.edit-card__section-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}
</style>
