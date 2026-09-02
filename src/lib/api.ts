import type { CreatedSideways, SidewaysResponse, TrailResponse } from '../types'
import type { NimiqNetwork } from './gift'

interface ErrorBody {
  error?: string
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & ErrorBody
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
  return body
}

export async function createSideways(input: {
  recipientToken: string
  trailToken: string
  reason: string
  message: string
  parentToken?: string
  includesPayment?: boolean
  paymentAmount?: number
  paymentLuna?: number
  transactionHash?: string
  paymentMode?: 'claimable'
  paymentNetwork?: 'main' | 'test'
  giftAddress?: string
}): Promise<CreatedSideways> {
  const response = await fetch('/api/sideways', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readJson<CreatedSideways>(response)
}

export async function getGiftState(token: string): Promise<{ balance: number | null; blockNumber: number | null; pendingClaimTransactionHash: string | null; pendingClaimExpired: boolean }> {
  const response = await fetch(`/api/sideways/${encodeURIComponent(token)}/gift-balance`)
  return readJson<{ balance: number | null; blockNumber: number | null; pendingClaimTransactionHash: string | null; pendingClaimExpired: boolean }>(response)
}

export async function detectNimiqNetwork(transactionHash: string): Promise<NimiqNetwork | null> {
  const response = await fetch('/api/nimiq/detect-network', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactionHash }),
  })
  const body = await readJson<{ network: NimiqNetwork | null }>(response)
  return body.network
}

export async function broadcastGiftClaim(input: {
  token: string
  serializedTransaction?: string
}): Promise<string> {
  const response = await fetch(`/api/sideways/${encodeURIComponent(input.token)}/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serializedTransaction: input.serializedTransaction }),
  })
  const body = await readJson<{ transactionHash: string }>(response)
  return body.transactionHash
}

export async function confirmGiftClaim(input: {
  token: string
  transactionHash: string
}): Promise<{ transactionHash: string; confirmed: boolean }> {
  const response = await fetch(`/api/sideways/${encodeURIComponent(input.token)}/claim-confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactionHash: input.transactionHash }),
  })
  if (response.status === 202) {
    return response.json() as Promise<{ transactionHash: string; confirmed: false }>
  }
  return readJson<{ transactionHash: string; confirmed: true }>(response)
}

export async function getSideways(token: string): Promise<SidewaysResponse> {
  return readJson<SidewaysResponse>(await fetch(`/api/sideways/${encodeURIComponent(token)}`))
}

export async function getTrail(token: string): Promise<TrailResponse> {
  return readJson<TrailResponse>(await fetch(`/api/trails/${encodeURIComponent(token)}`))
}

export async function keepSideways(token: string): Promise<void> {
  await readJson(await fetch(`/api/sideways/${encodeURIComponent(token)}/keep`, { method: 'POST' }))
}

export async function reportSideways(token: string): Promise<void> {
  await readJson(await fetch(`/api/sideways/${encodeURIComponent(token)}/report`, { method: 'POST' }))
}

export interface CampaignStatus {
  enabled: boolean
  capacity: number
  giftAmount: number
  funded: number
  allocated: number
  remaining: number
}

export async function getCampaignStatus(): Promise<CampaignStatus> {
  return readJson<CampaignStatus>(await fetch('/api/campaign/status'))
}

export async function addCampaignSlot(input: {
  adminToken: string
  recipientToken: string
  encryptedGift: string
}): Promise<CampaignStatus> {
  return readJson<CampaignStatus>(await fetch('/api/campaign/slots', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export async function allocateCampaignGift(input: {
  campaignToken: string
  deviceId: string
}): Promise<{ encryptedGift: string }> {
  return readJson<{ encryptedGift: string }>(await fetch('/api/campaign/allocate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }))
}
