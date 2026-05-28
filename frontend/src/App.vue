<template>
  <a-config-provider :theme="antdTheme">
    <AppLayout>
      <CanvasBackground />
      <router-view v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </AppLayout>
  </a-config-provider>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue';
import CanvasBackground from '@/components/CanvasBackground.vue';
import { antdTheme } from '@/styles/antd-theme';
</script>
