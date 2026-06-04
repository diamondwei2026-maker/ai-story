<script setup lang="ts">
import { computed } from "vue";

interface Beat {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<{ beat: Beat; selected?: boolean }>();
const emit = defineEmits<{ select: [beat: Beat] }>();

const conflictPoint = computed(() => {
  const raw = (props.beat.plan.conflictPoint as string) ?? "";
  if (raw.length <= 80) return raw;
  return raw.slice(0, 80) + "…";
});

const hooks = computed(() => {
  const presets = props.beat.plan.hookPresets;
  return Array.isArray(presets) ? (presets as string[]) : [];
});

const pacingLabel = computed(() => {
  if (props.beat.hookCount >= 4) return "快";
  if (props.beat.hookCount >= 2) return "中";
  return "慢";
});

const pacingColor = computed(() => {
  if (props.beat.hookCount >= 4) return "red";
  if (props.beat.hookCount >= 2) return "orange";
  return "default";
});

function handleClick() {
  emit("select", props.beat);
}
</script>

<template>
  <a-card
    data-testid="beat-chapter-card"
    size="small"
    hoverable
    :class="{ 'beat-chapter-card--selected': selected }"
    class="beat-chapter-card"
    @click="handleClick"
  >
    <!-- Header row: chapter number + badges -->
    <div class="card-header">
      <span data-testid="chapter-card-number" class="card-chapter">
        第{{ beat.chapterNumber }}章
      </span>
      <span class="card-badges">
        <a-tag
          v-if="beat.isClimax"
          data-testid="chapter-card-climax-badge"
          color="orange"
        >高潮</a-tag>
        <a-tag
          v-if="beat.useR1"
          data-testid="chapter-card-r1-badge"
          color="blue"
        >R1</a-tag>
        <a-tag
          v-if="beat.status === 'STALE'"
          data-testid="chapter-card-stale-badge"
          color="red"
        >待更新</a-tag>
      </span>
    </div>

    <!-- Conflict point -->
    <div class="card-conflict">
      <span data-testid="chapter-card-conflict" class="conflict-text">
        {{ conflictPoint || '暂无冲突点信息' }}
      </span>
    </div>

    <!-- Hook tags -->
    <div v-if="hooks.length" class="card-hooks">
      <a-tag
        v-for="(hook, idx) in hooks"
        :key="idx"
        data-testid="chapter-card-hook-tag"
        class="hook-tag"
      >{{ hook }}</a-tag>
    </div>

    <!-- Footer: word count + hook count + pacing -->
    <div class="card-footer">
      <span class="footer-item">
        <span data-testid="chapter-card-wordcount" class="footer-value">{{ beat.targetWordCount }}</span>
        <span class="footer-label">字</span>
      </span>
      <span class="footer-divider" />
      <span class="footer-item">
        钩子 ×
        <span data-testid="chapter-card-hookcount" class="footer-value">{{ beat.hookCount }}</span>
      </span>
      <span class="footer-divider" />
      <span class="footer-item">
        节奏
        <a-tag
          data-testid="chapter-card-pacing"
          :color="pacingColor"
          size="small"
        >{{ pacingLabel }}</a-tag>
      </span>
    </div>
  </a-card>
</template>

<style scoped>
.beat-chapter-card {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.beat-chapter-card--selected {
  border-left: 3px solid var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.card-chapter {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-badges {
  display: flex;
  gap: 4px;
}

.card-conflict {
  margin-bottom: var(--space-sm);
}

.conflict-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.card-hooks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-sm);
}

.hook-tag {
  font-size: 11px;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border-light);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.footer-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.footer-label {
  font-size: 11px;
}

.footer-divider {
  width: 1px;
  height: 14px;
  background: var(--color-border-light);
}
</style>
