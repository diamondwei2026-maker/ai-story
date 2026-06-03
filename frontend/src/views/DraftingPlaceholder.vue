<template>
  <div data-testid="drafting-placeholder" class="drafting-placeholder">
    <h2 class="section-title">正文迭代</h2>
    <a-card class="drafting-card">
      <p>正文迭代功能开发中，敬请期待。</p>
      <p class="drafting-hint">已完成 BEATS 阶段的项目可由此进入逐章创作。</p>
    </a-card>
  </div>
</template>

<style scoped>
.drafting-placeholder {
  padding: var(--space-md) 0;
}

.drafting-card {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.drafting-hint {
  margin-top: var(--space-sm);
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
