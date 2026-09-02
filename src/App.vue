<script setup lang="ts">
import { onMounted } from 'vue'
import { track } from './lib/analytics'
import { t } from './lib/i18n'

onMounted(() => track('app_open'))
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="Pay It Sideways home">
        <span class="brand-mark" aria-hidden="true">↗</span>
        <span>Pay It Sideways</span>
      </RouterLink>
    </header>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <footer class="site-footer">
      <span>{{ t('privateDefault') }}</span>
      <span aria-hidden="true">·</span>
      <RouterLink to="/about">{{ t('about') }}</RouterLink>
    </footer>
  </div>
</template>
