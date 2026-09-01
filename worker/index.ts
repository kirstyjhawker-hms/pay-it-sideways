import { transactionHashOf, transactionMatches, type NimiqTransaction } from '../src/lib/nimiqTransaction'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

interface CreateSidewaysBody {
  recipientToken?: unknown
  reason?: unknown
  message?: unknown
  parentToken?: unknown
  includesPayment?: unknown
  paymentAmount?: unknown
  paymentLuna?: unknown
  transactionHash?: unknown
  paymentMode?: unknown
  paymentNetwork?: unknown
  giftAddress?: unknown
}

interface SidewaysRow {
  id: string
  chain_id: string
  parent_id: string | null
  created_at: string
  appreciation_reason: string
  positive_message: string
  includes_payment: number
  payment_currency: string | null
  payment_amount: number | null
  transaction_hash: string | null
  payment_mode: 'direct' | 'claimable' | null
  payment_network: 'main' | 'test' | null
  gift_address: string | null
  claim_transaction_hash: string | null
  claimed_at: string | null
  status: string
  kept_at: string | null
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }
const allowedEvents = new Set([
  'app_open',
  'create_started',
  'message_completed',
  'payment_option_selected',
  'sideways_created',
  'share_started',
  'recipient_opened',
  'recipient_kept',
  'continuation_started',
  'continuation_completed',
  'message_only_used',
  'payment_used',
])

type NimiqNetwork = 'main' | 'test'

function rpcUrl(network: NimiqNetwork): string {
  return network === 'test'
    ? 'https://rpc.testnet.nimiqwatch.com'
    : 'https://rpc.nimiqwatch.com'
}

async function nimiqRpc<T>(network: NimiqNetwork, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl(network), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: crypto.randomUUID() }),
  })
  const body = await response.json<{
    result?: { data?: T } | T
    error?: { message?: string; data?: string }
  }>()
  if (!response.ok || body.error) {
    throw new Error(body.error?.data || body.error?.message || 'The Nimiq network could not complete that request.')
  }
  if (body.result && typeof body.result === 'object' && 'data' in body.result) {
    return body.result.data as T
  }
  return body.result as T
}

function json(data: unknown, status = 200): Response {
  return withSecurityHeaders(new Response(JSON.stringify(data), { status, headers: jsonHeaders }), true)
}

function withSecurityHeaders(response: Response, noStore = false): Response {
  const secured = new Response(response.body, response)
  secured.headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'")
  secured.headers.set('referrer-policy', 'no-referrer')
  secured.headers.set('x-content-type-options', 'nosniff')
  secured.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  if (noStore) secured.headers.set('cache-control', 'no-store')
  return secured
}

async function readSmallJson<T>(request: Request, maxBytes = 16_384): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > maxBytes) throw new Error('REQUEST_TOO_LARGE')
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('REQUEST_TOO_LARGE')
  return JSON.parse(text) as T
}

function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .normalize('NFC')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  return cleaned.length >= min && cleaned.length <= max ? cleaned : null
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function tokenFromPath(pathname: string, suffix = ''): string | null {
  const pattern = suffix
    ? new RegExp(`^/api/sideways/([^/]+)/${suffix}$`)
    : /^\/api\/sideways\/([^/]+)$/
  const match = pathname.match(pattern)
  if (!match?.[1] || match[1].length > 128) return null
  return match[1]
}

async function createSideways(request: Request, env: Env): Promise<Response> {
  let body: CreateSidewaysBody
  try {
    body = await readSmallJson<CreateSidewaysBody>(request)
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
      return json({ error: 'That request is too large.' }, 413)
    }
    return json({ error: 'That request could not be read.' }, 400)
  }

  const reason = cleanText(body.reason, 3, 160)
  const message = cleanText(body.message, 8, 600)
  if (!reason || !message) {
    return json({ error: 'Please write a reason and a message before sending.' }, 422)
  }

  if (typeof body.recipientToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.recipientToken)) {
    return json({ error: 'The private link identifier is missing or invalid.' }, 422)
  }
  const token = body.recipientToken
  const hash = await tokenHash(token)
  const existing = await env.DB.prepare(
    'SELECT chain_id FROM sideways WHERE recipient_token_hash = ?'
  ).bind(hash).first<{ chain_id: string }>()
  if (existing) return json({ token, path: `/s/${token}`, chainId: existing.chain_id })

  const includesPayment = body.includesPayment === true
  let paymentAmount: number | null = null
  let transactionHash: string | null = null
  let paymentMode: 'direct' | 'claimable' | null = null
  let paymentNetwork: NimiqNetwork | null = null
  let giftAddress: string | null = null
  if (includesPayment) {
    if (!Number.isInteger(body.paymentLuna)
      || (body.paymentLuna as number) < 1
      || (body.paymentLuna as number) > 100_000_000
    ) {
      return json({ error: 'That NIM amount is not valid.' }, 422)
    }
    if (typeof body.transactionHash !== 'string'
      || body.transactionHash.length < 16
      || body.transactionHash.length > 4096
    ) {
      return json({ error: 'The NIM transaction result is missing or invalid.' }, 422)
    }
    paymentAmount = (body.paymentLuna as number) / 100_000
    transactionHash = body.transactionHash
    paymentMode = body.paymentMode === 'claimable' ? 'claimable' : 'direct'
    if (paymentMode === 'claimable') {
      if (body.paymentNetwork !== 'main' && body.paymentNetwork !== 'test') {
        return json({ error: 'The Nimiq network for this gift is missing.' }, 422)
      }
      if (typeof body.giftAddress !== 'string'
        || !/^NQ[0-9]{2}(?: [A-Z0-9]{4}){8}$/.test(body.giftAddress)
      ) {
        return json({ error: 'The claimable NIM gift address is not valid.' }, 422)
      }
      paymentNetwork = body.paymentNetwork
      giftAddress = body.giftAddress

      try {
        const funding = await nimiqRpc<NimiqTransaction>(paymentNetwork, 'getTransactionByHash', [transactionHash])
        if (!transactionMatches({
          transaction: funding,
          hash: transactionHash,
          to: giftAddress,
          value: body.paymentLuna as number,
        })) {
          return json({ error: 'The NIM funding transaction does not match this private gift.' }, 422)
        }
      } catch {
        return json({ error: 'The NIM funding transaction is not confirmed yet. Please retry saving in a moment.' }, 409)
      }
    }
  }

  let parentId: string | null = null
  let chainId: string = crypto.randomUUID()
  if (typeof body.parentToken === 'string' && body.parentToken.length > 0) {
    const parentHash = await tokenHash(body.parentToken)
    const parent = await env.DB.prepare(
      "SELECT id, chain_id FROM sideways WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')"
    ).bind(parentHash).first<{ id: string; chain_id: string }>()
    if (!parent) return json({ error: 'This kindness link is no longer available.' }, 404)
    parentId = parent.id
    chainId = parent.chain_id
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const statements: D1PreparedStatement[] = []

  if (!parentId) {
    statements.push(env.DB.prepare(
      'INSERT INTO chains (id, created_at, root_sideways_id) VALUES (?, ?, ?)'
    ).bind(chainId, now, id))
  }

  statements.push(env.DB.prepare(`
    INSERT INTO sideways (
      id, chain_id, parent_id, created_at, recipient_token_hash,
      appreciation_reason, positive_message, includes_payment, payment_currency,
      payment_amount, transaction_hash, payment_mode, payment_network, gift_address, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')
  `).bind(
    id, chainId, parentId, now, hash, reason, message,
    includesPayment ? 1 : 0,
    includesPayment ? 'NIM' : null,
    paymentAmount,
    transactionHash,
    paymentMode,
    paymentNetwork,
    giftAddress,
  ))
  statements.push(env.DB.prepare(
    'INSERT INTO consents (sideways_id, allow_aggregate_tracking, allow_anonymous_quote) VALUES (?, 1, 0)'
  ).bind(id))

  try {
    await env.DB.batch(statements)
  } catch {
    return json({ error: 'We could not save this note just now. Your words are still here—please try again.' }, 500)
  }

  return json({ token, path: `/s/${token}`, chainId }, 201)
}

async function getSideways(token: string, env: Env): Promise<Response> {
  const hash = await tokenHash(token)
  const sideways = await env.DB.prepare(`
    SELECT id, chain_id, parent_id, created_at, appreciation_reason,
      positive_message, includes_payment, payment_currency, payment_amount,
      transaction_hash, payment_mode, payment_network, gift_address,
      claim_transaction_hash, claimed_at, status, kept_at
    FROM sideways WHERE recipient_token_hash = ?
  `).bind(hash).first<SidewaysRow>()

  if (!sideways) return json({ error: 'This kindness link could not be found.' }, 404)
  const reported = sideways.status === 'reported'
  if (reported && !(sideways.includes_payment === 1 && sideways.payment_mode === 'claimable' && !sideways.claimed_at)) {
    return json({ error: 'This message is no longer available.' }, 410)
  }

  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) AS people_reached,
      SUM(CASE WHEN includes_payment = 0 THEN 1 ELSE 0 END) AS message_only_passes,
      COALESCE(SUM(CASE WHEN includes_payment = 1 THEN payment_amount ELSE 0 END), 0) AS nim_passed
    FROM sideways s
    INNER JOIN consents c ON c.sideways_id = s.id
    WHERE s.chain_id = ? AND s.status = 'delivered' AND c.allow_aggregate_tracking = 1
  `).bind(sideways.chain_id).first<{
    people_reached: number
    message_only_passes: number
    nim_passed: number
  }>()

  const position = await env.DB.prepare(`
    SELECT COUNT(*) AS position FROM sideways
    WHERE chain_id = ? AND status = 'delivered' AND created_at <= ?
  `).bind(sideways.chain_id, sideways.created_at).first<{ position: number }>()

  return json({
    sideways: {
      reason: reported ? '' : sideways.appreciation_reason,
      message: reported ? '' : sideways.positive_message,
      reported,
      includesPayment: sideways.includes_payment === 1,
      paymentCurrency: sideways.payment_currency,
      paymentAmount: sideways.payment_amount,
      transactionHash: sideways.transaction_hash,
      paymentMode: sideways.payment_mode,
      paymentNetwork: sideways.payment_network,
      giftAddress: sideways.gift_address,
      claimTransactionHash: sideways.claim_transaction_hash,
      claimed: Boolean(sideways.claimed_at),
      kept: Boolean(sideways.kept_at),
    },
    chain: {
      peopleReached: Number(stats?.people_reached ?? 1),
      positiveMessages: Number(stats?.people_reached ?? 1),
      messageOnlyPasses: Number(stats?.message_only_passes ?? 1),
      nimPassed: Number(stats?.nim_passed ?? 0),
      position: Number(position?.position ?? 1),
    },
  })
}

async function getGiftBalance(token: string, env: Env): Promise<Response> {
  const hash = await tokenHash(token)
  const gift = await env.DB.prepare(`
    SELECT gift_address, payment_network FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{ gift_address: string; payment_network: NimiqNetwork }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)

  try {
    const [account, blockNumber] = await Promise.all([
      nimiqRpc<{ balance: number }>(gift.payment_network, 'getAccountByAddress', [gift.gift_address]),
      nimiqRpc<number>(gift.payment_network, 'getBlockNumber', []),
    ])
    return json({ balance: Number(account.balance), blockNumber: Number(blockNumber) })
  } catch {
    return json({ balance: null, blockNumber: null })
  }
}

async function detectNimiqNetwork(request: Request): Promise<Response> {
  let transactionHash: unknown
  try {
    const body = await readSmallJson<{ transactionHash?: unknown }>(request)
    transactionHash = body.transactionHash
  } catch {
    return json({ error: 'That transaction could not be read.' }, 400)
  }
  if (typeof transactionHash !== 'string' || !/^[a-f0-9]{64}$/i.test(transactionHash)) {
    return json({ error: 'That transaction hash is not valid.' }, 422)
  }

  const networks: NimiqNetwork[] = ['test', 'main']
  const matches = await Promise.all(networks.map(async (network) => {
    try {
      const transaction = await nimiqRpc<NimiqTransaction>(
        network,
        'getTransactionByHash',
        [transactionHash],
      )
      return transactionHashOf(transaction)?.toLowerCase() === transactionHash.toLowerCase() ? network : null
    } catch {
      return null
    }
  }))
  return json({ network: matches.find(Boolean) ?? null })
}

async function claimGift(request: Request, token: string, env: Env): Promise<Response> {
  let serializedTransaction: unknown
  try {
    const body = await readSmallJson<{ serializedTransaction?: unknown }>(request)
    serializedTransaction = body.serializedTransaction
  } catch {
    return json({ error: 'That claim could not be read.' }, 400)
  }
  if (typeof serializedTransaction !== 'string'
    || !/^[a-f0-9]+$/i.test(serializedTransaction)
    || serializedTransaction.length < 100
    || serializedTransaction.length > 4096
  ) {
    return json({ error: 'That claim transaction is not valid.' }, 422)
  }

  const hash = await tokenHash(token)
  const gift = await env.DB.prepare(`
    SELECT id, payment_network, claim_transaction_hash FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{
    id: string
    payment_network: NimiqNetwork
    claim_transaction_hash: string | null
  }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)
  if (gift.claim_transaction_hash) {
    return json({ transactionHash: gift.claim_transaction_hash })
  }

  try {
    const transactionHash = await nimiqRpc<string>(
      gift.payment_network,
      'sendRawTransaction',
      [serializedTransaction],
    )
    return json({ transactionHash })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The NIM could not be claimed just now.'
    return json({ error: message }, 502)
  }
}

async function confirmGiftClaim(request: Request, token: string, env: Env): Promise<Response> {
  let transactionHash: unknown
  try {
    const body = await readSmallJson<{ transactionHash?: unknown }>(request)
    transactionHash = body.transactionHash
  } catch {
    return json({ error: 'That claim confirmation could not be read.' }, 400)
  }
  if (typeof transactionHash !== 'string' || !/^[a-f0-9]{64}$/i.test(transactionHash)) {
    return json({ error: 'That claim transaction hash is not valid.' }, 422)
  }

  const hash = await tokenHash(token)
  const gift = await env.DB.prepare(`
    SELECT id, gift_address, payment_amount, payment_network, claim_transaction_hash FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{
    id: string
    gift_address: string
    payment_amount: number
    payment_network: NimiqNetwork
    claim_transaction_hash: string | null
  }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)
  if (gift.claim_transaction_hash) {
    return json({ transactionHash: gift.claim_transaction_hash, confirmed: true })
  }

  try {
    const transaction = await nimiqRpc<NimiqTransaction>(gift.payment_network, 'getTransactionByHash', [transactionHash])
    if (!transactionMatches({
      transaction,
      hash: transactionHash,
      from: gift.gift_address,
      value: Math.round(gift.payment_amount * 100_000),
    })) {
      return json({ error: 'That transaction does not claim this private gift.' }, 422)
    }
    await env.DB.prepare(`
      UPDATE sideways SET claim_transaction_hash = ?, claimed_at = ?
      WHERE id = ? AND claim_transaction_hash IS NULL
    `).bind(transactionHash, new Date().toISOString(), gift.id).run()
    const saved = await env.DB.prepare(
      'SELECT claim_transaction_hash FROM sideways WHERE id = ?'
    ).bind(gift.id).first<{ claim_transaction_hash: string | null }>()
    return json({ transactionHash: saved?.claim_transaction_hash, confirmed: true })
  } catch {
    return json({ transactionHash, confirmed: false }, 202)
  }
}

async function keepSideways(token: string, env: Env): Promise<Response> {
  const hash = await tokenHash(token)
  const result = await env.DB.prepare(`
    UPDATE sideways SET kept_at = COALESCE(kept_at, ?)
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
  `).bind(new Date().toISOString(), hash).run()
  if (!result.meta.changes) return json({ error: 'This kindness link could not be found.' }, 404)
  return json({ kept: true })
}

async function reportSideways(token: string, env: Env): Promise<Response> {
  const hash = await tokenHash(token)
  const result = await env.DB.prepare(`
    UPDATE sideways
    SET status = 'reported', appreciation_reason = '[removed]', positive_message = '[removed]'
    WHERE recipient_token_hash = ? AND status = 'delivered'
  `).bind(hash).run()
  if (!result.meta.changes) return json({ error: 'This kindness link could not be found.' }, 404)
  return json({ reported: true })
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/api/events') {
    let name: unknown
    try {
      const body = await readSmallJson<{ name?: unknown }>(request, 1024)
      name = body.name
    } catch {
      return json({ error: 'That event could not be read.' }, 400)
    }
    if (typeof name !== 'string' || !allowedEvents.has(name)) {
      return json({ error: 'That event is not allowed.' }, 422)
    }
    await env.DB.prepare(`
      INSERT INTO analytics_daily (event_name, event_day, event_count)
      VALUES (?, ?, 1)
      ON CONFLICT(event_name, event_day)
      DO UPDATE SET event_count = event_count + 1
    `).bind(name, new Date().toISOString().slice(0, 10)).run()
    return withSecurityHeaders(new Response(null, { status: 204 }), true)
  }
  if (request.method === 'POST' && url.pathname === '/api/sideways') {
    return createSideways(request, env)
  }
  if (request.method === 'POST' && url.pathname === '/api/nimiq/detect-network') {
    return detectNimiqNetwork(request)
  }

  const keepToken = tokenFromPath(url.pathname, 'keep')
  if (request.method === 'POST' && keepToken) return keepSideways(keepToken, env)

  const balanceToken = tokenFromPath(url.pathname, 'gift-balance')
  if (request.method === 'GET' && balanceToken) return getGiftBalance(balanceToken, env)

  const claimToken = tokenFromPath(url.pathname, 'claim')
  if (request.method === 'POST' && claimToken) return claimGift(request, claimToken, env)

  const confirmClaimToken = tokenFromPath(url.pathname, 'claim-confirm')
  if (request.method === 'POST' && confirmClaimToken) return confirmGiftClaim(request, confirmClaimToken, env)

  const reportToken = tokenFromPath(url.pathname, 'report')
  if (request.method === 'POST' && reportToken) return reportSideways(reportToken, env)

  const token = tokenFromPath(url.pathname)
  if (request.method === 'GET' && token) return getSideways(token, env)

  return json({ error: 'Not found.' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return handleApi(request, env)
    return withSecurityHeaders(await env.ASSETS.fetch(request))
  },
} satisfies ExportedHandler<Env>
