<template>
  <div class="segment-card">
    <div class="segment-card__header">
      <span class="segment-card__title">{{ segment.title }}</span>
      <a-tag v-if="segment.isClimax" color="red">高潮</a-tag>
      <span class="segment-card__range">{{ segment.chapterRange }}</span>
    </div>
    <p class="segment-card__summary" v-html="renderedSummary"></p>
    <div v-if="segment.keyEvents.length > 0" class="segment-card__events">
      <span
        v-for="event in segment.keyEvents"
        :key="event"
        class="segment-card__event-tag"
      >{{ event }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderInline, escapeHtml } from '@/utils/markdown';

export interface SegmentData {
  id: string;
  title: string;
  summary: string;
  keyEvents: string[];
  isClimax: boolean;
  chapterRange: string;
}

const props = defineProps<{
  segment: SegmentData;
}>();

const renderedSummary = computed(() => {
  const stripped = props.segment.summary
    .replace(/\[([^\]]*)\]/g, '')    // strip [emotion tags]
    .replace(/^#{1,4}\s+/gm, '')     // strip leftover heading markers
    .trim();
  return renderInline(escapeHtml(stripped));
});
</script>

<style scoped>
.segment-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.segment-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.segment-card__title {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: #1f2937;
}

.segment-card__range {
  font-size: var(--font-size-caption);
  color: #9ca3af;
  margin-left: auto;
}

.segment-card__summary {
  font-size: var(--font-size-caption);
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 10px;
}

.segment-card__events {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.segment-card__event-tag {
  font-size: var(--font-size-caption);
  color: #4b5563;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 2px 8px;
}
</style>
