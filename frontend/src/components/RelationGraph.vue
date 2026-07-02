<template>
  <div data-testid="relation-graph">
    <!-- Edit toggle (global) -->
    <div v-if="hasContent && !readonly" class="relation-graph__toolbar">
      <button
        v-if="!editing"
        size="small"
        data-testid="edit-relation-btn"
        class="relation-graph__edit-toggle"
        @click="enterEditMode"
      >
        <EditOutlined /> 编辑
      </button>
      <button
        v-if="editing"
        data-testid="save-relation-btn"
        class="relation-graph__save-toggle"
        @click="save"
      >
        <CheckOutlined /> 保存
      </button>
      <button
        v-if="editing"
        class="relation-graph__cancel-toggle"
        @click="cancelEdit"
      >
        <CloseOutlined /> 取消
      </button>
    </div>

    <a-empty
      v-if="!hasContent"
      data-testid="relation-empty"
      description="暂无关系数据，请先生成设定"
    />

    <template v-if="hasContent && !editing">
      <!-- Conflict relations -->
      <div data-testid="relation-conflicts" class="relation-graph__section">
        <h4 class="relation-graph__section-title relation-graph__section-title--rose">冲突关系</h4>
        <div v-if="conflictItems.length === 0" class="relation-graph__fallback">
          <MarkdownRenderer :content="conflictsRaw" />
        </div>
        <div
          v-for="(item, idx) in conflictItems"
          :key="'conflict-' + idx"
          class="relation-graph__item relation-graph__item--rose"
        >
          <div class="relation-graph__item-header">
            <span class="relation-graph__item-actor">{{ item.from }}</span>
            <span class="relation-graph__item-arrow">→</span>
            <span class="relation-graph__item-actor">{{ item.to }}</span>
            <span class="relation-graph__item-badge relation-graph__item-badge--rose">
              {{ item.type }}
            </span>
          </div>
          <p class="relation-graph__item-desc">{{ item.desc }}</p>
        </div>
      </div>

      <!-- Bond relations -->
      <div data-testid="relation-bonds" class="relation-graph__section">
        <h4 class="relation-graph__section-title relation-graph__section-title--blue">情感纽带</h4>
        <div v-if="bondItems.length === 0" class="relation-graph__fallback">
          <MarkdownRenderer :content="bondsRaw" />
        </div>
        <div
          v-for="(item, idx) in bondItems"
          :key="'bond-' + idx"
          class="relation-graph__item relation-graph__item--blue"
        >
          <div class="relation-graph__item-header">
            <span class="relation-graph__item-actor">{{ item.from }}</span>
            <span class="relation-graph__item-arrow">→</span>
            <span class="relation-graph__item-actor">{{ item.to }}</span>
            <span class="relation-graph__item-badge relation-graph__item-badge--blue">
              {{ item.type }}
            </span>
          </div>
          <p class="relation-graph__item-desc">{{ item.desc }}</p>
        </div>
      </div>
    </template>

    <!-- Edit mode: raw textareas -->
    <template v-if="editing">
      <div data-testid="relation-conflicts" class="relation-graph__section">
        <h4 class="relation-graph__section-title relation-graph__section-title--rose">冲突关系</h4>
        <a-textarea
          v-model:value="edits.conflicts"
          :rows="4"
          placeholder="每行格式：角色A → 角色B | 关系类型：描述"
        />
      </div>
      <div data-testid="relation-bonds" class="relation-graph__section">
        <h4 class="relation-graph__section-title relation-graph__section-title--blue">情感纽带</h4>
        <a-textarea
          v-model:value="edits.bonds"
          :rows="4"
          placeholder="每行格式：角色A → 角色B | 关系类型：描述"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { parseSections } from '@/utils/contentParser';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

interface RelationItem {
  from: string;
  to: string;
  type: string;
  desc: string;
}

const props = defineProps<{
  content?: string;
  readonly?: boolean;
}>();

const editing = ref(false);
const savedEdits = ref<{ conflicts: string; bonds: string }>({ conflicts: '', bonds: '' });

watch(() => props.content, () => {
  savedEdits.value = { conflicts: '', bonds: '' };
});

/**
 * Parse relation text into structured items.
 * Supports two formats:
 *   New:  `- 角色A → 角色B | 关系类型：描述`
 *   Old:  `- 角色A vs 角色B：描述`  (type omitted → "冲突" or "羁绊" default)
 */
function parseRelationItems(text: string, defaultType: string): RelationItem[] {
  const items: RelationItem[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^-\s*/, '').trim();
    if (!trimmed) continue;

    // Try new format: A → B | type：desc
    const newMatch = trimmed.match(/^(.+?)→(.+?)\|\s*(.+?)[：:]\s*(.+)$/);
    if (newMatch) {
      items.push({
        from: newMatch[1].trim(),
        to: newMatch[2].trim(),
        type: newMatch[3].trim(),
        desc: newMatch[4].trim(),
      });
      continue;
    }

    // Try old format: A vs B：desc
    const oldMatch = trimmed.match(/^(.+?)\s*vs\s*(.+?)[：:]\s*(.+)$/);
    if (oldMatch) {
      items.push({
        from: oldMatch[1].trim(),
        to: oldMatch[2].trim(),
        type: defaultType,
        desc: oldMatch[3].trim(),
      });
      continue;
    }

    // Fallback: treat entire line as a raw entry
    const fallbackMatch = trimmed.match(/^(.+?)[：:]\s*(.+)$/);
    if (fallbackMatch) {
      items.push({
        from: fallbackMatch[1].trim(),
        to: '',
        type: defaultType,
        desc: fallbackMatch[2].trim(),
      });
    }
  }
  return items;
}

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

const conflictsRaw = computed(() => savedEdits.value.conflicts || parsedParts.value.conflicts || '');
const bondsRaw = computed(() => savedEdits.value.bonds || parsedParts.value.bonds || '');

const conflictItems = computed(() => parseRelationItems(conflictsRaw.value, '冲突'));
const bondItems = computed(() => parseRelationItems(bondsRaw.value, '羁绊'));

const hasContent = computed(() => !!relationText.value);

const edits = ref({ conflicts: '', bonds: '' });

function enterEditMode() {
  edits.value = {
    conflicts: conflictsRaw.value,
    bonds: bondsRaw.value,
  };
  editing.value = true;
}

function save() {
  savedEdits.value = { ...edits.value };
  editing.value = false;
}

function cancelEdit() {
  editing.value = false;
}
</script>

<style scoped>
/* ── Toolbar ───────────────────────────────────────── */
.relation-graph__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.relation-graph__edit-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
.relation-graph__edit-toggle:hover { background: #f3f4f6; }

.relation-graph__save-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #059669;
  background: none;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
.relation-graph__save-toggle:hover { background: #ecfdf5; }

.relation-graph__cancel-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #9ca3af;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
.relation-graph__cancel-toggle:hover { background: #f3f4f6; }

/* ── Sections ──────────────────────────────────────── */
.relation-graph__section {
  margin-bottom: 24px;
}

.relation-graph__section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
}
.relation-graph__section-title--rose { color: #be123c; }
.relation-graph__section-title--blue { color: #1d4ed8; }

/* ── Items ─────────────────────────────────────────── */
.relation-graph__item {
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 8px;
}
.relation-graph__item--rose { border: 1px solid #fecdd3; }
.relation-graph__item--blue { border: 1px solid #bfdbfe; }

.relation-graph__item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.relation-graph__item-actor {
  font-size: 14px;
  color: #1f2937;
}

.relation-graph__item-arrow {
  color: #9ca3af;
  font-size: 12px;
}

.relation-graph__item-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}
.relation-graph__item-badge--rose { background: #fce4ec; color: #be123c; }
.relation-graph__item-badge--blue { background: #dbeafe; color: #1d4ed8; }

.relation-graph__item-desc {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  margin: 0;
}

/* ── Fallback ──────────────────────────────────────── */
.relation-graph__fallback {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}
</style>
