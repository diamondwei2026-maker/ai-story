<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beat: Beat; isExpanded: boolean; isAffected?: boolean }>();
const emit = defineEmits<{
  'toggle-expand': [beatId: string];
  'adjust': [beatId: string, feedback: string];
  'save-wordcount': [beatId: string, wordCount: number];
  'toggle-climax': [beatId: string, isClimax: boolean];
}>();

const editWordCount = ref(props.beat.targetWordCount);
const isEditingWordCount = ref(false);
const adjustPresets = ['节奏快一点','节奏慢一点','冲突更激烈','多一些悬念','直接重写'];
const showCustomInput = ref(false);
const customFeedback = ref('');

function handlePresetSelect(p: string) { emit('adjust', props.beat.id, p); }
function handleCustomSubmit() {
  const t = customFeedback.value.trim();
  if (t) { emit('adjust', props.beat.id, t); customFeedback.value = ''; showCustomInput.value = false; }
}
const narrativeSummary = computed(() => props.beat.narrativeSummary || '暂无叙事摘要');
const conflictDesc = computed(() => props.beat.conflictDescription || '暂无冲突描述');
const pacingColor = computed(() => {
  switch (props.beat.pacingLabel) { case '快': return 'red'; case '中': return 'orange'; case '慢': return 'green'; default: return 'default'; }
});
function handleToggleExpand() { emit('toggle-expand', props.beat.id); }
function handleSaveWordCount() {
  if (editWordCount.value !== props.beat.targetWordCount) emit('save-wordcount', props.beat.id, editWordCount.value);
  isEditingWordCount.value = false;
}
function handleToggleClimax() { emit('toggle-climax', props.beat.id, !props.beat.isClimax); }
</script>

<template>
  <a-card data-testid="beat-narrative-card" size="small" :class="{ 'narrative-card--expanded': isExpanded, 'narrative-card--affected': isAffected }" class="narrative-card">
    <div class="card-collapsed">
      <div data-testid="narrative-card-header" class="card-header" @click="handleToggleExpand">
        <div class="header-left">
          <span data-testid="narrative-card-chapter" class="chapter-badge">第{{ beat.chapterNumber }}章</span>
          <a-tag v-if="beat.isClimax" data-testid="narrative-card-climax-badge" color="orange">高潮</a-tag>
          <a-tag v-if="beat.status === 'STALE'" data-testid="narrative-card-stale-badge" color="red">待更新</a-tag>
          <a-tag v-if="isAffected" data-testid="narrative-card-affected-badge" color="gold">受影响</a-tag>
        </div>
        <span data-testid="narrative-card-expand-hint" class="expand-hint">{{ isExpanded ? '收起' : '展开' }}</span>
      </div>
      <p data-testid="narrative-card-summary" class="narrative-summary" @click="handleToggleExpand">{{ narrativeSummary }}</p>
      <div class="card-footer">
        <span class="footer-item"><span data-testid="narrative-card-wordcount" class="footer-value">{{ beat.targetWordCount }}字</span></span>
        <a-divider type="vertical" />
        <span class="footer-item">节奏<a-tag data-testid="narrative-card-pacing" :color="pacingColor" size="small">{{ beat.pacingLabel }}</a-tag></span>
        <a-divider type="vertical" />
        <span class="footer-item">冲突 {{ beat.conflictIntensity }}/5</span>
        <div class="footer-spacer" />
        <a-dropdown :trigger="['click']" placement="bottomRight">
          <a-button data-testid="narrative-card-rewrite-btn" size="small" type="link">换一种写法</a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="p in adjustPresets" :key="p" data-testid="narrative-card-preset-option" @click="handlePresetSelect(p)">{{ p }}</a-menu-item>
              <a-menu-divider />
              <a-menu-item key="custom" @click="showCustomInput = !showCustomInput">自定义...</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div v-if="showCustomInput" data-testid="narrative-card-custom-input" class="custom-input-row">
        <a-input v-model:value="customFeedback" placeholder="描述你想要的调整..." @press-enter="handleCustomSubmit" />
        <a-button type="primary" size="small" data-testid="narrative-card-custom-submit" @click="handleCustomSubmit">提交</a-button>
      </div>
    </div>
    <div v-if="isExpanded" data-testid="narrative-card-expanded" class="card-expanded">
      <a-divider />
      <div class="expanded-section">
        <h4 class="section-title">冲突描述</h4>
        <p data-testid="narrative-card-conflict-desc" class="conflict-text">{{ conflictDesc }}</p>
      </div>
      <div class="expanded-section">
        <h4 class="section-title">钩子因果链</h4>
        <div v-if="beat.hookCausalChain.length === 0" class="empty-hint">暂无钩子</div>
        <div v-for="(link, idx) in beat.hookCausalChain" :key="idx" data-testid="narrative-card-hook-link" class="hook-link">
          <a-tag color="blue">钩子{{ idx + 1 }}</a-tag>
          <span class="hook-text">{{ link.hook }}</span>
          <span v-if="link.resolvesInChapter != null" class="hook-resolve">- 回收于第{{ link.resolvesInChapter }}章</span>
        </div>
      </div>
    </div>
  </a-card>
</template>

<style scoped>
.narrative-card { margin-bottom: var(--space-sm); transition: border-color .2s, box-shadow .2s; border-left: 3px solid transparent; }
.narrative-card--expanded { border-left-color: var(--color-primary); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.narrative-card--affected { border-left-color: #f59e0b; background: color-mix(in srgb, #f59e0b 4%, var(--color-surface)); }
.card-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 4px 0; margin-bottom: var(--space-sm); }
.header-left { display: flex; align-items: center; gap: 6px; }
.chapter-badge { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.expand-hint { font-size: 11px; color: var(--color-text-secondary); user-select: none; }
.narrative-summary { font-size: 14px; color: var(--color-text-primary); line-height: 1.7; margin: 0 0 var(--space-sm); cursor: pointer; }
.card-footer { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.footer-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-text-secondary); }
.footer-value { font-weight: 600; color: var(--color-text-primary); }
.footer-spacer { flex: 1; }
.custom-input-row { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); align-items: center; }
.custom-input-row :deep(.ant-input) { flex: 1; }
.card-expanded { margin-top: var(--space-sm); }
.expanded-section { margin-bottom: var(--space-md); }
.section-title { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin: 0 0 var(--space-sm); }
.conflict-text { font-size: 13px; color: var(--color-text-primary); line-height: 1.7; margin: 0; padding: var(--space-sm); background: var(--color-surface-warm); border-radius: var(--radius-sm); }
.empty-hint { font-size: 12px; color: var(--color-text-secondary); font-style: italic; }
.hook-link { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
.hook-text { color: var(--color-text-primary); flex: 1; }
.hook-resolve { font-size: 11px; color: var(--color-primary); white-space: nowrap; }
</style>
