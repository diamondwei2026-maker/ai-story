<template>
  <div data-testid="character-card">
    <a-empty
      v-if="!hasCharacters && !editingRole"
      data-testid="char-empty"
      description="暂无角色数据，请先生成设定"
    />

    <div
      v-for="char in visibleCharacters"
      :key="char.role"
      :data-testid="`char-${char.role}`"
      class="character-card__item"
    >
      <!-- Header: avatar + name + role badge + age + edit -->
      <div class="character-card__header">
        <div class="character-card__avatar-col">
          <div
            class="character-card__avatar"
            :style="{ backgroundColor: avatarColor(char.role) }"
          >
            {{ char.name ? char.name.charAt(0) : char.label.charAt(0) }}
          </div>
          <div>
            <div class="character-card__name-row">
              <span class="character-card__name">{{ char.name || char.label }}</span>
              <span
                data-testid="char-role-label"
                class="character-card__role-badge"
                :class="roleBadgeClass(char.role)"
              >
                {{ char.label }}
              </span>
            </div>
            <span class="character-card__age">{{ char.age || '—' }}</span>
          </div>
        </div>
        <!-- Edit / Save+Cancel buttons per character -->
        <button
          v-if="!readonly && editingRole !== char.role"
          class="character-card__edit-btn"
          :data-testid="`edit-char-${char.role}-btn`"
          @click="startEdit(char.role)"
        >
          <EditOutlined />
        </button>
        <div v-if="editingRole === char.role" class="character-card__edit-actions">
          <button
            class="character-card__save-btn"
            :data-testid="`save-char-${char.role}-btn`"
            @click="saveEdit(char.role)"
          >
            <CheckOutlined />
          </button>
          <button
            class="character-card__cancel-btn"
            :data-testid="`cancel-char-${char.role}-btn`"
            @click="cancelEdit"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      <!-- View mode: 3-column grid -->
      <div v-if="editingRole !== char.role" class="character-card__arcs-grid">
        <div
          v-for="arc in arcFields"
          :key="arc.key"
          class="character-card__arc-card"
        >
          <span class="character-card__arc-card-label">{{ arc.label }}</span>
          <p class="character-card__arc-card-text">{{ char[arc.key] || '—' }}</p>
        </div>
      </div>

      <!-- Edit mode: full form -->
      <div v-else class="character-card__edit-form">
        <div class="character-card__edit-row">
          <label class="character-card__edit-label">名称</label>
          <a-input
            v-model:value="edits[char.role].name"
            data-testid="char-edit-name"
          />
        </div>
        <div class="character-card__edit-row">
          <label class="character-card__edit-label">年龄</label>
          <a-input
            v-model:value="edits[char.role].age"
            data-testid="char-edit-age"
          />
        </div>
        <div class="character-card__edit-row">
          <label class="character-card__edit-label">欲望</label>
          <a-textarea
            v-model:value="edits[char.role].desire"
            :rows="2"
          />
        </div>
        <div class="character-card__edit-row">
          <label class="character-card__edit-label">动机</label>
          <a-textarea
            v-model:value="edits[char.role].motivation"
            :rows="2"
          />
        </div>
        <div class="character-card__edit-row">
          <label class="character-card__edit-label">结局</label>
          <a-textarea
            v-model:value="edits[char.role].ending"
            :rows="2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { parseSections } from '@/utils/contentParser';

interface CharacterData {
  name: string;
  age: string;
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
  { role: 'female_lead', label: '女主', sectionHeader: '女主' },
  { role: 'supporting', label: '重要配角', sectionHeader: '重要配角' },
];

/** Avatar background colors — match Figma role palette */
const ROLE_COLORS: Record<string, string> = {
  protagonist: '#8b5cf6',
  villain: '#e11d48',
  female_lead: '#ec4899',
  supporting: '#f59e0b',
};

/** CSS badge class per role */
const ROLE_BADGE_CLASSES: Record<string, string> = {
  protagonist: 'character-card__badge--violet',
  villain: 'character-card__badge--red',
  female_lead: 'character-card__badge--pink',
  supporting: 'character-card__badge--amber',
};

const arcFields = [
  { key: 'desire' as const, label: '欲望' },
  { key: 'motivation' as const, label: '动机' },
  { key: 'ending' as const, label: '结局' },
];

const props = defineProps<{
  content?: string;
  readonly?: boolean;
}>();

/** Which character role is currently being edited (null = view mode) */
const editingRole = ref<string | null>(null);
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
    age: extract('年龄'),
    desire: extract('欲望'),
    motivation: extract('动机'),
    ending: extract('结局'),
  };
}

function avatarColor(role: string): string {
  return ROLE_COLORS[role] ?? '#64748b';
}

function roleBadgeClass(role: string): string {
  return ROLE_BADGE_CLASSES[role] ?? '';
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
      age: editsData?.age || parsedData.age,
      desire: editsData?.desire || parsedData.desire,
      motivation: editsData?.motivation || parsedData.motivation,
      ending: editsData?.ending || parsedData.ending,
    };
  }),
);

/** Only show characters that have at least a name */
const visibleCharacters = computed(() =>
  characters.value.filter((c) => c.name),
);

const hasCharacters = computed(() => visibleCharacters.value.length > 0);

interface EditEntry extends CharacterData {
  [key: string]: string;
}

const edits = ref<Record<string, EditEntry>>({});

function startEdit(role: string) {
  const current = characters.value.find((c) => c.role === role);
  if (!current) return;
  edits.value = {
    ...edits.value,
    [role]: {
      name: current.name,
      age: current.age,
      desire: current.desire,
      motivation: current.motivation,
      ending: current.ending,
    },
  };
  editingRole.value = role;
}

function saveEdit(role: string) {
  if (edits.value[role]) {
    savedEdits.value = {
      ...savedEdits.value,
      [role]: { ...edits.value[role] },
    };
  }
  editingRole.value = null;
}

function cancelEdit() {
  editingRole.value = null;
}
</script>

<style scoped>
/* ── Card ─────────────────────────────────────────── */
.character-card__item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

/* ── Header ────────────────────────────────────────── */
.character-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.character-card__avatar-col {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-card__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  flex-shrink: 0;
}

.character-card__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-card__name {
  font-size: 14px;
  color: #111827;
}

.character-card__role-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.character-card__badge--violet { background: #ede9fe; color: #6d28d9; }
.character-card__badge--red    { background: #fce4ec; color: #c62828; }
.character-card__badge--pink   { background: #fce7f3; color: #be185d; }
.character-card__badge--amber  { background: #fef3c7; color: #b45309; }

.character-card__age {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

/* ── Edit buttons ──────────────────────────────────── */
.character-card__edit-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
}
.character-card__edit-btn:hover { color: #4b5563; }

.character-card__edit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.character-card__save-btn {
  background: none;
  border: none;
  color: #059669;
  cursor: pointer;
  padding: 2px;
}
.character-card__save-btn:hover { color: #047857; }

.character-card__cancel-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
}
.character-card__cancel-btn:hover { color: #4b5563; }

/* ── Arcs grid (view mode) ──────────────────────────── */
.character-card__arcs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.character-card__arc-card {
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
}

.character-card__arc-card-label {
  font-size: 12px;
  color: #9ca3af;
  display: block;
  margin-bottom: 4px;
}

.character-card__arc-card-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

/* ── Edit form ──────────────────────────────────────── */
.character-card__edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.character-card__edit-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.character-card__edit-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}
</style>
