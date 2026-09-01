<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createSideways, detectNimiqNetwork } from '../lib/api'
import { getNimiqProvider } from '../lib/nimiq'
import { generateGiftKey, type GiftKey, type NimiqNetwork } from '../lib/gift'
import { parseNimToLuna } from '../lib/money'
import { track } from '../lib/analytics'

type PaymentChoice = 'words' | 'nim'
type SubmissionState = 'idle' | 'confirming' | 'saving'

interface PendingGift {
  recipientToken: string
  reason: string
  message: string
  nimAmount: string
  parentToken?: string
  giftKey: GiftKey
  transactionHash?: string
  network?: NimiqNetwork
}

const pendingGiftKey = 'pay-it-sideways:pending-gift'

function generateRecipientToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const route = useRoute()
const router = useRouter()
const step = ref(1)
const reason = ref('')
const message = ref('')
const paymentChoice = ref<PaymentChoice>('words')
const nimAmount = ref(typeof route.query.amount === 'string' ? route.query.amount : '1')
const submissionState = ref<SubmissionState>('idle')
const completedTransaction = ref<string>()
const giftKey = ref<GiftKey>()
const giftNetwork = ref<NimiqNetwork>()
const recipientToken = ref(generateRecipientToken())
const errorMessage = ref('')
const messageInput = ref<HTMLTextAreaElement>()

const parentToken = computed(() => typeof route.query.parent === 'string' ? route.query.parent : undefined)
const isContinuation = computed(() => Boolean(parentToken.value))
const reasonReady = computed(() => reason.value.trim().length >= 3)
const messageReady = computed(() => message.value.trim().length >= 8)
const lunaValue = computed(() => parseNimToLuna(nimAmount.value))
const paymentReady = computed(() => paymentChoice.value === 'words' || lunaValue.value !== null)
const submitting = computed(() => submissionState.value !== 'idle')

const starters = [
  'I don’t think I tell you enough…',
  'Something I really appreciate about you is…',
  'Just in case nobody has told you today…',
  'I hope this makes your day a little brighter…',
  'You made a difference to me when…',
]

function persistPendingGift(): void {
  if (!giftKey.value) return
  const pending: PendingGift = {
    recipientToken: recipientToken.value,
    reason: reason.value,
    message: message.value,
    nimAmount: nimAmount.value,
    parentToken: parentToken.value,
    giftKey: giftKey.value,
    transactionHash: completedTransaction.value,
    network: giftNetwork.value,
  }
  try {
    localStorage.setItem(pendingGiftKey, JSON.stringify(pending))
  } catch {
    sessionStorage.setItem(pendingGiftKey, JSON.stringify(pending))
  }
}

function clearPendingGift(): void {
  try { localStorage.removeItem(pendingGiftKey) } catch { /* Storage may be unavailable. */ }
  try { sessionStorage.removeItem(pendingGiftKey) } catch { /* Storage may be unavailable. */ }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(pendingGiftKey) || sessionStorage.getItem(pendingGiftKey)
    if (!raw) return
    const pending = JSON.parse(raw) as Partial<PendingGift>
    if (!pending.giftKey?.secret || !pending.giftKey.address || !pending.reason || !pending.message || !pending.nimAmount || !pending.recipientToken) return
    reason.value = pending.reason
    message.value = pending.message
    nimAmount.value = pending.nimAmount
    paymentChoice.value = 'nim'
    giftKey.value = pending.giftKey
    completedTransaction.value = pending.transactionHash
    giftNetwork.value = pending.network
    recipientToken.value = pending.recipientToken
    step.value = 4
    errorMessage.value = pending.transactionHash
      ? 'Your funded private gift was recovered on this device. Tap below to finish making its link—no second payment will be made.'
      : 'Your unfinished private gift was recovered on this device.'
  } catch {
    clearPendingGift()
  }
})

async function goToMessage(): Promise<void> {
  if (!reasonReady.value) return
  step.value = 2
  await nextTick()
  messageInput.value?.focus()
}

function goToPayment(): void {
  if (messageReady.value) {
    track('message_completed')
    step.value = 3
  }
}

function goToReview(): void {
  if (paymentReady.value) step.value = 4
}

function useStarter(starter: string): void {
  if (message.value.trim()) return
  message.value = `${starter} `
  nextTick(() => messageInput.value?.focus())
}

function choosePayment(choice: PaymentChoice): void {
  if (completedTransaction.value && choice === 'words') {
    errorMessage.value = 'This NIM has already funded its private gift. Finish saving the link so the money is not stranded.'
    return
  }
  paymentChoice.value = choice
  errorMessage.value = ''
  completedTransaction.value = undefined
  giftKey.value = undefined
  giftNetwork.value = undefined
  if (choice === 'words') clearPendingGift()
  track('payment_option_selected')
}

function paymentError(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const response = error as { error?: { message?: string; type?: string } }
    return response.error?.message || 'Nimiq Pay could not complete that transaction.'
  }
  if (error instanceof Error) {
    if (error.name === 'PermissionDeniedError' || /denied|cancel/i.test(error.message)) {
      return 'No payment was sent. Your note is still here whenever you’re ready.'
    }
    return error.message
  }
  return 'Nimiq Pay could not complete that transaction.'
}

async function sendNim(): Promise<string> {
  if (lunaValue.value === null) throw new Error('Check the NIM amount.')
  const provider = await getNimiqProvider()
  giftKey.value ??= await generateGiftKey()
  persistPendingGift()
  const result = await provider.sendBasicTransaction({
    recipient: giftKey.value.address,
    value: lunaValue.value,
  })
  if (typeof result !== 'string') throw result
  completedTransaction.value = result
  persistPendingGift()
  return result
}

async function findPaymentNetwork(transactionHash: string): Promise<NimiqNetwork> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const network = await detectNimiqNetwork(transactionHash)
    if (network) return network
    await new Promise((resolve) => window.setTimeout(resolve, 750))
  }
  throw new Error('The NIM was sent, but its network confirmation is still settling. Tap below to retry saving the private link.')
}

async function submit(): Promise<void> {
  if (submitting.value || !reasonReady.value || !messageReady.value || !paymentReady.value) return
  errorMessage.value = ''

  try {
    if (paymentChoice.value === 'nim' && !completedTransaction.value) {
      submissionState.value = 'confirming'
      completedTransaction.value = await sendNim()
    }
    if (paymentChoice.value === 'nim' && completedTransaction.value && !giftNetwork.value) {
      submissionState.value = 'saving'
      giftNetwork.value = await findPaymentNetwork(completedTransaction.value)
      persistPendingGift()
    }

    submissionState.value = 'saving'
    const amount = paymentChoice.value === 'nim' && lunaValue.value !== null
      ? lunaValue.value / 100_000
      : undefined
    const created = await createSideways({
      recipientToken: recipientToken.value,
      reason: reason.value,
      message: message.value,
      parentToken: parentToken.value,
      includesPayment: paymentChoice.value === 'nim',
      paymentAmount: amount,
      paymentLuna: paymentChoice.value === 'nim' ? lunaValue.value ?? undefined : undefined,
      transactionHash: completedTransaction.value,
      paymentMode: paymentChoice.value === 'nim' ? 'claimable' : undefined,
      paymentNetwork: paymentChoice.value === 'nim' ? giftNetwork.value : undefined,
      giftAddress: paymentChoice.value === 'nim' ? giftKey.value?.address : undefined,
    })
    track('sideways_created')
    track(paymentChoice.value === 'nim' ? 'payment_used' : 'message_only_used')
    if (parentToken.value) track('continuation_completed')
    const sentSummary = JSON.stringify({
      reason: reason.value.trim(),
      message: message.value.trim(),
      includesGift: paymentChoice.value === 'nim',
    })
    try { localStorage.setItem(`sideways:${created.token}`, sentSummary) } catch { sessionStorage.setItem(`sideways:${created.token}`, sentSummary) }
    if (paymentChoice.value === 'nim' && giftKey.value) {
      try { localStorage.setItem(`gift:${created.token}`, giftKey.value.secret) } catch { sessionStorage.setItem(`gift:${created.token}`, giftKey.value.secret) }
    }
    clearPendingGift()
    await router.replace({ name: 'sent', params: { token: created.token } })
  } catch (error) {
    if (completedTransaction.value) {
      errorMessage.value = 'Your NIM was sent, but the private link was not saved yet. Tap below to retry—no second payment will be made.'
    } else {
      errorMessage.value = paymentError(error)
    }
  } finally {
    submissionState.value = 'idle'
  }
}
</script>

<template>
  <main class="screen create-screen">
    <nav class="flow-nav" aria-label="Creation progress">
      <button v-if="step > 1" class="back-button" type="button" :disabled="submitting" @click="step--">
        <span aria-hidden="true">←</span> Back
      </button>
      <RouterLink v-else class="back-button" to="/"><span aria-hidden="true">←</span> Home</RouterLink>
      <span class="step-count">{{ step }} of 4</span>
    </nav>

    <Transition name="step" mode="out-in">
      <section v-if="step === 1" key="reason" class="flow-card" aria-labelledby="reason-title">
        <p class="eyebrow">{{ isContinuation ? 'Keep it moving' : 'Start with the person' }}</p>
        <h1 id="reason-title">Why did this person come to mind?</h1>
        <p class="supporting">What have they done, or what do you appreciate about them?</p>
        <label class="field-label" for="reason">Your reason</label>
        <textarea id="reason" v-model="reason" rows="4" maxlength="160" placeholder="You always check in when things get hectic." @keydown.ctrl.enter="goToMessage"></textarea>
        <div class="field-meta"><span>Just enough to make it personal.</span><span>{{ reason.length }}/160</span></div>
        <button class="button button--primary button--wide" type="button" :disabled="!reasonReady" @click="goToMessage">Next <span aria-hidden="true">→</span></button>
      </section>

      <section v-else-if="step === 2" key="message" class="flow-card" aria-labelledby="message-title">
        <p class="eyebrow">Now, the words</p>
        <h1 id="message-title">What would you like them to hear today?</h1>
        <div class="starter-row" aria-label="Optional message starters">
          <button v-for="starter in starters" :key="starter" type="button" @click="useStarter(starter)">{{ starter }}</button>
        </div>
        <label class="field-label" for="message">Your message</label>
        <textarea id="message" ref="messageInput" v-model="message" rows="7" maxlength="600" placeholder="I hope you know how appreciated you are." @keydown.ctrl.enter="goToPayment"></textarea>
        <div class="field-meta"><span>Write it in your own voice.</span><span>{{ message.length }}/600</span></div>
        <button class="button button--primary button--wide" type="button" :disabled="!messageReady" @click="goToPayment">Next <span aria-hidden="true">→</span></button>
      </section>

      <section v-else-if="step === 3" key="payment" class="flow-card" aria-labelledby="payment-title">
        <p class="eyebrow">The words already count</p>
        <h1 id="payment-title">Add a little something?</h1>
        <p class="supporting">{{ isContinuation ? 'Send the same amount, more, less, or just your words. Completely optional.' : 'Completely optional. The message is the heart of this.' }}</p>

        <div class="payment-choices">
          <button type="button" :class="{ selected: paymentChoice === 'words' }" :aria-pressed="paymentChoice === 'words'" @click="choosePayment('words')">
            <span aria-hidden="true">💌</span><div><strong>Words are enough</strong><p>Send the note with no payment.</p></div><i aria-hidden="true">{{ paymentChoice === 'words' ? '✓' : '' }}</i>
          </button>
          <button type="button" :class="{ selected: paymentChoice === 'nim' }" :aria-pressed="paymentChoice === 'nim'" @click="choosePayment('nim')">
            <span class="nim-symbol" aria-hidden="true">N</span><div><strong>Add a little NIM</strong><p>They can claim it from the private link.</p></div><i aria-hidden="true">{{ paymentChoice === 'nim' ? '✓' : '' }}</i>
          </button>
        </div>

        <div v-if="paymentChoice === 'nim'" class="payment-fields">
          <div class="amount-presets" aria-label="Choose a NIM amount">
            <button v-for="amount in ['0.5', '1', '2', '5']" :key="amount" type="button" :class="{ selected: nimAmount === amount }" @click="nimAmount = amount">{{ amount }} NIM</button>
          </div>
          <label class="field-label" for="nim-amount">NIM amount</label>
          <div class="amount-input"><input id="nim-amount" v-model="nimAmount" inputmode="decimal" autocomplete="off" aria-describedby="amount-help" /><span>NIM</span></div>
          <p id="amount-help" class="input-help">Up to five decimal places. Maximum 1,000 NIM. You do not need their Nimiq address—the private link carries the gift.</p>
        </div>

        <button class="button button--primary button--wide" type="button" :disabled="!paymentReady" @click="goToReview">Review your note <span aria-hidden="true">→</span></button>
      </section>

      <section v-else key="review" class="flow-card" aria-labelledby="review-title">
        <p class="eyebrow">One last look</p>
        <h1 id="review-title">Ready to send it sideways?</h1>
        <article class="note-preview"><p class="note-reason">{{ reason }}</p><p class="note-message">“{{ message }}”</p></article>

        <div class="words-choice" aria-label="What is attached">
          <span v-if="paymentChoice === 'words'" class="choice-icon" aria-hidden="true">💌</span>
          <span v-else class="nim-symbol" aria-hidden="true">N</span>
          <div>
            <strong>{{ paymentChoice === 'words' ? 'Words are enough' : `${nimAmount} NIM comes with it` }}</strong>
            <p>{{ paymentChoice === 'words' ? 'No payment attached. Every word still counts.' : 'Nimiq Pay will fund a private, one-use gift link.' }}</p>
          </div>
          <span class="choice-check" aria-hidden="true">✓</span>
        </div>

        <p class="privacy-note">The message stays private to anyone with its unguessable link. We count this act anonymously in its chain—never the words you wrote.</p>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="button button--primary button--wide" type="button" :disabled="submitting" @click="submit">
          <span v-if="submissionState === 'confirming'">Confirm in Nimiq Pay…</span>
          <span v-else-if="submissionState === 'saving'">Making the private link…</span>
          <span v-else-if="completedTransaction">Retry saving the link <span aria-hidden="true">→</span></span>
          <span v-else>Send it sideways <span aria-hidden="true">→</span></span>
        </button>
      </section>
    </Transition>
  </main>
</template>
