<template>
  <div data-testid="setting-view" class="setting-view">
    <h2 data-testid="setting-title" class="setting-view__title">设定集</h2>

    <div
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      class="setting-view__review-banner"
    >
      {{ reviewAnnotations }}
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="setting-loading" class="setting-view__loading">
      设定生成中，请稍候...
    </div>

    <!-- Error -->
    <div v-if="error" data-testid="setting-error" class="setting-view__error">
      <p>{{ error }}</p>
      <button
        data-testid="setting-retry-btn"
        class="setting-view__retry-btn"
        @click="handleGenerate"
      >
        重试
      </button>
    </div>

    <!-- Generate button (when no setting and not loading) -->
    <div
      v-if="!settingData && !loading"
      class="setting-view__empty"
    >
      <p class="setting-view__empty-text">点击生成按钮，AI 将基于灵感创建设定集</p>
      <button
        data-testid="generate-setting-btn"
        class="setting-view__generate-btn"
        :disabled="loading"
        @click="handleGenerate"
      >
        生成设定
      </button>
    </div>

    <!-- Setting content -->
    <template v-if="settingData && !loading">
      <WorldBuilder :content="settingData.output" />
      <CharacterCard :content="settingData.output" />
      <RelationGraph :content="settingData.output" />

      <div
        v-if="!isConfirmed"
        class="setting-view__actions"
      >
        <button
          data-testid="regenerate-setting-btn"
          class="setting-view__regenerate-btn"
          :disabled="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </button>
        <button
          data-testid="confirm-setting-btn"
          class="setting-view__confirm-btn"
          @click="handleConfirm"
        >
          确认设定，进入大纲阶段
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { generateSetting, confirmSetting, getSetting } from '@/api/setting';
import type { SettingResponse } from '@/api/setting';
import WorldBuilder from '@/components/WorldBuilder.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import RelationGraph from '@/components/RelationGraph.vue';

const props = defineProps<{
  projectId: string;
}>();

const store = useWorkflowStore();

const settingData = ref<SettingResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const isConfirmed = computed(() => {
  return (
    settingData.value?.status === 'CONFIRMED' ||
    store.getStepStatus('SETTING') === 'CONFIRMED'
  );
});

const reviewAnnotations = computed(() => {
  const annotations = settingData.value?.review?.annotations;
  return typeof annotations === 'string' ? annotations : null;
});

onMounted(async () => {
  try {
    const existing = await getSetting(props.projectId);
    if (existing) {
      settingData.value = existing;
    }
  } catch {
    // Silently ignore fetch errors on mount
  }
});

async function handleGenerate() {
  loading.value = true;
  error.value = null;
  try {
    const result = await generateSetting(props.projectId, { idea: '' });
    settingData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '生成失败';
  } finally {
    loading.value = false;
  }
}

const regenerating = ref(false);

async function handleRegenerate() {
  regenerating.value = true;
  error.value = null;
  try {
    const result = await generateSetting(props.projectId, {
      idea: '',
      currentContent: settingData.value?.output ?? '',
    });
    settingData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刷新失败';
  } finally {
    regenerating.value = false;
  }
}

async function handleConfirm() {
  try {
    const result = await confirmSetting(props.projectId);
    settingData.value = result;
    store.setStepStatus('SETTING', 'CONFIRMED');
    store.setCurrentPhase('OUTLINE');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '确认失败';
  }
}
</script>

<style scoped>
.setting-view {
  padding: 16px 0;
}

.setting-view__title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.setting-view__review-banner {
  background-color: #fff8e1;
  color: #795548;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.setting-view__loading {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.setting-view__error {
  background-color: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 6px;
  text-align: center;
  margin-bottom: 16px;
}

.setting-view__retry-btn {
  margin-top: 8px;
  padding: 6px 20px;
  background-color: #c62828;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.setting-view__empty {
  text-align: center;
  padding: 48px 16px;
}

.setting-view__empty-text {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.setting-view__generate-btn {
  background-color: var(--color-gold);
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.setting-view__generate-btn:hover {
  background-color: var(--color-gold-dark);
}

.setting-view__generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-view__actions {
  text-align: center;
  padding: 24px 0;
}

.setting-view__regenerate-btn {
  background: transparent;
  color: var(--color-gold);
  border: 1px solid var(--color-gold);
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  margin-right: 16px;
  transition: all 0.3s;
}

.setting-view__regenerate-btn:hover:not(:disabled) {
  background: var(--color-gold);
  color: #fff;
}

.setting-view__regenerate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-view__confirm-btn {
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.setting-view__confirm-btn:hover {
  opacity: 0.9;
}
</style>
