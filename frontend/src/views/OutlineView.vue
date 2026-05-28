<template>
  <div data-testid="outline-view" class="outline-view">
    <h2 data-testid="outline-title" class="outline-view__title section-title">剧情大纲</h2>

    <a-alert
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      type="warning"
      :message="reviewAnnotations"
      banner
      show-icon
    />

    <!-- Loading -->
    <div v-if="loading" data-testid="outline-loading" class="outline-view__loading">
      <a-spin tip="大纲生成中，请稍候..." />
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="outline-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="outline-view__error"
    >
      <template #action>
        <a-button
          data-testid="outline-retry-btn"
          size="small"
          @click="handleGenerate"
        >
          Retry
        </a-button>
      </template>
    </a-alert>

    <!-- Generate button (when no outline and not loading) -->
    <EmptyState
      v-if="!outlineData && !loading"
      description="选择叙事结构，让AI构建你的剧情大纲"
    >
      <template #action>
        <div
          v-if="!isConfirmed"
          data-testid="structure-switcher"
          class="outline-view__structure-select"
        >
          <span class="outline-view__structure-select-label">叙事结构：</span>
          <a-segmented
            v-model:value="selectedStructure"
            :options="structureOptions"
            block
          />
        </div>
        <a-button
          type="primary"
          data-testid="generate-outline-btn"
          :loading="loading"
          class="outline-view__generate-btn"
          @click="handleGenerate"
        >
          生成大纲
        </a-button>
      </template>
    </EmptyState>

    <!-- Outline content -->
    <template v-if="outlineData && !loading">
      <div
        v-if="!isConfirmed"
        data-testid="structure-switcher"
        class="outline-view__structure-select"
      >
        <span class="outline-view__structure-select-label">叙事结构：</span>
        <a-segmented
          v-model:value="selectedStructure"
          :options="structureOptions"
          block
          @change="handleSwitchStructure"
        />
      </div>

      <div data-testid="outline-tree" class="outline-view__tree">
        <a-timeline v-if="parsedOutline.length > 0">
          <a-timeline-item
            v-for="(item, i) in parsedOutline"
            :key="i"
            :color="item.color"
          >
            <h4 class="outline-item__title">{{ item.title }}</h4>
            <p class="outline-item__body body-text">{{ item.body }}</p>
          </a-timeline-item>
        </a-timeline>
        <pre v-else class="outline-view__fallback body-text">{{ outlineData.output }}</pre>
      </div>

      <div data-testid="emotion-curve" class="outline-view__emotion-bar">
        <span class="outline-view__emotion-label caption">情绪节点：</span>
        <a-tag
          v-for="label in emotionLabels"
          :key="label"
          :color="emotionColor(label)"
        >
          {{ label }}
        </a-tag>
      </div>

      <div
        v-if="!isConfirmed"
        class="outline-view__actions"
      >
        <a-button
          data-testid="regenerate-outline-btn"
          :loading="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </a-button>
        <a-button
          danger
          data-testid="reject-outline-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </a-button>
        <a-button
          type="primary"
          data-testid="confirm-outline-btn"
          class="amber-btn"
          @click="handleConfirm"
        >
          确认大纲，进入分节阶段
        </a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import {
  generateOutline,
  confirmOutline,
  rejectOutline,
  getOutline,
  switchStructure,
} from '@/api/outline';
import type { StepDataResponse } from '@/api/common';
import EmptyState from '@/components/EmptyState.vue';

const props = defineProps<{
  projectId: string;
}>();

const selectedStructure = ref('three-act');

const structureOptions = [
  { value: 'three-act', label: '三幕式' },
  { value: 'web-novel-ten', label: '网文十章' },
  { value: 'four-act-eight', label: '四幕八段' },
];

const {
  data: outlineData,
  loading,
  regenerating,
  error,
  isConfirmed,
  reviewAnnotations,
  handleGenerate,
  handleRegenerate,
  handleConfirm,
  handleReject,
} = usePhaseWorkflow<StepDataResponse>({
  projectId: props.projectId,
  phase: 'OUTLINE',
  nextPhase: 'BEATS',
  getFn: getOutline,
  generateFn: generateOutline,
  confirmFn: confirmOutline,
  rejectFn: rejectOutline,
  generateArgs: () => ({ setting: '', structure: selectedStructure.value }),
});

const emotionLabels = computed(() => {
  const output = outlineData.value?.output ?? '';
  const labels: string[] = [];
  if (/\[爽点\]/.test(output)) labels.push('爽点');
  if (/\[虐点\]/.test(output)) labels.push('虐点');
  if (/\[悬念点\]/.test(output)) labels.push('悬念点');
  return labels;
});

function emotionColor(label: string): string {
  const map: Record<string, string> = {
    '爽点': 'green',
    '虐点': 'red',
    '悬念点': 'orange',
  };
  return map[label] ?? 'default';
}

interface OutlineItem {
  title: string;
  body: string;
  color: string;
}

const COLORS = ['teal', 'blue', 'purple', 'orange', 'green', 'red', 'cyan'];

const parsedOutline = computed<OutlineItem[]>(() => {
  const output = outlineData.value?.output ?? '';
  const items: OutlineItem[] = [];

  const actMatch = output.match(/(?:^|\n)(第[一二三四五六七八九十]+幕|Act\s+\d+|第\d+章)[\s：:]*([\s\S]*?)(?=\n(?:第[一二三四五六七八九十]+幕|Act\s+\d+|第\d+章)|\n*$)/g);

  if (actMatch && actMatch.length > 0) {
    actMatch.forEach((block, i) => {
      const lines = block.trim().split('\n').filter(Boolean);
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      items.push({
        title: title || `Section ${i + 1}`,
        body: body || block.trim(),
        color: COLORS[i % COLORS.length],
      });
    });
    return items;
  }

  const lines = output.split('\n').filter(Boolean);
  if (lines.every((l) => /^(#{1,3}\s|第.+[幕章节])/.test(l.trim()))) {
    lines.forEach((line, i) => {
      const cleaned = line.replace(/^#{1,3}\s*/, '').trim();
      items.push({
        title: cleaned,
        body: '',
        color: COLORS[i % COLORS.length],
      });
    });
    return items;
  }

  return items;
});

async function handleSwitchStructure() {
  if (
    !confirm('切换叙事结构将重新组织大纲，关键情节点保留但节点间衔接将被重写。确定继续吗？')
  ) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await switchStructure(props.projectId, selectedStructure.value);
    outlineData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '切换结构失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.outline-view {
  padding: var(--space-md) 0;
}

.outline-view__title {
  margin-bottom: var(--space-md);
}

.outline-view__loading {
  text-align: center;
  padding: var(--space-xl);
}

.outline-view__error {
  margin-bottom: var(--space-md);
}

.outline-view__structure-select {
  margin-bottom: var(--space-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.outline-view__structure-select-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  font-weight: 500;
}

.outline-view__generate-btn {
  margin-top: var(--space-md);
}

.outline-view__tree {
  background-color: var(--color-surface-warm);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
  border: 1px solid var(--color-border);
}

.outline-item__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.outline-item__body {
  margin: 0;
}

.outline-view__fallback {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  color: var(--color-text-secondary);
}

.outline-view__emotion-bar {
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.outline-view__emotion-label {
  color: var(--color-text-muted);
}

.outline-view__actions {
  text-align: center;
  padding: var(--space-lg) 0;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
