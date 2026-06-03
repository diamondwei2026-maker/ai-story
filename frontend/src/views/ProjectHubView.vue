<template>
  <div class="project-hub page-container">
    <!-- Hero -->
    <div class="project-hub__hero">
      <h1 class="project-hub__title page-title serif-accent">我的项目</h1>
      <p class="page-container__subtitle">继续你的创作之旅</p>
      <div class="project-hub__hero-actions">
        <a-button
          type="primary"
          size="large"
          data-testid="create-project-btn"
          @click="showCreateModal = true"
        >
          新建项目
        </a-button>
      </div>
    </div>

    <EditorialDivider v-if="loaded && projects.length > 0" />

    <!-- Project Cards Grid -->
    <a-spin v-if="loading" class="project-hub__loading" size="large" tip="加载项目列表中..." />
    <a-alert
      v-else-if="loadError"
      type="error"
      :message="loadError"
      class="project-hub__error"
      closable
      @close="loadError = null"
    />

    <a-row
      v-if="loaded && projects.length > 0"
      data-testid="project-list"
      :gutter="[24, 24]"
      class="project-hub__grid"
    >
      <a-col
        v-for="project in projects"
        :key="project.id"
        :xs="24"
        :sm="12"
        :lg="8"
      >
        <a-card
          hoverable
          data-testid="project-card"
          class="project-card"
          @click="openProject(project.id)"
        >
          <template #cover>
            <div
              :class="['project-card__cover', coverClass(project.title)]"
            >
              <span class="project-card__cover-initial serif-accent">
                {{ project.title.charAt(0) }}
              </span>
            </div>
          </template>
          <a-card-meta>
            <template #title>
              <span class="project-card__title">{{ project.title }}</span>
            </template>
            <template #description>
              <div class="project-card__meta">
                <a-tag :color="statusColor(project.status)">
                  {{ statusLabel(project.status) }}
                </a-tag>
                <span class="project-card__date caption">
                  {{ formatDate(project.updatedAt) }}
                </span>
              </div>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>
    </a-row>

    <!-- Empty State -->
    <EmptyState
      v-if="loaded && projects.length === 0"
      data-testid="empty-state"
      description="你的写作台还是空的，开始你的第一部小说吧。"
    />

    <CreateProjectModal
      v-model:open="showCreateModal"
      @created="handleCreateProject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Project } from '@/stores/useProjectStore';
import EmptyState from '@/components/EmptyState.vue';
import EditorialDivider from '@/components/EditorialDivider.vue';
import CreateProjectModal from '@/components/CreateProjectModal.vue';

const router = useRouter();
const projectStore = useProjectStore();

const showCreateModal = ref(false);
const loading = ref(false);
const loaded = ref(false);
const loadError = ref<string | null>(null);

const projects = ref<Project[]>(projectStore.projects);

const COVER_GRADIENTS = [
  'cover--teal',
  'cover--amber',
  'cover--slate',
  'cover--navy',
  'cover--emerald',
  'cover--rose',
];

function coverClass(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    IDEA: 'processing',
    SETTING: 'teal',
    OUTLINE: 'blue',
    BEATS: 'purple',
    DRAFTING: 'orange',
    COMPLETED: 'success',
    ARCHIVED: 'default',
  };
  return map[status] ?? 'default';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    IDEA: '灵感提取',
    SETTING: '设定集',
    OUTLINE: '剧情大纲',
    BEATS: '细纲拆解',
    DRAFTING: '正文迭代',
    COMPLETED: '已完本',
    ARCHIVED: '已归档',
  };
  return map[status] ?? status;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天更新';
  if (days === 1) return '昨天更新';
  if (days < 7) return `${days} 天前更新`;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadProjects() {
  loading.value = true;
  loadError.value = null;
  try {
    await projectStore.loadProjects();
    projects.value = projectStore.projects;
    loaded.value = true;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载项目列表失败';
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleCreateProject(title: string) {
  const project = await projectStore.createProject(title);
  projects.value = projectStore.projects;
  router.push({ name: 'workflow.idea', params: { id: project.id } });
}

/** 根据项目 status 映射到已实现的 phase 路由，用于恢复工作进度 */
const PHASE_ROUTE_MAP: Record<string, string> = {
  IDEA: 'workflow.idea',
  SETTING: 'workflow.setting',
  OUTLINE: 'workflow.outline',
  BEATS: 'workflow.beats',
  DRAFTING: 'workflow.drafting',
  // COMPLETED 暂回退到 outline（完本只读模式未实现）
  COMPLETED: 'workflow.outline',
};

function openProject(id: string) {
  const project = projectStore.projects.find((p) => p.id === id);
  const routeName = PHASE_ROUTE_MAP[project?.status ?? ''] ?? 'workflow.idea';
  router.push({ name: routeName, params: { id } });
}

onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.project-hub__hero {
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-xl);
}

.project-hub__title {
  margin-bottom: var(--space-sm);
}

.project-hub__hero-actions {
  margin-top: var(--space-xl);
}

.project-hub__loading,
.project-hub__error {
  text-align: center;
  padding: var(--space-2xl);
}

.project-hub__grid {
  padding: 0;
}

.project-card {
  transition: transform 0.2s var(--ease-out-expo), box-shadow 0.2s var(--ease-out-expo);
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.project-card__cover {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card__cover-initial {
  font-size: 48px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  user-select: none;
}

.cover--teal {
  background: linear-gradient(135deg, #0d9488, #0f766e);
}
.cover--amber {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.cover--slate {
  background: linear-gradient(135deg, #475569, #334155);
}
.cover--navy {
  background: linear-gradient(135deg, #1e40af, #1e3a8a);
}
.cover--emerald {
  background: linear-gradient(135deg, #059669, #047857);
}
.cover--rose {
  background: linear-gradient(135deg, #e11d48, #be123c);
}

.project-card__title {
  font-size: 15px;
  font-weight: 600;
}

.project-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.project-card__date {
  white-space: nowrap;
}
</style>
