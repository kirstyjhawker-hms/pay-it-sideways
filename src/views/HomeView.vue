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
      <p class="eyebrow">One kind moment can start another.</p>
      <h1 id="home-heading">It starts with someone who showed up.</h1>
      <p class="lead">
        Pay It Sideways turns something you appreciate into a private story they get to continue—or simply keep.
      </p>

      <ol class="story-beats" aria-label="How Pay It Sideways works">
        <li>
          <span class="story-number" aria-hidden="true">1</span>
          <div><strong>Think of one person.</strong><p>Write the thing you appreciate but do not always say.</p></div>
        </li>
        <li>
          <span class="story-number" aria-hidden="true">2</span>
          <div><strong>Send one private link.</strong><p>Words are enough. Add NIM if you want—no wallet address needed.</p></div>
        </li>
        <li>
          <span class="story-number" aria-hidden="true">3</span>
          <div><strong>They choose what follows.</strong><p>Keep it, claim it, or pass fresh kindness to someone else.</p></div>
        </li>
      </ol>

      <RouterLink class="button button--primary button--wide" to="/create" @click="track('create_started')">
        Start with someone <span aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink v-if="hasSentLinks" class="recent-link" to="/history">Reopen a recent private link</RouterLink>

      <div class="quiet-status" role="status" aria-live="polite">
        <span class="status-dot" :class="`status-dot--${connectionState}`" aria-hidden="true"></span>
        {{ walletLabel }}
      </div>
    </section>
  </main>
</template>
