<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNimiqProvider } from '../lib/nimiq'
import { track } from '../lib/analytics'
import { listSentLinks } from '../lib/sentLinks'

type ConnectionState = 'checking' | 'ready' | 'offline'
const connectionState = ref<ConnectionState>('checking')
const consensusEstablished = ref(false)
const hasSentLinks = ref(false)

const walletLabel = computed(() => {
  if (connectionState.value === 'checking') return 'Checking Nimiq Pay…'
  if (connectionState.value === 'ready' && consensusEstablished.value) return 'Ready inside Nimiq Pay'
  if (connectionState.value === 'ready') return 'Nimiq Pay is syncing'
  return 'Words work anywhere'
})

onMounted(async () => {
  hasSentLinks.value = listSentLinks().length > 0
  try {
    const provider = await getNimiqProvider()
    consensusEstablished.value = await provider.isConsensusEstablished()
    connectionState.value = 'ready'
  } catch {
    connectionState.value = 'offline'
  }
})
</script>

<template>
  <main class="screen home-screen">
    <div class="path-art" aria-hidden="true">
      <i></i><i></i><i></i>
    </div>

    <section class="home-copy" aria-labelledby="home-heading">
      <p class="eyebrow">A note can travel further than you think.</p>
      <h1 id="home-heading">Make someone’s day a little brighter.</h1>
      <p class="lead">
        Send a genuine note of appreciation. Add a little NIM if you want to.
        Money is optional. Kindness isn’t.
      </p>

      <RouterLink class="button button--primary button--wide" to="/create" @click="track('create_started')">
        Send some kindness <span aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink v-if="hasSentLinks" class="recent-link" to="/history">Reopen a recent private link</RouterLink>

      <div class="quiet-status" role="status" aria-live="polite">
        <span class="status-dot" :class="`status-dot--${connectionState}`" aria-hidden="true"></span>
        {{ walletLabel }}
      </div>
    </section>
  </main>
</template>
