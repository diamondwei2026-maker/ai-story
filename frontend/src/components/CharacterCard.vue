<template>
  <a-card data-testid="character-card">
    <template #title>
      <span data-testid="character-card-title">角色卡</span>
    </template>
    <template #extra>
      <a-button
        v-if="!editing && hasCharacters"
        size="small"
        data-testid="edit-character-btn"
        @click="enterEditMode"
      >
        编辑
      </a-button>
      <a-button
        v-if="editing"
        size="small"
        type="primary"
        data-testid="save-character-btn"
        @click="save"
      >
        保存
      </a-button>
    </template>

    <a-empty v-if="!hasCharacters && !editing" data-testid="char-empty" description="暂无角色数据，请先生成设定" />

    <template v-if="hasCharacters">
      <div
        v-for="char in characters"
        :key="char.role"
        :data-testid="`char-${char.role}`"
        class="character-card__char"
      >
        <div class="character-card__char-header">
          <a-avatar
            :size="48"
            :style="{ backgroundColor: avatarColor(char.role), flexShrink: 0 }"
            class="serif-accent"
          >
            {{ char.name ? char.name.charAt(0) : char.label.charAt(0) }}
          </a-avatar>
          <div>
            <a-tag data-testid="char-role-label" :color="roleColor(char.role)">
              {{ char.label }}
            </a-tag>
            <span v-if="char.name" class="character-card__char-name">{{ char.name }}</span>
          </div>
        </div>

        <template v-if="!editing">
          <a-descriptions :column="1" size="small" bordered class="character-card__arcs">
            <a-descriptions-item label="欲望">
              {{ char.desire || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="动机">
              {{ char.motivation || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="结局">
              {{ char.ending || '—' }}
            </a-descriptions-item>
          </a-descriptions>
        </template>

        <template v-else>
          <div class="character-card__edit-arcs">
            <div class="character-card__arc">
              <span class="character-card__arc-label">欲望</span>
              <a-textarea
                v-model:value="edits[char.role].desire"
                :rows="2"
              />
            </div>
            <div class="character-card__arc">
              <span class="character-card__arc-label">动机</span>
              <a-textarea
                v-model:value="edits[char.role].motivation"
                :rows="2"
              />
            </div>
            <div class="character-card__arc">
              <span class="character-card__arc-label">结局</span>
              <a-textarea
                v-model:value="edits[char.role].ending"
                :rows="2"
              />
            </div>
          </div>
        </template>
      </div>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { parseSections } from '@/composables/useContentParser';

interface CharacterData {
  name: string;
  desire: string;
  motivation: string;
  ending: string;
}

interface CharacterEntry extends CharacterData {
  role: string;
  label: string;
}

const ROLE_CONFIGS: { role: string; label: string; sectionHeader: string }[] = [
  { role: 'protagonist', label: '主角', sectionHeader: '主角' },
  { role: 'villain', label: '反派', sectionHeader: '反派' },
  { role: 'supporting', label: '重要配角', sectionHeader: '重要配角' },
];

const ROLE_COLORS: Record<string, string> = {
  protagonist: '#0d9488',
  villain: '#e11d48',
  supporting: '#6366f1',
};

const TAG_COLORS: Record<string, string> = {
  protagonist: 'teal',
  villain: 'red',
  supporting: 'purple',
};

const props = defineProps<{
  content?: string;
}>();

const editing = ref(false);
const savedEdits = ref<Record<string, CharacterData>>({});

watch(() => props.content, () => {
  savedEdits.value = {};
});

function parseCharacterData(text: string): CharacterData {
  const extract = (key: string): string => {
    const match = text.match(new RegExp(`^${key}[：:]\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : '';
  };

  return {
    name: extract('名称'),
    desire: extract('欲望'),
    motivation: extract('动机'),
    ending: extract('结局'),
  };
}

function avatarColor(role: string): string {
  return ROLE_COLORS[role] ?? '#64748b';
}

function roleColor(role: string): string {
  return TAG_COLORS[role] ?? 'default';
}

const parsed = computed(() => parseSections(props.content ?? ''));

const characters = computed<CharacterEntry[]>(() =>
  ROLE_CONFIGS.map((rc) => {
    const sectionText = parsed.value[rc.sectionHeader] ?? '';
    const parsedData = parseCharacterData(sectionText);
    const editsData = savedEdits.value[rc.role];
    return {
      role: rc.role,
      label: rc.label,
      name: editsData?.name || parsedData.name,
      desire: editsData?.desire || parsedData.desire,
      motivation: editsData?.motivation || parsedData.motivation,
      ending: editsData?.ending || parsedData.ending,
    };
  }),
);

const hasCharacters = computed(() =>
  characters.value.some((c) => c.name || c.desire || c.motivation || c.ending),
);

interface EditEntry extends CharacterData {
  [key: string]: string;
}

const edits = ref<Record<string, EditEntry>>({});

function enterEditMode() {
  const map: Record<string, EditEntry> = {};
  for (const c of characters.value) {
    map[c.role] = {
      name: c.name,
      desire: c.desire,
      motivation: c.motivation,
      ending: c.ending,
    };
  }
  edits.value = map;
  editing.value = true;
}

function save() {
  savedEdits.value = { ...edits.value };
  editing.value = false;
}
</script>

<style scoped>
.character-card__char {
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  background: var(--color-surface-warm);
}

.character-card__char-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.character-card__char-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 4px;
}

.character-card__arcs {
  margin-top: var(--space-sm);
}

.character-card__edit-arcs {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.character-card__arc {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.character-card__arc-label {
  font-size: 12px;
  color: var(--color-primary);
  min-width: 60px;
  flex-shrink: 0;
  padding-top: 6px;
  font-weight: 500;
}
</style>
