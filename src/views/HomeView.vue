<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNimiqProvider, nimiqPayDeepLink } from '../lib/nimiq'
import { track } from '../lib/analytics'
import { listSentLinks } from '../lib/sentLinks'
import { t } from '../lib/i18n'

type ConnectionState = 'ready' | 'offline'
// Social links commonly open in a normal browser. Lead with the useful,
// truthful fallback while the SDK checks for an injected Nimiq provider.
const connectionState = ref<ConnectionState>('offline')
const consensusEstablished = ref(false)
const hasSentLinks = ref(false)
const isInsideNimiqPay = Boolean(window.nimiqPay)
const openInNimiqPayUrl = nimiqPayDeepLink(new URL('/create', window.location.origin).toString())

const walletLabel = computed(() => {
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
      <p class="eyebrow">{{ t('homeEyebrow') }}</p>
      <h1 id="home-heading">{{ t('homeTitle') }}</h1>
      <p class="lead">
        {{ t('homeLead') }}
      </p>
      <p class="audience-note">{{ t('homeAudience') }}</p>

      <ol class="story-beats" aria-label="How Pay It Sideways works">
        <li>
          <span class="story-number" aria-hidden="true">1</span>
          <div><strong>{{ t('thinkTitle') }}</strong><p>{{ t('thinkBody') }}</p></div>
        </li>
        <li>
          <span class="story-number" aria-hidden="true">2</span>
          <div><strong>{{ t('linkTitle') }}</strong><p>{{ t('linkBody') }}</p></div>
        </li>
        <li>
          <span class="story-number" aria-hidden="true">3</span>
          <div><strong>{{ t('chooseTitle') }}</strong><p>{{ t('chooseBody') }}</p></div>
        </li>
      </ol>

      <RouterLink class="button button--primary button--wide" to="/create" @click="track('create_started')">
        {{ t('start') }} <span aria-hidden="true">→</span>
      </RouterLink>
      <a v-if="!isInsideNimiqPay" class="button button--secondary button--wide home-wallet-link" :href="openInNimiqPayUrl">
        Open in Nimiq Pay to include NIM <span aria-hidden="true">↗</span>
      </a>
      <RouterLink v-if="hasSentLinks" class="recent-link" to="/history">{{ t('recent') }}</RouterLink>

      <div class="quiet-status" role="status" aria-live="polite">
        <span class="status-dot" :class="`status-dot--${connectionState}`" aria-hidden="true"></span>
        {{ walletLabel }}
      </div>
    </section>
  </main>
</template>
