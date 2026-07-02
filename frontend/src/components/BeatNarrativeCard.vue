<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = withDefaults(defineProps<{
  beat: Beat;
  isExpanded: boolean;
  isAffected?: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  isAdjusting?: boolean;
  adjustPopoverOpen?: boolean;
  isReadOnly?: boolean;
}>(), {
  isAffected: false,
  selectMode: false,
  isSelected: false,
  isAdjusting: false,
  adjustPopoverOpen: false,
  isReadOnly: false,
});

const emit = defineEmits<{
  'toggle-expand': [beatId: string];
  'adjust': [beatId: string, feedback: string];
  'save-wordcount': [beatId: string, wordCount: number];
  'toggle-climax': [beatId: string, isClimax: boolean];
  'toggle-select': [beatId: string];
  'open-adjust-popover': [beatId: string];
  'close-adjust-popover': [];
  'impact-preview': [beatId: string];
}>();

const editWordCount = ref(props.beat.targetWordCount);
const adjustInput = ref('');
const popoverRef = ref<HTMLElement | null>(null);

// Sync word count when beat prop changes
watch(() => props.beat.targetWordCount, (v) => { editWordCount.value = v; });

// Click-outside handler for adjust popover
function handleClickOutside(e: MouseEvent) {
  if (props.adjustPopoverOpen && popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    emit('close-adjust-popover');
  }
}
onMounted(() => document.addEventListener('mousedown', handleClickOutside, true));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside, true));

const narrativeSummary = computed(() => props.beat.narrativeSummary || '暂无叙事摘要');
const conflictDesc = computed(() => props.beat.conflictDescription || '暂无冲突描述');

const pacingTagStyle = computed(() => {
  switch (props.beat.pacingLabel) {
    case '快': return { color: '#dc2626', bg: '#fef2f2' };
    case '中': return { color: '#d97706', bg: '#fffbeb' };
    case '慢': return { color: '#2563eb', bg: '#eff6ff' };
    default: return { color: '#6b7280', bg: '#f9fafb' };
  }
});

const avatarStyle = computed(() => {
  if (props.beat.isClimax) return { bg: '#ffe4e6', color: '#e11d48' };
  return { bg: '#f3f4f6', color: '#4b5563' };
});

function handleToggleExpand() { emit('toggle-expand', props.beat.id); }
function handleToggleSelect() { emit('toggle-select', props.beat.id); }
function handleToggleClimax() { emit('toggle-climax', props.beat.id, !props.beat.isClimax); }

function openAdjustPopover(e: Event) {
  e.stopPropagation();
  emit('open-adjust-popover', props.beat.id);
  adjustInput.value = '';
}

function handleConfirmAdjust() {
  const text = adjustInput.value.trim();
  if (text) emit('adjust', props.beat.id, text);
  adjustInput.value = '';
  emit('close-adjust-popover');
}

function handleAdjustKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && adjustInput.value.trim()) handleConfirmAdjust();
  if (e.key === 'Escape') emit('close-adjust-popover');
}

function handleWordCountChange() {
  if (editWordCount.value !== props.beat.targetWordCount && editWordCount.value > 0) {
    emit('save-wordcount', props.beat.id, editWordCount.value);
    emit('impact-preview', props.beat.id);
  }
}

function formatWordCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w 字';
  return (n / 1000).toFixed(1) + 'k 字';
}

/** Build a single display string from hookCausalChain */
const hookDisplayText = computed(() => {
  const chain = props.beat.hookCausalChain;
  if (!chain || chain.length === 0) return '';
  return chain.map((h, i) => {
    const resolve = h.resolvesInChapter != null ? `（第${h.resolvesInChapter}章回收）` : '（未设定回收章节）';
    return `钩子${i + 1}：${h.hook}${resolve}`;
  }).join('\n');
});
</script>

<template>
  <div
    data-testid="beat-narrative-card"
    class="beat-card"
    :class="{
      'beat-card--expanded': isExpanded,
      'beat-card--affected': isAffected,
      'beat-card--selected': isSelected,
      'beat-card--climax': beat.isClimax,
    }"
  >
    <!-- ── Header row ── -->
    <div class="beat-card__header">
      <!-- Select checkbox -->
      <button
        v-if="selectMode"
        data-testid="narrative-card-select-cb"
        class="select-cb"
        :class="{ 'select-cb--checked': isSelected }"
        @click="handleToggleSelect"
      >
        <span v-if="isSelected" class="select-cb__check">✓</span>
      </button>

      <!-- Circle chapter avatar -->
      <button
        data-testid="narrative-card-chapter"
        class="chapter-avatar"
        :style="{ background: avatarStyle.bg, color: avatarStyle.color }"
        @click="handleToggleExpand"
      >
        {{ beat.chapterNumber }}
      </button>

      <!-- Badges + summary (clickable) -->
      <div class="header-content" @click="handleToggleExpand">
        <div class="header-badges">
          <span v-if="beat.isClimax" data-testid="narrative-card-climax-badge" class="badge badge--climax">高潮章节</span>
          <span data-testid="narrative-card-pacing" class="badge" :style="{ color: pacingTagStyle.color, background: pacingTagStyle.bg }">
            节奏: {{ beat.pacingLabel }}
          </span>
          <span data-testid="narrative-card-intensity-dots" class="intensity-dots">
            <span v-for="i in 5" :key="i" class="dot" :class="{ 'dot--active': i <= beat.conflictIntensity }" />
          </span>
          <a-tag v-if="beat.status === 'STALE'" data-testid="narrative-card-stale-badge" color="red" size="small">待更新</a-tag>
          <a-tag v-if="isAffected" data-testid="narrative-card-affected-badge" color="gold" size="small">受影响</a-tag>
        </div>
        <p data-testid="narrative-card-summary" class="header-summary">{{ narrativeSummary }}</p>
      </div>

      <!-- Right actions -->
      <div class="header-actions">
        <span data-testid="narrative-card-wordcount" class="word-count">{{ formatWordCount(beat.targetWordCount) }}</span>

        <template v-if="!isReadOnly && !selectMode">
          <!-- Star climax toggle -->
          <button
            data-testid="narrative-card-climax-toggle"
            class="icon-btn"
            :class="{ 'icon-btn--active': beat.isClimax }"
            :title="beat.isClimax ? '取消高潮标记' : '标记为高潮章节'"
            @click.stop="handleToggleClimax"
          >
            <span class="icon-star">{{ beat.isClimax ? '★' : '☆' }}</span>
          </button>

          <!-- AI adjust popover trigger -->
          <div class="adjust-popover-anchor">
            <button
              data-testid="narrative-card-adjust-btn"
              class="icon-btn"
              :class="{ 'icon-btn--active': adjustPopoverOpen }"
              :disabled="isAdjusting"
              title="AI 调整本章"
              @click="openAdjustPopover"
            >
              <span v-if="isAdjusting" class="icon-spinner" />
              <span v-else class="icon-wand">✨</span>
            </button>

            <!-- Popover -->
            <div
              v-if="adjustPopoverOpen"
              ref="popoverRef"
              data-testid="narrative-card-adjust-popover"
              class="adjust-popover"
              @click.stop
            >
              <div class="adjust-popover__header">
                <span class="adjust-popover__title">AI 调整第{{ beat.chapterNumber }}章</span>
                <button data-testid="adjust-popover-close" class="adjust-popover__close" @click="emit('close-adjust-popover')">✕</button>
              </div>
              <input
                v-model="adjustInput"
                data-testid="adjust-popover-input"
                class="adjust-popover__input"
                placeholder="例如：节奏改快、增加悬念钩子..."
                autofocus
                @keydown="handleAdjustKeydown"
              />
              <button
                data-testid="adjust-popover-confirm"
                class="adjust-popover__confirm"
                :disabled="!adjustInput.trim()"
                @click="handleConfirmAdjust"
              >
                确认调整
              </button>
            </div>
          </div>
        </template>

        <!-- Expand chevron -->
        <button
          data-testid="narrative-card-expand-toggle"
          class="icon-btn icon-btn--chevron"
          @click="handleToggleExpand"
        >
          <span>{{ isExpanded ? '▲' : '▼' }}</span>
        </button>
      </div>
    </div>

    <!-- ── Expanded content ── -->
    <div v-if="isExpanded" data-testid="narrative-card-expanded" class="beat-card__expanded">
      <div class="expanded-grid">
        <div class="expanded-card">
          <div class="expanded-card__label">叙事摘要</div>
          <p data-testid="narrative-card-summary-expanded" class="expanded-card__text">{{ narrativeSummary }}</p>
        </div>
        <div class="expanded-card">
          <div class="expanded-card__label">核心冲突</div>
          <p data-testid="narrative-card-conflict-desc" class="expanded-card__text">{{ conflictDesc }}</p>
        </div>
      </div>

      <!-- Word count inline edit -->
      <div class="wordcount-edit">
        <span class="wordcount-edit__label">本章字数</span>
        <input
          v-if="!isReadOnly"
          type="number"
          data-testid="narrative-card-wordcount-input"
          class="wordcount-edit__input"
          :value="editWordCount"
          :min="500"
          :step="100"
          @input="editWordCount = Number(($event.target as HTMLInputElement).value)"
          @blur="handleWordCountChange"
          @keydown.enter="handleWordCountChange"
        />
        <span v-else class="wordcount-edit__value">{{ editWordCount }}</span>
        <span class="wordcount-edit__unit">字</span>
      </div>

      <!-- Hook causal chain -->
      <div v-if="hookDisplayText" class="hook-card">
        <div class="hook-card__label">钩子因果链</div>
        <p data-testid="narrative-card-hook-text" class="hook-card__text">{{ hookDisplayText }}</p>
      </div>
      <div v-else class="hook-card hook-card--empty">
        <span class="hook-card__empty-text">暂无钩子</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Card shell ── */
.beat-card {
  background: var(--color-surface);
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: border-color .2s, box-shadow .2s;
}
.beat-card--selected { border-color: #111827; }
.beat-card--climax { border-color: #fecdd3; }
.beat-card--expanded { box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.beat-card--affected { border-left: 3px solid #f59e0b; background: #fffbeb; }

/* ── Header ── */
.beat-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
}

/* Select checkbox */
.select-cb {
  width: 20px; height: 20px;
  border-radius: 4px;
  border: 2px solid #d1d5db;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: all .15s;
}
.select-cb:hover { border-color: #6b7280; }
.select-cb--checked { background: #111827; border-color: #111827; }
.select-cb__check { color: #fff; font-size: 11px; line-height: 1; }

/* Circle avatar */
.chapter-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  border: none; cursor: pointer; flex-shrink: 0;
  transition: transform .15s;
}
.chapter-avatar:hover { transform: scale(1.1); }

/* Header content area */
.header-content { flex: 1; min-width: 0; cursor: pointer; }
.header-badges {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap; margin-bottom: 4px;
}

.badge {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  font-weight: 500; line-height: 1.4;
}
.badge--climax { background: #ffe4e6; color: #e11d48; }

/* Intensity dots */
.intensity-dots { display: flex; align-items: center; gap: 2px; }
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #e5e7eb; transition: background .2s;
}
.dot--active { background: #ef4444; }

.header-summary {
  font-size: 14px; color: #374151; line-height: 1.5;
  margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Right actions */
.header-actions {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.word-count {
  font-size: 12px; color: #9ca3af; white-space: nowrap; margin-right: 2px;
}

.icon-btn {
  width: 30px; height: 30px;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #d1d5db; font-size: 14px;
  transition: all .15s;
}
.icon-btn:hover { background: #f3f4f6; color: #6b7280; }
.icon-btn--active { color: #e11d48; }
.icon-btn--active:hover { color: #be123c; }
.icon-btn--chevron { color: #9ca3af; }
.icon-btn--chevron:hover { color: #374151; }
.icon-btn:disabled { opacity: .4; cursor: not-allowed; }

.icon-star { font-size: 15px; line-height: 1; }
.icon-wand { font-size: 13px; line-height: 1; }
.icon-spinner {
  width: 14px; height: 14px;
  border: 2px solid #e5e7eb; border-top-color: #3b82f6;
  border-radius: 50%; display: inline-block;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── AI Adjust Popover ── */
.adjust-popover-anchor { position: relative; }
.adjust-popover {
  position: absolute; right: 0; top: calc(100% + 4px);
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  padding: 12px; width: 256px; z-index: 30;
}
.adjust-popover__header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.adjust-popover__title { font-size: 12px; color: #6b7280; }
.adjust-popover__close {
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: #9ca3af;
}
.adjust-popover__close:hover { color: #374151; }
.adjust-popover__input {
  width: 100%; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 6px 10px; font-size: 12px; outline: none;
  box-sizing: border-box;
}
.adjust-popover__input:focus { border-color: #9ca3af; }
.adjust-popover__confirm {
  margin-top: 8px; width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  background: #111827; color: #fff; border: none;
  border-radius: 8px; padding: 6px 0; font-size: 12px;
  cursor: pointer; transition: background .15s;
}
.adjust-popover__confirm:hover { background: #1f2937; }
.adjust-popover__confirm:disabled { opacity: .4; cursor: not-allowed; }

/* ── Expanded content ── */
.beat-card__expanded {
  padding: 0 16px 16px;
  border-top: 1px solid #f3f4f6;
}
.expanded-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 12px;
}
@media (max-width: 640px) { .expanded-grid { grid-template-columns: 1fr; } }
.expanded-card {
  background: #f9fafb; border-radius: 8px; padding: 12px;
}
.expanded-card__label {
  font-size: 11px; color: #9ca3af; margin-bottom: 6px;
}
.expanded-card__text {
  font-size: 13px; color: #374151; line-height: 1.6; margin: 0;
}

/* Word count edit */
.wordcount-edit {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px;
}
.wordcount-edit__label { font-size: 12px; color: #6b7280; }
.wordcount-edit__input {
  border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 4px 8px; font-size: 12px; width: 80px; outline: none;
}
.wordcount-edit__input:focus { border-color: #9ca3af; }
.wordcount-edit__value { font-size: 13px; color: #374151; }
.wordcount-edit__unit { font-size: 12px; color: #9ca3af; }

/* Hook card */
.hook-card {
  margin-top: 12px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 12px;
}
.hook-card--empty { background: #f9fafb; border-color: #e5e7eb; }
.hook-card__label { font-size: 11px; color: #d97706; margin-bottom: 4px; }
.hook-card__text {
  font-size: 12px; color: #92400e; line-height: 1.6; margin: 0;
  white-space: pre-line;
}
.hook-card__empty-text {
  font-size: 12px; color: #9ca3af; font-style: italic;
}
</style>
