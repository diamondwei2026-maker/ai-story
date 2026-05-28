<template>
  <a-config-provider :theme="antdTheme">
    <AppLayout>
      <CanvasBackground />
      <router-view />
    </AppLayout>
  </a-config-provider>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue';
import CanvasBackground from '@/components/CanvasBackground.vue';
import { antdTheme } from '@/styles/antd-theme';
</script>
