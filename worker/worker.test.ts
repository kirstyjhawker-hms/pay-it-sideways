import { env } from 'cloudflare:workers'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import worker from './index'
import { network } from './test/network'

const origin = 'https://app.example'
const fundingHash = 'a'.repeat(64)
const claimHash = 'b'.repeat(64)
const unrelatedHash = 'c'.repeat(64)
const giftAddress = 'NQ32 64N4 02FC 6Q59 RV16 0MM4 HCDD X6KL SNN4'
const destination = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'

function request(path: string, init?: RequestInit): Request {
  return new Request(`${origin}${path}`, init)
}

async function dispatch(path: string, init?: RequestInit): Promise<Response> {
  const context = createExecutionContext()
  const response = await worker.fetch(request(path, init), env, context)
  await waitOnExecutionContext(context)
  return response
}

function post(body?: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

describe('Worker API', () => {
  it('runs the private words-only lifecycle idempotently', async () => {
    const token = 'D'.repeat(43)
    const body = {
      recipientToken: token,
      reason: 'You made the hard part easier.',
      message: 'Thank you for showing up with patience and good humour.',
    }

    const created = await dispatch('/api/sideways', post(body))
    expect(created.status).toBe(201)
    expect(created.headers.get('cache-control')).toBe('no-store')
    expect(created.headers.get('referrer-policy')).toBe('no-referrer')
    const first = await created.json<{ token: string; chainId: string }>()
    expect(first.token).toBe(token)

    const retried = await dispatch('/api/sideways', post(body))
    expect(retried.status).toBe(200)
    expect(await retried.json()).toMatchObject(first)

    const received = await dispatch(`/api/sideways/${token}`)
    expect(await received.json()).toMatchObject({
      sideways: { message: body.message, reported: false, includesPayment: false },
      chain: { peopleReached: 1, messageOnlyPasses: 1, position: 1 },
    })

    expect((await dispatch(`/api/sideways/${token}/keep`, post())).status).toBe(200)

    const childToken = 'E'.repeat(43)
    const child = await dispatch('/api/sideways', post({
      recipientToken: childToken,
      parentToken: token,
      reason: 'You made somebody feel welcome.',
      message: 'Your quiet kindness was noticed and appreciated.',
    }))
    expect(child.status).toBe(201)
    expect((await child.json<{ chainId: string }>()).chainId).toBe(first.chainId)

    const childView = await dispatch(`/api/sideways/${childToken}`)
    expect(await childView.json()).toMatchObject({
      chain: { peopleReached: 2, positiveMessages: 2, messageOnlyPasses: 2, position: 2 },
    })

    expect((await dispatch(`/api/sideways/${token}/report`, post())).status).toBe(200)
    expect((await dispatch(`/api/sideways/${token}`)).status).toBe(410)

    await dispatch('/api/events', post({ name: 'app_open' }))
    await dispatch('/api/events', post({ name: 'app_open' }))
    const analytics = await env.DB.prepare(
      "SELECT event_count FROM analytics_daily WHERE event_name = 'app_open'"
    ).first<{ event_count: number }>()
    expect(analytics?.event_count).toBe(2)

    const oversized = await dispatch('/api/sideways', post({
      recipientToken: 'F'.repeat(43),
      reason: 'x'.repeat(17_000),
      message: 'This body must be rejected before parsing fields.',
    }))
    expect(oversized.status).toBe(413)
  })

  it('verifies funding and claims before changing financial state', async () => {
    network.use(http.post('https://rpc.testnet.nimiqwatch.com', async ({ request }) => {
      const rpc = await request.json() as { id: string; method: string; params: unknown[] }
      let data: unknown
      if (rpc.method === 'getTransactionByHash') {
        const hash = String(rpc.params[0])
        if (hash === fundingHash) {
          data = { hash, from: destination, to: giftAddress, value: 100_000, executionResult: true }
        } else if (hash === claimHash) {
          data = { hash, from: giftAddress, to: destination, value: 100_000, executionResult: true }
        } else {
          data = { hash, from: destination, to: giftAddress, value: 100_000, executionResult: true }
        }
      } else if (rpc.method === 'getAccountByAddress') {
        data = { balance: 100_000 }
      } else if (rpc.method === 'getBlockNumber') {
        data = 12_345
      } else if (rpc.method === 'sendRawTransaction') {
        data = claimHash
      } else {
        return HttpResponse.json({ jsonrpc: '2.0', id: rpc.id, error: { message: 'Unexpected method' } })
      }
      return HttpResponse.json({ jsonrpc: '2.0', id: rpc.id, result: { data } })
    }))

    const token = 'G'.repeat(43)
    const created = await dispatch('/api/sideways', post({
      recipientToken: token,
      reason: 'You were generous with your time.',
      message: 'Thank you for making a difficult day feel lighter.',
      includesPayment: true,
      paymentLuna: 100_000,
      transactionHash: fundingHash,
      paymentMode: 'claimable',
      paymentNetwork: 'test',
      giftAddress,
    }))
    expect(created.status).toBe(201)

    const balance = await dispatch(`/api/sideways/${token}/gift-balance`)
    expect(await balance.json()).toEqual({ balance: 100_000, blockNumber: 12_345 })

    const forgedConfirmation = await dispatch(`/api/sideways/${token}/claim-confirm`, post({
      transactionHash: unrelatedHash,
    }))
    expect(forgedConfirmation.status).toBe(422)

    const broadcast = await dispatch(`/api/sideways/${token}/claim`, post({
      serializedTransaction: 'ab'.repeat(100),
    }))
    expect(broadcast.status).toBe(200)
    expect(await broadcast.json()).toEqual({ transactionHash: claimHash })

    const beforeConfirmation = await dispatch(`/api/sideways/${token}`)
    expect(await beforeConfirmation.json()).toMatchObject({ sideways: { claimed: false } })

    const confirmation = await dispatch(`/api/sideways/${token}/claim-confirm`, post({
      transactionHash: claimHash,
    }))
    expect(confirmation.status).toBe(200)
    expect(await confirmation.json()).toEqual({ transactionHash: claimHash, confirmed: true })

    const afterConfirmation = await dispatch(`/api/sideways/${token}`)
    expect(await afterConfirmation.json()).toMatchObject({
      sideways: { claimed: true, claimTransactionHash: claimHash },
    })

    const mismatch = await dispatch('/api/sideways', post({
      recipientToken: 'H'.repeat(43),
      reason: 'This mismatch should never save.',
      message: 'The funding value must match the promised gift exactly.',
      includesPayment: true,
      paymentLuna: 1,
      transactionHash: fundingHash,
      paymentMode: 'claimable',
      paymentNetwork: 'test',
      giftAddress,
    }))
    expect(mismatch.status).toBe(422)
  })
})
