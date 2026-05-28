<template>
  <a-layout class="app-layout">
    <a-layout-header v-if="$slots.header" class="app-layout__header">
      <slot name="header" />
    </a-layout-header>
    <a-layout-content class="app-layout__body">
      <slot />
    </a-layout-content>
    <a-layout-footer v-if="$slots.footer" class="app-layout__footer">
      <slot name="footer" />
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
  padding: 0 24px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  height: auto;
  line-height: unset;
  display: flex;
  align-items: center;
}

.app-layout__body {
  padding: 24px;
}

.app-layout__footer {
  border-top: 1px solid var(--color-border);
  padding: 12px 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
}
</style>
