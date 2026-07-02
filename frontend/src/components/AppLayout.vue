<template>
  <div class="app-layout">
    <div class="app-layout__body">
      <slot />
    </div>
    <footer class="app-layout__footer">
      <slot name="footer">
        <span class="app-layout__footer-text">每一段故事，都始于一个文字。</span>
      </slot>
    </footer>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-layout__body {
  flex: 1;
}

.app-layout__footer {
  border-top: 1px solid #e5e7eb;
  padding: 12px 24px;
  text-align: center;
  color: #9ca3af;
  background: #fff;
}

.app-layout__footer-text {
  font-style: italic;
  font-size: var(--font-size-caption);
}
</style>
