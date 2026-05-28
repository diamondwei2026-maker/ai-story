<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-layout__header">
      <slot name="header">
        <div class="app-layout__brand">
          <span class="app-layout__brand-mark serif-accent">文</span>
          <span class="app-layout__brand-text">NovelCraft Pro</span>
        </div>
      </slot>
    </a-layout-header>
    <a-layout-content class="app-layout__body">
      <slot />
    </a-layout-content>
    <a-layout-footer class="app-layout__footer">
      <slot name="footer">
        <span class="app-layout__footer-text serif-accent">每一段故事，都始于一个文字。</span>
      </slot>
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-layout__header {
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  height: 56px;
  line-height: 56px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-layout__brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.app-layout__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.app-layout__brand-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
}

.app-layout__body {
  padding: var(--space-xl) var(--space-lg);
}

.app-layout__footer {
  border-top: 1px solid var(--color-border);
  padding: 12px var(--space-lg);
  text-align: center;
  color: var(--color-text-muted);
  background: var(--color-surface);
  height: 40px;
  line-height: 40px;
}

.app-layout__footer-text {
  font-style: italic;
  font-size: var(--font-size-caption);
  color: var(--color-text-muted);
}
</style>
