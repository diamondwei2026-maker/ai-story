<template>
  <div class="project-hub">
    <h1 class="project-hub__title">我的项目</h1>
    <div class="project-hub__toolbar">
      <button data-testid="create-project-btn" class="project-hub__create-btn">
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
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.project-hub {
  max-width: 900px;
  margin: 0 auto;
}

.project-hub__title {
  font-size: 28px;
  color: var(--color-text-primary);
  margin-bottom: 24px;
  text-align: center;
}

.project-hub__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.project-hub__create-btn {
  padding: 8px 20px;
  background-color: var(--color-gold);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.project-hub__create-btn:hover {
  opacity: 0.9;
}

.project-hub__empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 48px 0;
  font-size: 15px;
}
</style>
