<template>
  <div data-testid="beat-list">
    <a-empty v-if="beats.length === 0" data-testid="beat-list-empty" description="暂无细纲数据" />
    <a-list
      v-else
      :data-source="beats"
    >
      <template #renderItem="{ item: beat }">
        <a-list-item
          data-testid="beat-row"
          @click="emit('select', beat)"
        >
          <template #actions>
            <a-tag v-if="beat.isClimax" data-testid="beat-climax-badge" color="orange">高潮</a-tag>
            <a-tag v-if="beat.useR1" data-testid="beat-r1-badge" color="blue">R1</a-tag>
            <a-tag v-if="beat.status === 'STALE'" data-testid="beat-stale-badge" color="red">待更新</a-tag>
          </template>
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
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<script setup lang="ts">
import type { Beat } from '@/stores/useBeatStore';

defineProps<{ beats: Beat[] }>();
const emit = defineEmits<{ select: [beat: Beat] }>();
</script>

<style scoped>
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
  color: var(--color-accent-dark);
  font-weight: 600;
}
</style>
