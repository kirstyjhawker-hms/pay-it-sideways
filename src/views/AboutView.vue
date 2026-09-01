<script setup lang="ts">
import { ref } from 'vue'
import { analyticsConsent, setAnalyticsConsent, track } from '../lib/analytics'

const analyticsChoice = ref<boolean | null>(analyticsConsent())
const analyticsSaved = ref(false)

function chooseAnalytics(allowed: boolean): void {
  analyticsSaved.value = setAnalyticsConsent(allowed)
  analyticsChoice.value = analyticsSaved.value ? allowed : null
  if (allowed && analyticsSaved.value) track('app_open')
}
</script>

<template>
  <main class="screen about-screen">
    <header class="about-hero">
      <p class="eyebrow">The quiet details matter</p>
      <h1>Kindness without surveillance.</h1>
      <p class="lead">Pay It Sideways is designed to help one private message inspire another—not to build a public profile of anybody.</p>
    </header>

    <section class="about-section" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <p><strong>Pay It Sideways</strong> lets you send someone a genuine note of appreciation, optionally with claimable NIM in the same private link. You never need to ask for their wallet address.</p>
      <p class="about-callout">There is never an obligation to continue a chain or attach money. Message-only participation is complete participation.</p>
    </section>

    <section class="about-section" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <h3>What is stored</h3>
      <ul>
        <li>The appreciation reason and positive message you submit.</li>
        <li>An unguessable recipient-link hash, chain relationship, and creation time.</li>
        <li>For NIM gifts: the amount, network, temporary public gift address, and public funding/claim transaction results.</li>
        <li>While a claim is settling, its signed transaction and hash are stored for idempotent retry. That transaction contains the chosen destination address, which becomes public on-chain if confirmed; the pending raw copy is deleted after confirmation or safe expiry replacement.</li>
        <li>The one-use private gift key stays in the fragment of the shared link. A recovery copy remains in browser storage on the sender’s device. Browser URL fragments and that recovery copy are never sent to our database.</li>
        <li>After NIM funding, an unfinished draft temporarily keeps the note, link token and gift key in browser storage until the private link is safely saved. This prevents a reload or network interruption from prompting a second payment.</li>
        <li>The recent-links list is also device-only. It stores the random token, creation time and whether NIM is attached—not the note’s words. Clearing site data removes the list and recovery keys.</li>
        <li>Whether the recipient chose “keep” or reported the message.</li>
      </ul>
      <h3>Why it is stored</h3>
      <p>Only to deliver the private recipient experience, let a recipient continue the correct chain, prevent duplicate payment records, and calculate anonymous chain totals.</p>
      <h3>What is public</h3>
      <p>NIM transactions are recorded on the public Nimiq blockchain. The app does not publicly display wallet addresses. Chain views show counts and summed NIM amounts only; they never expose message text or individual rankings.</p>
      <h3>Who can read a message</h3>
      <p>Anyone who has its long, unguessable recipient link. Treat that link like a private letter and share it only with the intended recipient.</p>
      <p>If NIM is attached, anyone with the complete link can also claim that gift. Do not post or forward it publicly.</p>
      <h3>Removal</h3>
      <p>The recipient link includes a report control. Reporting immediately erases the stored reason and message. If NIM is still attached, the redacted link remains usable only to claim or pass that gift so reporting cannot strand money.</p>
      <h3>Retention</h3>
      <p>A private message remains available until its recipient reports it; there is no automatic expiry in this competition release. Reporting removes the words but retains non-content chain and transaction integrity data. Public blockchain transactions cannot be erased by this app.</p>
      <h3>Analytics</h3>
      <p>Optional analytics count only basic product actions, grouped by day. They contain no message text, recipient references, wallet addresses, transaction identifiers, cookies, or advertising trackers. Analytics are off unless you choose to allow them.</p>
      <details class="analytics-details">
        <summary>See the exact events counted</summary>
        <p>App opened; creation started; message completed; payment option selected; Sideways created; sharing started; recipient opened; recipient kept; continuation started or completed; words-only used; payment used.</p>
      </details>
      <fieldset class="consent-choice">
        <legend>Allow anonymous usage counts?</legend>
        <button type="button" :class="{ selected: analyticsChoice === true }" :aria-pressed="analyticsChoice === true" @click="chooseAnalytics(true)">Allow anonymous counts</button>
        <button type="button" :class="{ selected: analyticsChoice === false }" :aria-pressed="analyticsChoice === false" @click="chooseAnalytics(false)">No thanks</button>
      </fieldset>
      <p v-if="analyticsSaved" class="success-message" role="status">Your analytics preference is saved on this device.</p>
    </section>

    <section class="about-section" aria-labelledby="terms-title">
      <h2 id="terms-title">Terms</h2>
      <ul>
        <li>Use the app only for lawful, respectful messages to people you know.</li>
        <li>Do not use it for harassment, threats, impersonation, spam, or unwanted financial solicitation.</li>
        <li>Funding and claiming NIM gifts creates final public blockchain transactions. Check the amount carefully before confirming.</li>
        <li>An attached gift is held by a temporary, one-use Nimiq account controlled by the complete private link—not by Pay It Sideways.</li>
        <li>Anyone with the complete recipient link can control an unclaimed gift. Pay It Sideways cannot recover a lost, leaked, or incorrectly shared link.</li>
        <li>A recipient may report a message, which removes it from the recipient link.</li>
      </ul>
      <p>This is a positive social utility, not therapy, financial advice, or an emergency service.</p>
    </section>

    <RouterLink class="button button--secondary button--wide" to="/">Return home</RouterLink>
  </main>
</template>
