<template>
  <div class="project-hub">
    <h1 class="project-hub__title">我的项目</h1>
    <div class="project-hub__toolbar">
      <a-button
        type="primary"
        data-testid="create-project-btn"
        @click="handleCreateProject"
      >
        创建项目
      </a-button>
    </div>
    <div data-testid="project-list" class="project-hub__list">
      <a-empty
        data-testid="empty-state"
        description="暂无项目，点击上方按钮开始创作"
      />
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

.project-hub__list {
  display: flex;
  justify-content: center;
  padding: 64px 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
}
</style>
