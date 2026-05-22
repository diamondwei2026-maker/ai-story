<template>
  <div data-testid="character-card" class="character-card edit-card">
    <div class="character-card__header edit-card__header">
      <h3 data-testid="character-card-title" class="edit-card__title">角色卡</h3>
      <button
        v-if="!editing && hasCharacters"
        data-testid="edit-character-btn"
        class="edit-card__edit-btn"
        @click="enterEditMode"
      >
        编辑
      </button>
      <button
        v-if="editing"
        data-testid="save-character-btn"
        class="edit-card__save-btn"
        @click="save"
      >
        保存
      </button>
    </div>

    <div v-if="!hasCharacters && !editing" data-testid="char-empty" class="character-card__empty">
      暂无角色数据，请先生成设定
    </div>

    <template v-if="hasCharacters">
      <div
        v-for="char in characters"
        :key="char.role"
        :data-testid="`char-${char.role}`"
        class="character-card__char"
      >
        <div class="character-card__char-header">
          <span data-testid="char-role-label" class="character-card__role-label">{{ char.label }}</span>
          <span v-if="char.name" class="character-card__char-name">{{ char.name }}</span>
        </div>

        <template v-if="!editing">
          <div class="character-card__arcs">
            <div data-testid="arc-desire" class="character-card__arc">
              <span class="character-card__arc-label">欲望</span>
              <p class="character-card__arc-text">{{ char.desire || '—' }}</p>
            </div>
            <div data-testid="arc-motivation" class="character-card__arc">
              <span class="character-card__arc-label">动机</span>
              <p class="character-card__arc-text">{{ char.motivation || '—' }}</p>
            </div>
            <div data-testid="arc-ending" class="character-card__arc">
              <span class="character-card__arc-label">结局</span>
              <p class="character-card__arc-text">{{ char.ending || '—' }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="character-card__arcs">
            <div class="character-card__arc">
              <span class="character-card__arc-label">欲望</span>
              <textarea
                v-model="edits[char.role].desire"
                class="character-card__arc-textarea"
                rows="2"
              />
            </div>
            <div class="character-card__arc">
              <span class="character-card__arc-label">动机</span>
              <textarea
                v-model="edits[char.role].motivation"
                class="character-card__arc-textarea"
                rows="2"
              />
            </div>
            <div class="character-card__arc">
              <span class="character-card__arc-label">结局</span>
              <textarea
                v-model="edits[char.role].ending"
                class="character-card__arc-textarea"
                rows="2"
              />
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

const props = defineProps<{
  content?: string;
}>();

const editing = ref(false);
const savedEdits = ref<Record<string, CharacterData>>({});

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

const parsed = computed(() => parseSections(props.content ?? ''));

const characters = computed<CharacterEntry[]>(() =>
  ROLE_CONFIGS.map((rc) => {
    const sectionText = parsed.value[rc.sectionHeader] ?? '';
    const parsedData = parseCharacterData(sectionText);
    const editsData = savedEdits.value[rc.role];
    return {
      role: rc.role,
      label: rc.label,
      name: editsData?.name ?? parsedData.name,
      desire: editsData?.desire ?? parsedData.desire,
      motivation: editsData?.motivation ?? parsedData.motivation,
      ending: editsData?.ending ?? parsedData.ending,
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
@import url('@/styles/edit-card.css');

.character-card__empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.character-card__char {
  padding: 12px;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  margin-bottom: 12px;
}

.character-card__char-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.character-card__role-label {
  font-size: 13px;
  color: #fff;
  background: var(--color-gold);
  padding: 2px 10px;
  border-radius: 3px;
}

.character-card__char-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.character-card__arcs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-card__arc {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.character-card__arc-label {
  font-size: 12px;
  color: var(--color-gold);
  min-width: 32px;
  flex-shrink: 0;
  padding-top: 2px;
}

.character-card__arc-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.character-card__arc-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  color: var(--color-text-secondary);
  flex: 1;
}
</style>
