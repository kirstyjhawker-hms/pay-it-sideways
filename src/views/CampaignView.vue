<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { addCampaignSlot, allocateCampaignGift, createSideways, detectNimiqNetwork, getCampaignStatus, type CampaignStatus } from '../lib/api'
import { decryptCampaignGift, encryptCampaignGift } from '../lib/campaign'
import { generateGiftKey, normalizeNetwork, type GiftKey, type NimiqNetwork } from '../lib/gift'
import { getReadyNimiqProvider, nimiqPayDeepLink } from '../lib/nimiq'
import { saveGiftSecret, saveSentLink } from '../lib/sentLinks'

interface PendingSlot {
  recipientToken: string
  trailToken: string
  giftKey: GiftKey
  transactionHash?: string
  network?: NimiqNetwork
}

const giftLuna = 500_000_000
const pendingKey = 'pay-it-sideways:pending-founder-slot'
const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
const adminToken = params.get('admin') || ''
const campaignToken = params.get('campaign') || ''
const isSetup = computed(() => Boolean(adminToken))
const status = ref<CampaignStatus>()
const loading = ref(true)
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isInsideNimiqPay = Boolean(window.nimiqPay)
const openInNimiqPayUrl = nimiqPayDeepLink(window.location.href)

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function readPending(): PendingSlot | null {
  try {
    const value = JSON.parse(localStorage.getItem(pendingKey) || '') as PendingSlot
    return value?.recipientToken && value?.giftKey?.secret ? value : null
  } catch { return null }
}

function savePending(value: PendingSlot): void {
  localStorage.setItem(pendingKey, JSON.stringify(value))
}

async function refresh(): Promise<void> {
  status.value = await getCampaignStatus()
}

onMounted(async () => {
  if (isSetup.value && !campaignToken) {
    errorMessage.value = 'This setup link is incomplete. Use the complete private founder setup link.'
  } else if (!isSetup.value && !campaignToken) {
    errorMessage.value = 'This private founder invitation is incomplete.'
  }
  try { await refresh() } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The founder campaign could not be loaded.'
  } finally { loading.value = false }
})

async function findNetwork(hash: string): Promise<NimiqNetwork> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const network = await detectNimiqNetwork(hash)
    if (network) return network
    await new Promise((resolve) => window.setTimeout(resolve, 1000))
  }
  throw new Error('The payment is still settling. Keep this page open and tap again in a moment; it will not charge twice.')
}

async function fundNext(): Promise<void> {
  if (busy.value || !adminToken || !campaignToken) return
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    let pending = readPending()
    if (!pending) {
      pending = {
        recipientToken: randomToken(),
        trailToken: randomToken(),
        giftKey: await generateGiftKey(),
      }
      savePending(pending)
    }
    if (!pending.transactionHash) {
      const provider = await getReadyNimiqProvider()
      if (normalizeNetwork(provider.getNetwork()) !== 'main') {
        throw new Error('Switch Nimiq Pay to Mainnet before funding founder gifts. No transaction has been requested.')
      }
      const result = await provider.sendBasicTransaction({ recipient: pending.giftKey.address, value: giftLuna })
      if (typeof result !== 'string') throw result
      pending.transactionHash = result
      savePending(pending)
    }
    pending.network ??= await findNetwork(pending.transactionHash)
    savePending(pending)
    const created = await createSideways({
      recipientToken: pending.recipientToken,
      trailToken: pending.trailToken,
      reason: 'Thank you for helping begin one of the first Pay It Sideways kindness chains.',
      message: 'This founder-funded kindness is yours to keep—or pass sideways with a message of your own.',
      includesPayment: true,
      paymentLuna: giftLuna,
      transactionHash: pending.transactionHash,
      paymentMode: 'claimable',
      paymentNetwork: pending.network,
      giftAddress: pending.giftKey.address,
    })
    const encryptedGift = await encryptCampaignGift(campaignToken, {
      token: pending.recipientToken,
      secret: pending.giftKey.secret,
    })
    status.value = await addCampaignSlot({
      adminToken,
      recipientToken: pending.recipientToken,
      encryptedGift,
    })
    saveGiftSecret(created.token, pending.giftKey.secret)
    saveSentLink({
      token: created.token,
      trailToken: pending.trailToken,
      createdAt: new Date().toISOString(),
      includesGift: true,
      paymentAmount: 5000,
      paymentNetwork: pending.network,
      transactionHash: pending.transactionHash,
    })
    localStorage.removeItem(pendingKey)
    successMessage.value = `Founder pot ${status.value.funded} of ${status.value.capacity} is safely funded.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'That founder pot could not be funded.'
  } finally { busy.value = false }
}

async function acceptKindness(): Promise<void> {
  if (busy.value || !campaignToken) return
  busy.value = true
  errorMessage.value = ''
  try {
    if (!window.nimiqPay) throw new Error('Open this private invitation inside Nimiq Pay to accept a founder-funded kindness pot.')
    const { requestDeviceIdentifier } = await import('@nimiq/mini-app-sdk')
    const deviceId = await requestDeviceIdentifier({
      reason: 'Reserve one of twenty founder-funded kindness gifts for this device. No wallet address, message or payment is shared.',
    })
    const allocation = await allocateCampaignGift({ campaignToken, deviceId })
    const gift = await decryptCampaignGift(campaignToken, allocation.encryptedGift)
    window.location.assign(`/s/${gift.token}#gift=${gift.secret}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The kindness pot could not be reserved.'
    busy.value = false
  }
}
</script>

<template>
  <main class="screen campaign-screen">
    <section v-if="loading" class="loading-state" role="status"><p>Opening the first kindness chains…</p></section>
    <section v-else-if="isSetup" class="flow-card" aria-labelledby="campaign-setup-title">
      <p class="eyebrow">Private founder setup</p>
      <h1 id="campaign-setup-title">Fund twenty beginnings.</h1>
      <p class="supporting">Each confirmation funds one separate 5,000 NIM Mainnet gift. Your wallet key never leaves Nimiq Pay. Stop at any time; the campaign can distribute only gifts already funded.</p>
      <div v-if="status" class="campaign-meter"><strong>{{ status.funded }} / {{ status.capacity }}</strong><span>pots funded</span></div>
      <p class="privacy-note">Maximum campaign funding: 100,000 NIM. Each gift link is encrypted on this device before upload; the server cannot open or spend it. Never share this setup URL.</p>
      <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <a v-if="!isInsideNimiqPay && campaignToken" class="button button--primary button--wide" :href="openInNimiqPayUrl">Open in Nimiq Pay to fund <span aria-hidden="true">↗</span></a>
      <p v-if="!isInsideNimiqPay && campaignToken" class="fresh-act-note">This securely carries the complete private founder link into Nimiq Pay.</p>
      <button v-else class="button button--primary button--wide" type="button" :disabled="busy || !campaignToken || !status?.enabled || status.funded >= status.capacity" @click="fundNext">
        {{ busy ? 'Preparing this pot…' : status?.funded === status?.capacity ? 'All twenty are funded' : 'Fund next 5,000 NIM pot' }}
      </button>
    </section>
    <section v-else class="flow-card campaign-welcome" aria-labelledby="campaign-title">
      <p class="eyebrow">One of the first kindness chains</p>
      <h1 id="campaign-title">Accept some kindness.</h1>
      <p class="lead">As a thank-you for helping begin Pay It Sideways, up to twenty private kindness pots are being prepared. If one reaches you, keep it—or pass the same gift onwards with a message of your own.</p>
      <div v-if="status" class="campaign-meter"><strong>{{ status.remaining }}</strong><span>funded pots waiting</span></div>
      <p class="pass-explainer"><strong>No purchase. No deposit. No referral.</strong> One gift per Nimiq Pay device while funded pots remain. NIM is a cryptoasset and its value can change.</p>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <a v-if="!isInsideNimiqPay && campaignToken && status?.enabled && status.remaining > 0" class="button button--primary button--wide" :href="openInNimiqPayUrl">Open in Nimiq Pay to accept <span aria-hidden="true">↗</span></a>
      <p v-if="!isInsideNimiqPay && campaignToken && status?.enabled && status.remaining > 0" class="fresh-act-note">Nimiq Pay is needed only to reserve one gift for this device. No purchase or wallet address is required.</p>
      <button v-else class="button button--primary button--wide" type="button" :disabled="busy || !campaignToken || !status?.enabled || status.remaining === 0" @click="acceptKindness">
        {{ busy
          ? 'Reserving your kindness…'
          : status?.funded === 0
            ? 'Founder pots are being prepared'
            : status?.remaining === 0 && status.funded < status.capacity
              ? 'More pots may be added soon'
              : status?.remaining === 0
                ? 'All twenty journeys have begun'
                : 'Accept the kindness' }}
      </button>
      <RouterLink class="text-link" to="/create">Send words instead—always free</RouterLink>
    </section>
  </main>
</template>
