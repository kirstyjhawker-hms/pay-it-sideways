import { env } from 'cloudflare:workers'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import worker from './index'
import { network } from './test/network'

const origin = 'https://app.example'
const fundingHash = 'a'.repeat(64)
const secondFundingHash = 'd'.repeat(64)
const claimHash = 'b'.repeat(64)
const replacementClaimHash = 'e'.repeat(64)
const relayHash = 'f'.repeat(64)
const unrelatedHash = 'c'.repeat(64)
const giftAddress = 'NQ32 64N4 02FC 6Q59 RV16 0MM4 HCDD X6KL SNN4'
const secondGiftAddress = 'NQ22 GBGD Q7P1 EMMT R44A 4Q0B XS3B 0JSH 7RR7'
const destination = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
const serializedClaim = 'ab'.repeat(100)
const replacementSerializedClaim = 'ef'.repeat(100)
const relaySerializedClaim = 'fa'.repeat(100)
const unrelatedSerializedClaim = 'cd'.repeat(100)

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

function postFrom(body: unknown, address: string): RequestInit {
  return {
    ...post(body),
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': address },
  }
}

describe('Worker API', () => {
  it('runs the private words-only lifecycle idempotently', async () => {
    const token = 'D'.repeat(43)
    const trailToken = 'T'.repeat(43)
    const body = {
      recipientToken: token,
      trailToken,
      reason: 'You made the hard part easier.',
      message: 'Thank you for showing up with patience and good humour.',
    }

    const created = await dispatch('/api/sideways', post(body))
    expect(created.status).toBe(201)
    expect(created.headers.get('content-security-policy')).toContain("'wasm-unsafe-eval'")
    expect(created.headers.get('content-security-policy')).not.toMatch(/(?:^| )'unsafe-eval'(?:;| )/)
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
      chain: { linksOpened: 1, messageOnlyPasses: 1, position: 1 },
    })

    expect((await dispatch(`/api/sideways/${token}/keep`, post())).status).toBe(200)

    const childToken = 'E'.repeat(43)
    const child = await dispatch('/api/sideways', post({
      recipientToken: childToken,
      trailToken: 'U'.repeat(43),
      parentToken: token,
      reason: 'You made somebody feel welcome.',
      message: 'Your quiet kindness was noticed and appreciated.',
    }))
    expect(child.status).toBe(201)
    expect((await child.json<{ chainId: string }>()).chainId).toBe(first.chainId)

    const childView = await dispatch(`/api/sideways/${childToken}`)
    expect(await childView.json()).toMatchObject({
      chain: { linksOpened: 2, positiveMessages: 2, messageOnlyPasses: 2, position: 2 },
    })

    const trailView = await dispatch(`/api/trails/${trailToken}`)
    expect(await trailView.json()).toMatchObject({
      chain: {
        linksOpened: 2,
        positiveMessages: 2,
        messageOnlyPasses: 2,
        nimGiftCount: 0,
        nimPassed: 0,
      },
    })
    const trailText = await (await dispatch(`/api/trails/${trailToken}`)).text()
    expect(trailText).not.toContain(body.message)
    expect(trailText).not.toContain('transactionHash')
    expect((await dispatch(`/api/trails/${'Z'.repeat(43)}`)).status).toBe(404)

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
      trailToken: 'V'.repeat(43),
      reason: 'x'.repeat(17_000),
      message: 'This body must be rejected before parsing fields.',
    }))
    expect(oversized.status).toBe(413)
  })

  it('counts consented devices once and throttles automated note spam', async () => {
    const deviceId = '1'.repeat(64)
    const firstCount = await dispatch('/api/usage/device', postFrom({ deviceId }, '203.0.113.10'))
    const secondCount = await dispatch('/api/usage/device', postFrom({ deviceId }, '203.0.113.10'))
    expect(firstCount.status).toBe(200)
    expect(secondCount.status).toBe(200)
    const devices = await env.DB.prepare('SELECT COUNT(*) AS total FROM analytics_devices').first<{ total: number }>()
    expect(devices?.total).toBe(1)
    expect((await dispatch('/api/usage/device', postFrom({ deviceId: 'bad' }, '203.0.113.11'))).status).toBe(422)

    for (let index = 0; index < 20; index += 1) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
      const token = `${alphabet[index]}${'Z'.repeat(42)}`
      const created = await dispatch('/api/sideways', postFrom({
        recipientToken: token,
        trailToken: `${alphabet[index]}${'Q'.repeat(42)}`,
        reason: 'A legitimate kindness reason.',
        message: 'A legitimate positive message long enough to save.',
      }, '203.0.113.20'))
      expect(created.status).toBe(201)
    }
    const blocked = await dispatch('/api/sideways', postFrom({
      recipientToken: `u${'Y'.repeat(42)}`,
      trailToken: `v${'Y'.repeat(42)}`,
      reason: 'This request exceeds the hourly limit.',
      message: 'Automated floods should not consume unlimited storage.',
    }, '203.0.113.20'))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('verifies funding and claims before changing financial state', async () => {
    let broadcasts = 0
    let broadcastFails = true
    let blockNumber = 12_345
    network.use(http.post('https://rpc.testnet.nimiqwatch.com', async ({ request }) => {
      const rpc = await request.json() as { id: string; method: string; params: unknown[] }
      let data: unknown
      if (rpc.method === 'getTransactionByHash') {
        const hash = String(rpc.params[0])
        if (hash === fundingHash) {
          data = { hash, from: destination, to: giftAddress, value: 100_000, executionResult: true }
        } else if (hash === secondFundingHash) {
          data = { hash, from: destination, to: secondGiftAddress, value: 20_000, executionResult: true }
        } else if (hash === claimHash) {
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: rpc.id,
            error: { message: 'Internal error', data: `Transaction not found: ${hash}` },
          })
        } else if (hash === replacementClaimHash) {
          data = { hash, from: giftAddress, to: destination, value: 100_000, executionResult: true }
        } else if (hash === relayHash) {
          data = { hash, from: secondGiftAddress, to: giftAddress, value: 20_000, executionResult: true }
        } else {
          data = { hash, from: destination, to: giftAddress, value: 100_000, executionResult: true }
        }
      } else if (rpc.method === 'getAccountByAddress') {
        data = { balance: 100_000 }
      } else if (rpc.method === 'getBlockNumber') {
        data = blockNumber
      } else if (rpc.method === 'getRawTransactionInfo') {
        const serialized = String(rpc.params[0])
        data = {
          hash: serialized === serializedClaim
            ? claimHash
            : serialized === replacementSerializedClaim
              ? replacementClaimHash
              : serialized === relaySerializedClaim ? relayHash : unrelatedHash,
          from: serialized === relaySerializedClaim
            ? secondGiftAddress
            : serialized === serializedClaim || serialized === replacementSerializedClaim ? giftAddress : destination,
          to: serialized === relaySerializedClaim ? giftAddress : destination,
          fromType: 0,
          toType: 0,
          value: serialized === relaySerializedClaim ? 20_000 : 100_000,
          fee: 0,
          senderData: '',
          recipientData: '',
          flags: 0,
          networkId: 5,
          validityStartHeight: serialized === replacementSerializedClaim ? 20_000 : 12_345,
        }
      } else if (rpc.method === 'sendRawTransaction') {
        broadcasts += 1
        if (broadcastFails) {
          return HttpResponse.json({ jsonrpc: '2.0', id: rpc.id, error: { message: 'Temporary broadcast failure' } })
        }
        data = String(rpc.params[0]) === replacementSerializedClaim
          ? replacementClaimHash
          : String(rpc.params[0]) === relaySerializedClaim ? relayHash : claimHash
      } else {
        return HttpResponse.json({ jsonrpc: '2.0', id: rpc.id, error: { message: 'Unexpected method' } })
      }
      return HttpResponse.json({ jsonrpc: '2.0', id: rpc.id, result: { data } })
    }))

    const token = 'G'.repeat(43)
    const trailToken = 'W'.repeat(43)
    const created = await dispatch('/api/sideways', post({
      recipientToken: token,
      trailToken,
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
    const storedGift = await env.DB.prepare(
      'SELECT payment_luna FROM sideways WHERE includes_payment = 1 AND transaction_hash = ?'
    ).bind(fundingHash).first<{ payment_luna: number }>()
    expect(storedGift?.payment_luna).toBe(100_000)

    const paidChildToken = 'J'.repeat(43)
    const paidChild = await dispatch('/api/sideways', post({
      recipientToken: paidChildToken,
      trailToken: 'X'.repeat(43),
      parentToken: token,
      reason: 'Exact totals make the chain trustworthy.',
      message: 'Even small decimal gifts should add up without floating-point noise.',
      includesPayment: true,
      paymentLuna: 20_000,
      transactionHash: secondFundingHash,
      paymentMode: 'claimable',
      paymentNetwork: 'test',
      giftAddress: secondGiftAddress,
    }))
    expect(paidChild.status).toBe(201)
    const paidChildView = await dispatch(`/api/sideways/${paidChildToken}`)
    expect(await paidChildView.json()).toMatchObject({
      chain: { linksOpened: 1, nimPassed: 1.2 },
    })
    const paidTrail = await dispatch(`/api/trails/${trailToken}`)
    expect(await paidTrail.json()).toMatchObject({
      chain: { linksOpened: 1, nimGiftCount: 2, nimPassed: 1.2 },
    })

    const legacyDirect = await dispatch('/api/sideways', post({
      recipientToken: 'I'.repeat(43),
      trailToken: 'Y'.repeat(43),
      reason: 'A fabricated payment must never save.',
      message: 'New direct-payment records are not accepted by this backend.',
      includesPayment: true,
      paymentLuna: 100_000,
      transactionHash: fundingHash,
    }))
    expect(legacyDirect.status).toBe(422)

    const balance = await dispatch(`/api/sideways/${token}/gift-balance`)
    expect(await balance.json()).toEqual({
      balance: 100_000,
      blockNumber: 12_345,
      pendingClaimTransactionHash: null,
      pendingClaimExpired: false,
    })

    const forgedConfirmation = await dispatch(`/api/sideways/${token}/claim-confirm`, post({
      transactionHash: unrelatedHash,
    }))
    expect(forgedConfirmation.status).toBe(422)

    const relayAttempt = await dispatch(`/api/sideways/${token}/claim`, post({
      serializedTransaction: unrelatedSerializedClaim,
    }))
    expect(relayAttempt.status).toBe(422)
    expect(broadcasts).toBe(0)

    const broadcast = await dispatch(`/api/sideways/${token}/claim`, post({
      serializedTransaction: serializedClaim,
    }))
    expect(broadcast.status).toBe(202)
    expect(await broadcast.json()).toEqual({ transactionHash: claimHash, broadcastUncertain: true })
    expect(broadcasts).toBe(1)

    const beforeConfirmation = await dispatch(`/api/sideways/${token}`)
    expect(await beforeConfirmation.json()).toMatchObject({
      sideways: { claimed: false, claimPending: true },
    })
    const pendingBalance = await dispatch(`/api/sideways/${token}/gift-balance`)
    expect(await pendingBalance.json()).toMatchObject({ pendingClaimTransactionHash: claimHash })
    const wrongPendingConfirmation = await dispatch(`/api/sideways/${token}/claim-confirm`, post({
      transactionHash: unrelatedHash,
    }))
    expect(wrongPendingConfirmation.status).toBe(422)

    broadcastFails = false
    const rebroadcast = await dispatch(`/api/sideways/${token}/claim`, post({}))
    expect(rebroadcast.status).toBe(200)
    expect(await rebroadcast.json()).toEqual({ transactionHash: claimHash })
    expect(broadcasts).toBe(2)

    blockNumber = 20_000
    const expiredBalance = await dispatch(`/api/sideways/${token}/gift-balance`)
    expect(await expiredBalance.json()).toMatchObject({
      pendingClaimTransactionHash: claimHash,
      pendingClaimExpired: true,
    })
    const replacement = await dispatch(`/api/sideways/${token}/claim`, post({
      serializedTransaction: replacementSerializedClaim,
    }))
    expect(replacement.status).toBe(200)
    expect(await replacement.json()).toEqual({ transactionHash: replacementClaimHash })
    expect(broadcasts).toBe(3)

    const confirmation = await dispatch(`/api/sideways/${token}/claim-confirm`, post({
      transactionHash: replacementClaimHash,
    }))
    expect(confirmation.status).toBe(200)
    expect(await confirmation.json()).toEqual({ transactionHash: replacementClaimHash, confirmed: true })

    const afterConfirmation = await dispatch(`/api/sideways/${token}`)
    expect(await afterConfirmation.json()).toMatchObject({
      sideways: { claimed: true, claimPending: false, claimTransactionHash: replacementClaimHash },
    })
    const confirmedRetry = await dispatch(`/api/sideways/${token}/claim`, post({}))
    expect(await confirmedRetry.json()).toEqual({ transactionHash: replacementClaimHash })

    const relay = await dispatch(`/api/sideways/${paidChildToken}/claim`, post({
      serializedTransaction: relaySerializedClaim,
    }))
    expect(relay.status).toBe(200)
    expect(await relay.json()).toEqual({ transactionHash: relayHash })
    const relayConfirmation = await dispatch(`/api/sideways/${paidChildToken}/claim-confirm`, post({
      transactionHash: relayHash,
    }))
    expect(relayConfirmation.status).toBe(200)
    const relayedToken = 'K'.repeat(43)
    const relayedChild = await dispatch('/api/sideways', post({
      recipientToken: relayedToken,
      trailToken: 'R'.repeat(43),
      parentToken: paidChildToken,
      reason: 'The same gift keeps travelling.',
      message: 'This gift moved directly between two private links.',
      includesPayment: true,
      paymentLuna: 20_000,
      transactionHash: relayHash,
      paymentMode: 'claimable',
      paymentNetwork: 'test',
      giftAddress,
    }))
    expect(relayedChild.status).toBe(201)
    const relayedView = await dispatch(`/api/sideways/${relayedToken}`)
    expect(await relayedView.json()).toMatchObject({
      chain: { linksOpened: 3, positiveMessages: 3, nimPassed: 1.4, position: 3 },
    })

    const mismatch = await dispatch('/api/sideways', post({
      recipientToken: 'H'.repeat(43),
      trailToken: 'Q'.repeat(43),
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
