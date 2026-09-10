<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import KindnessTrail from '../components/KindnessTrail.vue'
import { getTrail } from '../lib/api'
import type { TrailResponse } from '../types'

const route = useRoute()
const token = computed(() => String(route.params.token))
const data = ref<TrailResponse>()
const loading = ref(true)
const errorMessage = ref('')
const acknowledgementTotal = computed(() => {
  const counts = data.value?.chain.acknowledgements
  return counts ? counts.madeMeSmile + counts.neededThis + counts.thankYou : 0
})
const trailStatus = computed(() => {
  if (!data.value) return ''
  if (acknowledgementTotal.value > 0) return 'A private thank-you came back.'
  if (data.value.chain.positiveMessages > 1) return 'Your kindness was passed onwards.'
  if (data.value.chain.linksOpened > 0) return 'Your private note has been opened.'
  return 'Your private note is waiting to be opened.'
})

async function loadTrail(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await getTrail(token.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This private trail could not be opened.'
  } finally {
    loading.value = false
  }
}

onMounted(loadTrail)

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
</script>

<template>
  <main class="screen trail-screen">
    <nav class="flow-nav" aria-label="Kindness trail navigation">
      <RouterLink class="back-button" to="/history"><span aria-hidden="true">←</span> Recent links</RouterLink>
    </nav>
    <div v-if="loading" class="loading-state" role="status"><span class="loading-heart" aria-hidden="true">💛</span><p>Following the trail…</p></div>
    <section v-else-if="errorMessage" class="empty-state" role="alert">
      <h1>This trail isn’t available.</h1><p>{{ errorMessage }}</p>
      <button class="button button--primary" type="button" @click="loadTrail">Try again</button>
      <RouterLink class="button button--secondary" to="/">Return home</RouterLink>
    </section>
    <section v-else-if="data" class="trail-dashboard" aria-labelledby="trail-title">
      <p class="eyebrow">Your kindness trail</p>
      <h1 id="trail-title">Look where one moment went.</h1>
      <p class="lead">You can see the ripple without seeing anyone’s private words, wallet, or choices.</p>
      <div class="trail-status" role="status"><span aria-hidden="true">💛</span><strong>{{ trailStatus }}</strong></div>
      <KindnessTrail :links-opened="data.chain.linksOpened" />
      <dl class="trail-stats">
        <div><dt>Private links opened</dt><dd>{{ data.chain.linksOpened }}</dd></div>
        <div><dt>Notes created</dt><dd>{{ data.chain.positiveMessages }}</dd></div>
        <div><dt>Words-only acts</dt><dd>{{ data.chain.messageOnlyPasses }}</dd></div>
        <div><dt>Notes carrying NIM</dt><dd>{{ data.chain.nimGiftCount }}</dd></div>
        <div v-if="data.chain.nimPassed > 0"><dt>NIM introduced to this chain</dt><dd>{{ data.chain.nimPassed }} NIM</dd></div>
      </dl>
      <section v-if="acknowledgementTotal" class="trail-acknowledgements" aria-labelledby="trail-replies-title">
        <p class="eyebrow">Private responses</p>
        <h2 id="trail-replies-title">Your words reached somebody.</h2>
        <ul>
          <li v-if="data.chain.acknowledgements.madeMeSmile"><span>This made me smile</span><strong>{{ data.chain.acknowledgements.madeMeSmile }}</strong></li>
          <li v-if="data.chain.acknowledgements.neededThis"><span>I needed this today</span><strong>{{ data.chain.acknowledgements.neededThis }}</strong></li>
          <li v-if="data.chain.acknowledgements.thankYou"><span>Thank you 💛</span><strong>{{ data.chain.acknowledgements.thankYou }}</strong></li>
        </ul>
        <p>Responses are intentionally limited and anonymous. No reply text, identity or wallet is revealed.</p>
      </section>
      <p class="trail-dates">Started {{ dateLabel(data.chain.startedAt) }}<template v-if="data.chain.lastContinuedAt !== data.chain.startedAt"> · last continued {{ dateLabel(data.chain.lastContinuedAt) }}</template></p>
      <p class="privacy-note">This trail token unlocks anonymous totals only. It cannot open messages, claim gifts, identify recipients, or reveal Nimiq accounts.</p>
      <p class="privacy-note">Passing creates a new note. Forwarding the same private link does not. Relayed NIM is counted once, not again at every step.</p>
      <RouterLink class="button button--primary button--wide" to="/create">Is there somebody else you’ve been meaning to thank?</RouterLink>
    </section>
  </main>
</template>
