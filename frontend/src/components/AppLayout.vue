<template>
  <div class="app-layout">
    <header v-if="$slots.header" class="app-layout__header">
      <slot name="header" />
    </header>
    <main class="app-layout__body">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="app-layout__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-warm);
  color: var(--color-text-primary);
}

.app-layout__header {
  border-bottom: 1px solid var(--color-gold);
  padding: 0 24px;
}

.app-layout__body {
  flex: 1;
  padding: 24px;
}

.app-layout__footer {
  border-top: 1px solid var(--color-gold);
  padding: 12px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
