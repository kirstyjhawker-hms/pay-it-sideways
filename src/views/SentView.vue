<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { track } from '../lib/analytics'
import { listSentLinks, readGiftSecret, recipientUrl, type SentLink } from '../lib/sentLinks'

const route = useRoute()
const token = computed(() => String(route.params.token))
const giftSecret = computed(() => readGiftSecret(token.value))
const sentSummary = computed<Partial<SentLink>>(() => {
  const indexed = listSentLinks().find((link) => link.token === token.value)
  if (indexed) return indexed
  try {
    const raw = localStorage.getItem(`sideways:${token.value}`) || sessionStorage.getItem(`sideways:${token.value}`)
    return JSON.parse(raw || '{}') as Partial<SentLink>
  } catch { return {} }
})
const missingGiftKey = computed(() => sentSummary.value.includesGift === true && !giftSecret.value)
const shareUrl = computed(() => {
  return recipientUrl(window.location.origin, token.value, giftSecret.value)
})
const shared = ref(false)
const copyFailed = ref(false)

async function share(): Promise<void> {
  track('share_started')
  shared.value = false
  copyFailed.value = false
  const shareData = {
    title: 'Someone sent some kindness your way',
    text: 'A little kindness is waiting for you 💛',
    url: shareUrl.value,
  }
  try {
    if (navigator.share) {
      await navigator.share(shareData)
      shared.value = true
    } else {
      await navigator.clipboard.writeText(shareUrl.value)
      shared.value = true
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      shared.value = true
    } catch {
      copyFailed.value = true
    }
  }
}

async function copyLink(): Promise<void> {
  shared.value = false
  copyFailed.value = false
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    shared.value = true
  } catch {
    copyFailed.value = true
  }
}
</script>

<template>
  <main class="screen centered-screen">
    <section class="completion" aria-labelledby="sent-title">
      <div class="completion-mark" aria-hidden="true">↗</div>
      <p class="eyebrow">It’s ready</p>
      <h1 id="sent-title">Your kindness has somewhere to go.</h1>
      <p class="lead">Share this private link with the person you wrote it for. If NIM is attached, this same link is how they claim it.</p>
      <p v-if="giftSecret" class="privacy-note">The complete claim link is recoverable on this device so you can share it again. Anyone with that complete link can claim the attached NIM—send it only to the intended person.</p>
      <p v-if="giftSecret" class="privacy-note">If it goes to the wrong person, use Recent links to open the recipient view and reclaim the gift into your own account before anyone else claims it.</p>
      <p v-if="missingGiftKey" class="error-message" role="alert">The private gift key is missing on this device. Do not share this incomplete link.</p>
      <p v-if="sentSummary.includesGift && sentSummary.transactionHash" class="verified-badge"><span aria-hidden="true">✓</span> Funding verified on Nimiq</p>
      <button class="button button--primary button--wide" type="button" :disabled="missingGiftKey" @click="share">
        Share with them <span aria-hidden="true">↗</span>
      </button>
      <button class="button button--secondary button--wide" type="button" :disabled="missingGiftKey" @click="copyLink">Copy private link</button>
      <p v-if="shared" class="success-message" role="status">Link copied.</p>
      <div v-if="copyFailed" class="manual-link">
        <label for="share-link">Copy this private link</label>
        <input id="share-link" :value="shareUrl" readonly @focus="($event.target as HTMLInputElement).select()" />
      </div>
      <RouterLink v-if="sentSummary.trailToken" class="button button--secondary button--wide" :to="{ name: 'trail', params: { token: sentSummary.trailToken } }">Watch its private trail</RouterLink>
      <RouterLink class="text-link" to="/create">Send another note</RouterLink>
    </section>
  </main>
</template>
