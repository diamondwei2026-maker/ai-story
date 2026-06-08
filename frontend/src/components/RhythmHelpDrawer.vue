<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const containerRef = ref<HTMLElement | null>(null);

function handleClose() {
  emit('update:open', false);
}

function getContainer(): HTMLElement {
  return containerRef.value?.parentElement ?? document.body;
}
</script>

<template>
  <div ref="containerRef" data-testid="rhythm-help-drawer-wrapper">
    <a-drawer
      title="图表阅读指南"
      placement="right"
      :width="400"
      :open="open"
      :getPopupContainer="getContainer"
      @close="handleClose"
    >
    <a-descriptions :column="1" size="small" bordered>
      <a-descriptions-item label="冲突强度">
        衡量章节中对立、矛盾、对抗的激烈程度。值越接近 5，冲突越密集；越接近 0，章节越平静。
      </a-descriptions-item>
      <a-descriptions-item label="读者期待值">
        衡量读者对后续情节的期待程度。值越高，悬念和钩子越强；值越低，读者越容易中断阅读。
      </a-descriptions-item>
      <a-descriptions-item label="什么是好节奏？">
        好的节奏像过山车——有爬升也有俯冲，不能一直平。冲突和期待值大部分时间应在 3 以上，偶尔降到 2 以下做情绪缓冲，全书 1/3、2/3、结尾处各有一个 5 分大高潮。
      </a-descriptions-item>
      <a-descriptions-item label="节奏标签">
        快 = 信息密集、事件紧凑，适合战斗/追逐/揭秘；中 = 正常推进剧情；慢 = 情感描写/人物互动/氛围渲染。慢不是坏事，但不能连续太久。
      </a-descriptions-item>
    </a-descriptions>

    <a-divider />

    <div class="help-footer">
      <h4>图表色带说明</h4>
      <div class="legend-item">
        <span class="legend-swatch" style="background:rgba(22,163,74,0.4)"></span>
        <span>绿色区域（3-5）：安全区间，节奏饱满</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:rgba(217,119,6,0.4)"></span>
        <span>黄色区域（2-3）：注意区间，张力偏弱</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:rgba(220,38,38,0.3)"></span>
        <span>红色区域（0-2）：危险区间，可能导致弃书</span>
      </div>
      <div class="legend-item">
        <span class="legend-line"></span>
        <span>虚线 = 警戒线（2.5），低于此线需关注</span>
      </div>
    </div>
    </a-drawer>
  </div>
</template>

<style scoped>
.help-footer {
  margin-top: var(--space-md);
}
.help-footer h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 var(--space-sm);
  color: var(--color-text-primary);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.legend-swatch {
  display: inline-block;
  width: 24px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}
.legend-line {
  display: inline-block;
  width: 24px;
  height: 0;
  border-top: 1.5px dashed #9ca3af;
  flex-shrink: 0;
}
</style>
