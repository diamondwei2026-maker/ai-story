<template>
  <div class="project-hub">
    <h1 class="project-hub__title">我的项目</h1>
    <div class="project-hub__toolbar">
      <button data-testid="create-project-btn" class="project-hub__create-btn" @click="handleCreateProject">
        创建项目
      </button>
    </div>
    <div data-testid="project-list" class="project-hub__list">
      <div data-testid="empty-state" class="project-hub__empty">
        暂无项目，点击上方按钮开始创作
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/useProjectStore';

const router = useRouter();
const projectStore = useProjectStore();

async function handleCreateProject() {
  const title = window.prompt('请输入项目名称');
  if (title === null || title.trim().length === 0) return;

  const project = await projectStore.createProject(title.trim());
  router.push({ name: 'workflow.idea', params: { id: project.id } });
}
</script>

<style scoped>

.project-hub {
  max-width: 900px;
  margin: 0 auto;
}

.project-hub__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 24px;
  text-align: center;
  letter-spacing: -0.5px;
}

.project-hub__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.project-hub__create-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.project-hub__create-btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.project-hub__create-btn:active {
  transform: translateY(0);
}

.project-hub__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 64px 0;
  font-size: 15px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
}
</style>
