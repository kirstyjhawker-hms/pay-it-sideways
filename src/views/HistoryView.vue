<script setup lang="ts">
import { computed } from 'vue'
import { listSentLinks, readGiftSecret } from '../lib/sentLinks'

const links = computed(() => listSentLinks())

function createdLabel(createdAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt))
}

function recoverable(token: string, includesGift: boolean): boolean {
  return !includesGift || Boolean(readGiftSecret(token))
}
</script>

<template>
  <main class="screen history-screen">
    <nav class="flow-nav" aria-label="Recent links navigation">
      <RouterLink class="back-button" to="/"><span aria-hidden="true">←</span> Home</RouterLink>
    </nav>
    <section aria-labelledby="history-title">
      <p class="eyebrow">Only on this device</p>
      <h1 id="history-title">Your recent private links.</h1>
      <p class="lead">Reopen a link to share it again. The note’s words are not stored in this list or sent to the server.</p>

      <div v-if="links.length" class="history-list">
        <article v-for="link in links" :key="link.token" class="history-card">
          <div>
            <strong>{{ link.includesGift ? 'Private NIM gift' : 'Kindness note' }}</strong>
            <p>{{ createdLabel(link.createdAt) }}</p>
          </div>
          <div class="history-actions">
            <RouterLink v-if="link.trailToken" class="button button--secondary" :to="{ name: 'trail', params: { token: link.trailToken } }">Watch trail</RouterLink>
            <RouterLink v-if="recoverable(link.token, link.includesGift)" class="button button--secondary" :to="{ name: 'sent', params: { token: link.token } }">Open &amp; share</RouterLink>
            <p v-else class="history-warning">Claim key missing—this device cannot rebuild the funded link.</p>
          </div>
        </article>
      </div>
      <div v-else class="history-empty">
        <p>No links have been saved on this device yet.</p>
        <RouterLink class="button button--primary button--wide" to="/create">Send some kindness</RouterLink>
      </div>
      <p class="privacy-note">Clearing this browser’s site data removes this list and any locally recoverable gift keys. Never share a funded private link publicly.</p>
    </section>
  </main>
</template>
