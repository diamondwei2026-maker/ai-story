<script setup lang="ts">
import type { Beat } from '@/stores/useBeatStore';

defineProps<{ beats: Beat[] }>();
const emit = defineEmits<{ select: [beat: Beat] }>();
</script>

<template>
  <div data-testid="beat-list">
    <div v-if="beats.length === 0" data-testid="beat-list-empty">
      暂无细纲数据
    </div>
    <div
      v-for="beat in beats"
      :key="beat.id"
      data-testid="beat-row"
      class="beat-row"
      @click="emit('select', beat)"
    >
      <span class="beat-chapter">第{{ beat.chapterNumber }}章</span>
      <span data-testid="beat-word-count" class="beat-word-count">
        {{ beat.targetWordCount }}字
      </span>
      <span
        data-testid="beat-hook-count"
        class="beat-hook-count"
        :class="{ 'hook-high': beat.hookCount >= 3 }"
      >
        钩子×{{ beat.hookCount }}
      </span>
      <span
        v-if="beat.isClimax"
        data-testid="beat-climax-badge"
        class="beat-badge climax"
      >
        高潮
      </span>
      <span
        v-if="beat.useR1"
        data-testid="beat-r1-badge"
        class="beat-badge r1"
      >
        R1
      </span>
      <span
        v-if="beat.status === 'STALE'"
        data-testid="beat-stale-badge"
        class="beat-badge stale"
      >
        待更新
      </span>
    </div>
  </div>
</template>

<style scoped>
.beat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background-color 0.2s;
}
.beat-row:hover {
  background-color: rgba(212, 168, 83, 0.08);
}
.beat-chapter {
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 60px;
}
.beat-word-count {
  color: var(--color-text-secondary);
  font-size: 13px;
  min-width: 70px;
}
.beat-hook-count {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.beat-hook-count.hook-high {
  color: var(--color-gold-dark);
  font-weight: 600;
}
.beat-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 600;
}
.beat-badge.climax {
  background: #fff3e0;
  color: #e65100;
}
.beat-badge.r1 {
  background: #e8eaf6;
  color: #283593;
}
.beat-badge.stale {
  background: #fbe9e7;
  color: #bf360c;
}
</style>
