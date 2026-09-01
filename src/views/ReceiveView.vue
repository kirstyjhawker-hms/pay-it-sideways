<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { broadcastGiftClaim, confirmGiftClaim, getGiftState, getSideways, keepSideways, reportSideways } from '../lib/api'
import type { SidewaysResponse } from '../types'
import { track } from '../lib/analytics'
import { createClaimTransaction, giftSecretFromHash } from '../lib/gift'
import { getNimiqProvider } from '../lib/nimiq'

const route = useRoute()
const router = useRouter()
const token = computed(() => String(route.params.token))
const data = ref<SidewaysResponse>()
const loading = ref(true)
const errorMessage = ref('')
const keeping = ref(false)
const kept = ref(false)
const claimingFor = ref<'keep' | 'pass' | null>(null)
const giftBalance = ref<number | null>()
const giftBlockNumber = ref<number | null>()
const pendingClaimHash = ref<string | null>()
const pendingClaimExpired = ref(false)
const checkingGift = ref(false)
const reportOpen = ref(false)
const reported = ref(false)
const availableAccounts = ref<string[]>([])
const selectingAccount = ref(false)
const accountPickerTitle = ref<HTMLElement>()
const giftSecret = computed(() => {
  void route.hash
  return giftSecretFromHash()
})

const isClaimableGift = computed(() => data.value?.sideways.paymentMode === 'claimable')
const giftIsReady = computed(() => {
  const amount = data.value?.sideways.paymentAmount
  return typeof giftBalance.value === 'number'
    && typeof amount === 'number'
    && giftBalance.value >= Math.round(amount * 100_000)
})

onMounted(async () => {
  try {
    data.value = await getSideways(token.value)
    track('recipient_opened')
    kept.value = data.value.sideways.kept
    reported.value = data.value.sideways.reported
    if (data.value.sideways.paymentMode === 'claimable' && !data.value.sideways.claimed) {
      await refreshGiftBalance()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This kindness link could not be opened.'
  } finally {
    loading.value = false
  }
})

async function refreshGiftBalance(): Promise<void> {
  checkingGift.value = true
  try {
    const state = await getGiftState(token.value)
    giftBalance.value = state.balance
    giftBlockNumber.value = state.blockNumber
    pendingClaimHash.value = state.pendingClaimTransactionHash
    pendingClaimExpired.value = state.pendingClaimExpired
  } catch {
    giftBalance.value = null
    giftBlockNumber.value = null
  } finally {
    checkingGift.value = false
  }
}

function walletError(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const response = error as { error?: { message?: string; type?: string } }
    if (response.error?.type === 'PermissionDeniedError'
      || /denied|cancel/i.test(response.error?.message || '')
    ) return 'No account was selected. The NIM gift is still waiting safely in this private link.'
    return response.error?.message || 'Nimiq Pay could not complete that request.'
  }
  if (error instanceof Error && (error.name === 'PermissionDeniedError' || /denied|cancel/i.test(error.message))) {
    return 'No account was selected. The NIM gift is still waiting safely in this private link.'
  }
  return error instanceof Error ? error.message : 'Nimiq Pay could not complete that request.'
}

function shortAddress(address: string): string {
  const compact = address.replace(/\s/g, '')
  return `${compact.slice(0, 8)}…${compact.slice(-6)}`
}

function markClaimed(transactionHash: string): void {
  if (!data.value) return
  data.value.sideways.claimed = true
  data.value.sideways.claimTransactionHash = transactionHash
  data.value.sideways.claimPending = false
  pendingClaimHash.value = null
  pendingClaimExpired.value = false
  giftBalance.value = 0
  selectingAccount.value = false
}

async function claimGift(recipient?: string): Promise<'claimed' | 'selecting' | 'failed'> {
  if (!data.value || !isClaimableGift.value || data.value.sideways.claimed) return 'claimed'
  const amount = data.value.sideways.paymentAmount
  const network = data.value.sideways.paymentNetwork
  if ((!giftSecret.value && !pendingClaimHash.value) || typeof amount !== 'number' || !network) {
    errorMessage.value = 'This link is missing the private gift key. Ask the sender to share the complete link again.'
    return 'failed'
  }
  if (!pendingClaimHash.value && !giftIsReady.value) {
    await refreshGiftBalance()
    if (!giftIsReady.value) {
      errorMessage.value = giftBalance.value === 0
        ? 'The NIM gift is not available yet. It may still be settling—please try again in a moment.'
        : 'We could not confirm the NIM gift just now. Please try again.'
      return 'failed'
    }
  }

  try {
    let transactionHash = pendingClaimHash.value
    if (transactionHash && pendingClaimExpired.value) {
      const oldClaim = await confirmGiftClaim({ token: token.value, transactionHash })
      if (oldClaim.confirmed) {
        markClaimed(transactionHash)
        return 'claimed'
      }
      if (giftIsReady.value) {
        transactionHash = null
        pendingClaimHash.value = null
        pendingClaimExpired.value = false
      }
    }
    if (!transactionHash) {
      if (!giftSecret.value) throw new Error('This link is missing the private gift key. Ask the sender to share the complete link again.')
      const provider = await getNimiqProvider()
      if (!recipient) {
        const accounts = await provider.listAccounts()
        if (!Array.isArray(accounts) || !accounts[0]) throw accounts
        availableAccounts.value = [...new Set(accounts)]
        if (availableAccounts.value.length > 1) {
          selectingAccount.value = true
          await nextTick()
          accountPickerTitle.value?.focus()
          return 'selecting'
        }
        recipient = availableAccounts.value[0]
      }
      if (giftBlockNumber.value === null || giftBlockNumber.value === undefined) {
        throw new Error('The Nimiq network height is unavailable. Please try again.')
      }
      const claim = await createClaimTransaction({
        secret: giftSecret.value!,
        recipient: recipient!,
        value: Math.round(amount * 100_000),
        validityStartHeight: giftBlockNumber.value,
        network,
      })
      transactionHash = await broadcastGiftClaim({
        token: token.value,
        serializedTransaction: claim.serialized,
      })
      pendingClaimHash.value = transactionHash
      pendingClaimExpired.value = false
    } else {
      transactionHash = await broadcastGiftClaim({ token: token.value })
      pendingClaimHash.value = transactionHash
    }
    let confirmed = false
    for (let attempt = 0; attempt < 15 && !confirmed; attempt += 1) {
      const result = await confirmGiftClaim({ token: token.value, transactionHash })
      confirmed = result.confirmed
      if (!confirmed) await new Promise((resolve) => window.setTimeout(resolve, 1_000))
    }
    if (!confirmed) throw new Error('The claim is saved, but network confirmation is still settling. Tap again to retry safely; no different claim will be created.')
    markClaimed(transactionHash)
    return 'claimed'
  } catch (error) {
    errorMessage.value = walletError(error)
    selectingAccount.value = false
    return 'failed'
  }
}

async function finishAction(action: 'keep' | 'pass'): Promise<void> {
  if (action === 'keep') {
    await keepSideways(token.value)
    kept.value = true
    track('recipient_kept')
    return
  }
  track('continuation_started')
  const amount = data.value?.sideways.paymentAmount
  await router.push({
    name: 'create',
    query: { parent: token.value, ...(typeof amount === 'number' ? { amount: String(amount) } : {}) },
  })
}

async function selectAccount(address: string): Promise<void> {
  const action = claimingFor.value
  if (!action) return
  selectingAccount.value = false
  errorMessage.value = ''
  const result = await claimGift(address)
  if (result === 'claimed') await finishAction(action)
  claimingFor.value = null
  keeping.value = false
}

async function keep(): Promise<void> {
  if (keeping.value || kept.value) return
  keeping.value = true
  claimingFor.value = 'keep'
  errorMessage.value = ''
  try {
    const result = await claimGift()
    if (result !== 'claimed') return
    await finishAction('keep')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'We could not save that choice just now.'
  } finally {
    if (!selectingAccount.value) keeping.value = false
    if (!selectingAccount.value) claimingFor.value = null
  }
}

async function passSideways(): Promise<void> {
  if (claimingFor.value) return
  claimingFor.value = 'pass'
  errorMessage.value = ''
  try {
    const result = await claimGift()
    if (result !== 'claimed') return
    await finishAction('pass')
  } finally {
    if (!selectingAccount.value) claimingFor.value = null
  }
}

async function report(): Promise<void> {
  try {
    await reportSideways(token.value)
    reported.value = true
    reportOpen.value = false
    if (data.value) {
      data.value.sideways.reported = true
      data.value.sideways.reason = ''
      data.value.sideways.message = ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'We could not report that message just now.'
  }
}
</script>

<template>
  <main class="screen receive-screen">
    <div v-if="loading" class="loading-state" role="status">
      <span class="loading-heart" aria-hidden="true">💛</span>
      <p>Opening something kind…</p>
    </div>

    <section v-else-if="reported && !data" class="empty-state">
      <h1>Thank you for telling us.</h1>
      <p>This message is no longer available from its link.</p>
      <RouterLink class="button button--secondary" to="/">Return home</RouterLink>
    </section>

    <section v-else-if="errorMessage && !data" class="empty-state" role="alert">
      <h1>This note isn’t available.</h1>
      <p>{{ errorMessage }}</p>
      <RouterLink class="button button--secondary" to="/">Return home</RouterLink>
    </section>

    <template v-else-if="data">
      <section class="received-note" aria-labelledby="receive-title">
        <template v-if="reported">
          <p class="receive-kicker">Message reported</p>
          <h1 id="receive-title">The words have been removed.</h1>
          <p v-if="data.sideways.includesPayment && !data.sideways.claimed" class="supporting">The attached NIM remains available so reporting cannot strand money.</p>
        </template>
        <template v-else>
          <p class="receive-kicker">Someone sent some kindness your way <span aria-hidden="true">💛</span></p>
          <h1 id="receive-title">“{{ data.sideways.message }}”</h1>
        </template>
        <div v-if="!reported" class="reason-block">
          <span>Why you came to mind</span>
          <p>{{ data.sideways.reason }}</p>
        </div>
        <div v-if="data.sideways.includesPayment" class="payment-received">
          <span class="nim-symbol" aria-hidden="true">N</span>
          <div>
            <template v-if="data.sideways.paymentMode === 'claimable'">
              <strong v-if="data.sideways.claimed">{{ data.sideways.paymentAmount }} NIM has been claimed.</strong>
              <strong v-else>{{ data.sideways.paymentAmount }} NIM is waiting for you.</strong>
              <p v-if="data.sideways.claimed">It was moved from this private gift link into the chosen Nimiq account.</p>
              <p v-else-if="pendingClaimHash && pendingClaimExpired">The earlier claim did not confirm before it expired. Choose keep or pass below to check it once more and, only if the NIM is still here, replace it safely.</p>
              <p v-else-if="pendingClaimHash">Its claim transaction is settling. Choose keep or pass below to finish confirming it—no second claim will be created.</p>
              <p v-else-if="checkingGift">Confirming the gift on the Nimiq network…</p>
              <p v-else>You do not need to give the sender an address. Choose below and Nimiq Pay will let you select your account.</p>
            </template>
            <template v-else>
              <strong>{{ data.sideways.paymentAmount }} NIM was sent directly.</strong>
              <p>This older gift went to the Nimiq address chosen by the sender.</p>
            </template>
          </div>
        </div>
        <p class="no-obligation">There is nothing you need to do in return.</p>
      </section>

      <section v-if="selectingAccount" class="flow-card account-picker" aria-labelledby="account-title">
        <p class="eyebrow">Choose where it goes</p>
        <h2 id="account-title" ref="accountPickerTitle" tabindex="-1">Claim into which Nimiq account?</h2>
        <p class="supporting">The sender never sees this choice.</p>
        <button v-for="account in availableAccounts" :key="account" class="button button--secondary button--wide" type="button" @click="selectAccount(account)">
          {{ shortAddress(account) }}
        </button>
      </section>

      <section v-if="kept" class="kept-card" aria-live="polite">
        <span aria-hidden="true">💛</span>
        <div>
          <strong>This kindness is yours.</strong>
          <p v-if="data.sideways.includesPayment && data.sideways.paymentMode === 'claimable'">The {{ data.sideways.paymentAmount }} NIM has been claimed into your selected Nimiq account.</p>
          <p v-else-if="data.sideways.includesPayment">The {{ data.sideways.paymentAmount }} NIM was already delivered directly.</p>
          <p v-else>Keep the words. That’s enough.</p>
        </div>
      </section>

      <section v-if="!kept && !selectingAccount" class="receive-actions" aria-label="What would you like to do?">
        <button class="button button--primary button--wide" type="button" :disabled="keeping" @click="keep">
          {{ claimingFor === 'keep' ? 'Claiming your kindness…' : 'Keep this kindness' }}
        </button>
        <button class="button button--secondary button--wide" type="button" :disabled="Boolean(claimingFor)" @click="passSideways">
          <template v-if="claimingFor === 'pass'">Preparing the next kindness…</template>
          <template v-else>Pass it sideways—same, more, less, or words only <span aria-hidden="true">↗</span></template>
        </button>
      </section>

      <section v-else-if="!selectingAccount" class="receive-actions">
        <button class="button button--secondary button--wide" type="button" :disabled="Boolean(claimingFor)" @click="passSideways">
          Pass some kindness whenever you’re ready <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section v-if="!reported" class="chain-card" aria-labelledby="chain-title">
        <div class="chain-heading">
          <div><p class="eyebrow">This kindness has travelled</p><h2 id="chain-title">You are #{{ data.chain.position }} in this chain.</h2></div>
          <span class="chain-sprout" aria-hidden="true">🌱</span>
        </div>
        <dl>
          <div><dt>People reached</dt><dd>{{ data.chain.peopleReached }}</dd></div>
          <div><dt>Positive messages</dt><dd>{{ data.chain.positiveMessages }}</dd></div>
          <div><dt>Words-only passes</dt><dd>{{ data.chain.messageOnlyPasses }}</dd></div>
          <div v-if="data.chain.nimPassed > 0"><dt>NIM passed alongside messages</dt><dd>{{ data.chain.nimPassed }}</dd></div>
        </dl>
        <p>Only anonymous totals are shown. The words above stay private.</p>
      </section>

      <div v-if="!reported" class="safety-area">
        <button v-if="!reportOpen" class="subtle-button" type="button" @click="reportOpen = true">Report this message</button>
        <div v-else class="report-confirm">
          <p>Reporting permanently removes the words. Any unclaimed NIM stays available so money is not stranded. Continue?</p>
          <button type="button" @click="report">Yes, report it</button>
          <button type="button" @click="reportOpen = false">Cancel</button>
        </div>
      </div>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    </template>
  </main>
</template>
