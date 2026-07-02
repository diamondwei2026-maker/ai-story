<template>
  <div class="project-hub">
    <!-- Header -->
    <header class="project-hub__header">
      <div class="project-hub__header-inner">
        <div>
          <h1 class="project-hub__title">AI 小说创作平台</h1>
          <p class="project-hub__subtitle">全流程 AI 辅助创作，从灵感到完本</p>
        </div>
        <button
          data-testid="create-project-btn"
          class="project-hub__create-btn"
          @click="showCreateModal = true"
        >
          <PlusOutlined />
          新建项目
        </button>
      </div>
    </header>

    <main class="project-hub__main">
      <!-- Loading -->
      <div v-if="loading" class="project-hub__loading">
        <a-spin size="large" tip="加载项目列表中..." />
      </div>

      <!-- Error -->
      <a-alert
        v-else-if="loadError"
        type="error"
        :message="loadError"
        class="project-hub__error"
        closable
        @close="loadError = null"
      />

      <template v-if="loaded">
        <!-- Filter Tabs -->
        <div class="project-hub__tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            data-testid="filter-tab"
            class="project-hub__tab"
            :class="{ 'project-hub__tab--active': activeFilter === tab.key }"
            @click="activeFilter = tab.key"
          >
            {{ tab.label }}
            <span class="project-hub__tab-count">{{ tabCount(tab.key) }}</span>
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredProjects.length === 0"
          data-testid="empty-state"
          class="project-hub__empty"
        >
          <FileTextOutlined class="project-hub__empty-icon" />
          <p>暂无项目</p>
        </div>

        <!-- Project Cards Grid -->
        <div
          v-else
          data-testid="project-list"
          class="project-hub__grid"
        >
          <div
            v-for="project in filteredProjects"
            :key="project.id"
            data-testid="project-card"
            class="project-card"
            :class="{ 'project-card--archived': project.status === 'ARCHIVED' }"
            @click="project.status !== 'ARCHIVED' && openProject(project.id)"
          >
            <!-- Title + Status -->
            <div class="project-card__header">
              <div class="project-card__info">
                <h3 class="project-card__name">{{ project.title }}</h3>
                <p v-if="projectDescription(project)" class="project-card__desc">
                  {{ projectDescription(project) }}
                </p>
                <p v-else class="project-card__desc--empty">暂无简介</p>
              </div>
              <span
                data-testid="project-status-tag"
                class="project-card__status"
                :class="stageTagClass(project.status)"
              >
                {{ statusLabel(project.status) }}
              </span>
            </div>

            <!-- Meta -->
            <div class="project-card__meta">
              <span class="project-card__meta-item">
                <BookOutlined />
                {{ genreLabel(project) }}
              </span>
              <span class="project-card__meta-item">
                <FileTextOutlined />
                {{ formatWordCount(projectWordCount(project)) }}
              </span>
              <span class="project-card__meta-item project-card__meta-item--date">
                <ClockCircleOutlined />
                {{ formatDate(project.updatedAt) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div v-if="project.status !== 'ARCHIVED'" class="project-card__progress">
              <div class="project-card__progress-bar">
                <div
                  v-for="(phase, idx) in STAGES"
                  :key="phase.key"
                  class="project-card__progress-segment"
                  :class="progressSegmentClass(project, phase.key, idx)"
                />
              </div>
              <div class="project-card__progress-labels">
                <span
                  v-for="phase in STAGES"
                  :key="phase.key"
                  class="project-card__progress-label"
                >{{ phase.shortLabel }}</span>
              </div>
            </div>

            <!-- Action Button -->
            <button
              data-testid="project-action-btn"
              class="project-card__action"
              :class="{ 'project-card__action--disabled': project.status === 'ARCHIVED' }"
              @click.stop="openProject(project.id)"
            >
              {{ actionLabel(project.status) }}
              <RightOutlined />
            </button>
          </div>
        </div>
      </template>
    </main>

    <CreateProjectModal
      v-model:open="showCreateModal"
      @created="handleCreateProject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Project } from '@/stores/useProjectStore';
import {
  PlusOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
import CreateProjectModal from '@/components/CreateProjectModal.vue';

const router = useRouter();
const projectStore = useProjectStore();

const showCreateModal = ref(false);
const loading = ref(false);
const loaded = ref(false);
const loadError = ref<string | null>(null);
const projects = ref<Project[]>(projectStore.projects);

// ── Filter ──────────────────────────────────────────────────────
type FilterKey = 'all' | 'active' | 'completed' | 'archived';
const activeFilter = ref<FilterKey>('all');

const filterTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'active' as const, label: '创作中' },
  { key: 'completed' as const, label: '已完本' },
  { key: 'archived' as const, label: '已归档' },
];

function tabCount(key: FilterKey): number {
  if (key === 'all') return projects.value.length;
  if (key === 'active') return projects.value.filter((p) => !['COMPLETED', 'ARCHIVED'].includes(p.status)).length;
  if (key === 'completed') return projects.value.filter((p) => p.status === 'COMPLETED').length;
  return projects.value.filter((p) => p.status === 'ARCHIVED').length;
}

const filteredProjects = computed(() =>
  projects.value.filter((p) => {
    if (activeFilter.value === 'all') return true;
    if (activeFilter.value === 'active') return !['COMPLETED', 'ARCHIVED'].includes(p.status);
    if (activeFilter.value === 'completed') return p.status === 'COMPLETED';
    return p.status === 'ARCHIVED';
  }),
);

// ── Stage constants ─────────────────────────────────────────────
const STAGES = [
  { key: 'IDEA', shortLabel: '灵感' },
  { key: 'SETTING', shortLabel: '设定' },
  { key: 'OUTLINE', shortLabel: '大纲' },
  { key: 'BEATS', shortLabel: '细纲' },
  { key: 'DRAFTING', shortLabel: '正文' },
];

const PHASE_ORDER = ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'];

// ── Helpers ─────────────────────────────────────────────────────
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

const STAGE_TAG_CLASS: Record<string, string> = {
  IDEA: 'stage-tag--violet',
  SETTING: 'stage-tag--blue',
  OUTLINE: 'stage-tag--emerald',
  BEATS: 'stage-tag--amber',
  DRAFTING: 'stage-tag--rose',
  COMPLETED: 'stage-tag--green',
  ARCHIVED: 'stage-tag--gray',
};

function stageTagClass(status: string): string {
  return STAGE_TAG_CLASS[status] ?? 'stage-tag--gray';
}

function genreLabel(project: Project): string {
  return project.config?.genre ?? '未分类';
}

function projectDescription(project: Project): string | null {
  // Use genre as fallback description since Project interface doesn't have description
  const desc = (project as any).description;
  return desc || null;
}

function projectWordCount(project: Project): number {
  return (project as any).wordCount ?? 0;
}

function formatWordCount(count: number): string {
  if (count === 0) return '尚未写作';
  if (count >= 10000) return `${(count / 10000).toFixed(1)} 万字`;
  return `${count} 字`;
}

function actionLabel(status: string): string {
  if (status === 'COMPLETED') return '浏览作品';
  if (status === 'ARCHIVED') return '查看详情';
  return '继续创作';
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

function progressSegmentClass(project: Project, phaseKey: string, _idx: number): string {
  const status = project.status;
  const currentIdx = PHASE_ORDER.indexOf(status === 'COMPLETED' ? 'DRAFTING' : status);
  const phaseIdx = PHASE_ORDER.indexOf(phaseKey);
  if (status === 'COMPLETED' || status === 'ARCHIVED') return 'project-card__progress-segment--done';
  if (phaseIdx < currentIdx) return 'project-card__progress-segment--done';
  if (phaseIdx === currentIdx) return 'project-card__progress-segment--current';
  return 'project-card__progress-segment--pending';
}

// ── Actions ────────────────────────────────────────────────────
const PHASE_ROUTE_MAP: Record<string, string> = {
  IDEA: 'workflow.idea',
  SETTING: 'workflow.setting',
  OUTLINE: 'workflow.outline',
  BEATS: 'workflow.beats',
  DRAFTING: 'workflow.drafting',
  COMPLETED: 'workflow.outline',
};

function openProject(id: string) {
  const project = projectStore.projects.find((p) => p.id === id);
  const routeName = PHASE_ROUTE_MAP[project?.status ?? ''] ?? 'workflow.idea';
  router.push({ name: routeName, params: { id } });
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

async function handleCreateProject(title: string, genre?: string) {
  const project = await projectStore.createProject(title);
  if (genre) {
    try {
      await import('@/api/project').then((m) =>
        m.updateProject(project.id, { config: { genre } }),
      );
    } catch {
      // non-critical
    }
  }
  projects.value = projectStore.projects;
  router.push({ name: 'workflow.idea', params: { id: project.id } });
}

onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
/* ── Page Container ────────────────────────────────────────────── */
.project-hub {
  min-height: 100vh;
  background-color: #f9fafb;
}

/* ── Header ───────────────────────────────────────────────────── */
.project-hub__header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.project-hub__header-inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-hub__title {
  font-size: var(--font-size-heading);
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.project-hub__subtitle {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 2px 0 0;
}

.project-hub__create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.project-hub__create-btn:hover {
  background: #374151;
}

/* ── Main ─────────────────────────────────────────────────────── */
.project-hub__main {
  max-width: 72rem;
  margin: 0 auto;
  padding: 32px 24px;
}

.project-hub__loading,
.project-hub__error {
  text-align: center;
  padding: 80px 0;
}

/* ── Filter Tabs ──────────────────────────────────────────────── */
.project-hub__tabs {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.project-hub__tab {
  padding: 10px 16px;
  font-size: var(--font-size-body);
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: all 0.15s;
}

.project-hub__tab:hover {
  color: #374151;
}

.project-hub__tab--active {
  color: #111827;
  border-bottom-color: #111827;
}

.project-hub__tab-count {
  margin-left: 6px;
  font-size: var(--font-size-caption);
  color: #9ca3af;
}

/* ── Empty State ──────────────────────────────────────────────── */
.project-hub__empty {
  text-align: center;
  padding: 80px 0;
  color: #9ca3af;
}

.project-hub__empty-icon {
  font-size: 32px;
  opacity: 0.3;
  margin-bottom: 12px;
}

/* ── Grid ─────────────────────────────────────────────────────── */
.project-hub__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* ── Card ─────────────────────────────────────────────────────── */
.project-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: box-shadow 0.2s;
  cursor: pointer;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.project-card--archived {
  opacity: 0.6;
  cursor: default;
}

.project-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-card__info {
  flex: 1;
  min-width: 0;
}

.project-card__name {
  font-size: var(--font-size-section);
  font-weight: 600;
  color: #111827;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card__desc {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.project-card__desc--empty {
  font-size: var(--font-size-body);
  color: #9ca3af;
  margin: 4px 0 0;
  font-style: italic;
}

.project-card__status {
  flex-shrink: 0;
  font-size: var(--font-size-caption);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid;
}

/* ── Stage Tag Colors ─────────────────────────────────────────── */
.stage-tag--violet {
  background: #f5f3ff;
  color: #6d28d9;
  border-color: #ddd6fe;
}
.stage-tag--blue {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}
.stage-tag--emerald {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}
.stage-tag--amber {
  background: #fffbeb;
  color: #d97706;
  border-color: #fde68a;
}
.stage-tag--rose {
  background: #fff1f2;
  color: #e11d48;
  border-color: #fecdd3;
}
.stage-tag--green {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}
.stage-tag--gray {
  background: #f9fafb;
  color: #9ca3af;
  border-color: #e5e7eb;
}

/* ── Meta ─────────────────────────────────────────────────────── */
.project-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-caption);
  color: #9ca3af;
}

.project-card__meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-card__meta-item--date {
  margin-left: auto;
}

/* ── Progress ─────────────────────────────────────────────────── */
.project-card__progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-card__progress-bar {
  display: flex;
  gap: 4px;
}

.project-card__progress-segment {
  flex: 1;
  height: 4px;
  border-radius: 6px;
}

.project-card__progress-segment--done {
  background: #374151;
}

.project-card__progress-segment--current {
  background: #9ca3af;
}

.project-card__progress-segment--pending {
  background: #e5e7eb;
}

.project-card__progress-labels {
  display: flex;
  justify-content: space-between;
}

.project-card__progress-label {
  font-size: var(--font-size-caption);
  color: #9ca3af;
}

/* ── Action ───────────────────────────────────────────────────── */
.project-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: var(--font-size-body);
  color: #374151;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.project-card__action:hover {
  background: #f9fafb;
}

.project-card__action--disabled {
  color: #9ca3af;
  cursor: not-allowed;
  border-color: #e5e7eb;
}
</style>
