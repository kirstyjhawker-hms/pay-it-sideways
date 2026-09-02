import { transactionHashOf, transactionMatches, type NimiqTransaction } from '../src/lib/nimiqTransaction'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  RATE_LIMIT_SECRET?: string
}

interface CreateSidewaysBody {
  recipientToken?: unknown
  trailToken?: unknown
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
  payment_luna: number | null
  transaction_hash: string | null
  payment_mode: 'direct' | 'claimable' | null
  payment_network: 'main' | 'test' | null
  gift_address: string | null
  claim_transaction_hash: string | null
  pending_claim_transaction_hash: string | null
  claimed_at: string | null
  status: string
  kept_at: string | null
  first_opened_at: string | null
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

function nimiqNetworkId(network: NimiqNetwork): number {
  return network === 'test' ? 5 : 24
}

function sameNimiqAddress(left: string, right: string): boolean {
  return left.replace(/\s/g, '').toUpperCase() === right.replace(/\s/g, '').toUpperCase()
}

interface RawNimiqTransaction extends NimiqTransaction {
  fromType?: number
  toType?: number
  fee?: number
  flags?: number
  senderData?: string
  recipientData?: string
  networkId?: number
  validityStartHeight?: number
}

interface ValidatedClaim {
  hash: string
  validityStartHeight: number
}

const claimValidityWindow = 7_200

async function validateSignedClaim(input: {
  serializedTransaction: string
  giftAddress: string
  value: number
  network: NimiqNetwork
}): Promise<ValidatedClaim | null> {
  try {
    const transaction = await nimiqRpc<RawNimiqTransaction>(
      input.network,
      'getRawTransactionInfo',
      [input.serializedTransaction],
    )
    if (!sameNimiqAddress(transaction.from || transaction.sender || '', input.giftAddress)
      || Number(transaction.value) !== input.value
      || transaction.fromType !== 0
      || transaction.toType !== 0
      || Number(transaction.fee) !== 0
      || transaction.flags !== 0
      || transaction.senderData !== ''
      || transaction.recipientData !== ''
      || transaction.networkId !== nimiqNetworkId(input.network)
      || !Number.isInteger(transaction.validityStartHeight)
      || (transaction.validityStartHeight as number) < 0
    ) return null
    const hash = transactionHashOf(transaction)?.toLowerCase()
    return hash ? { hash, validityStartHeight: transaction.validityStartHeight as number } : null
  } catch { return null }
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
  secured.headers.set('content-security-policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'")
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

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function enforceRateLimit(
  request: Request,
  env: Env,
  scope: string,
  maximum: number,
  windowSeconds: number,
): Promise<Response | null> {
  const address = request.headers.get('cf-connecting-ip')
  if (!address) return null
  if (!env.RATE_LIMIT_SECRET) {
    return json({ error: 'Abuse protection is temporarily unavailable. Please try again shortly.' }, 503)
  }

  const now = Math.floor(Date.now() / 1000)
  const bucket = Math.floor(now / windowSeconds)
  const key = await hmacHex(env.RATE_LIMIT_SECRET, `${scope}:${bucket}:${address}`)
  const expiresAt = (bucket + 1) * windowSeconds
  await env.DB.batch([
    env.DB.prepare('DELETE FROM request_limits WHERE expires_at < ?').bind(now),
    env.DB.prepare(`
      INSERT INTO request_limits (request_key, request_count, expires_at)
      VALUES (?, 1, ?)
      ON CONFLICT(request_key) DO UPDATE SET request_count = request_count + 1
    `).bind(key, expiresAt),
  ])
  const current = await env.DB.prepare(
    'SELECT request_count FROM request_limits WHERE request_key = ?'
  ).bind(key).first<{ request_count: number }>()
  if (Number(current?.request_count ?? 0) <= maximum) return null

  const response = json({ error: 'That action has been used unusually often. Please wait a little and try again.' }, 429)
  response.headers.set('retry-after', String(Math.max(1, expiresAt - now)))
  return response
}

function tokenFromPath(pathname: string, suffix = ''): string | null {
  const pattern = suffix
    ? new RegExp(`^/api/sideways/([^/]+)/${suffix}$`)
    : /^\/api\/sideways\/([^/]+)$/
  const match = pathname.match(pattern)
  if (!match?.[1] || match[1].length > 128) return null
  return match[1]
}

function trailTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/trails\/([^/]+)$/)
  if (!match?.[1] || match[1].length > 128) return null
  return match[1]
}

interface ChainStatsRow {
  links_opened: number
  positive_messages: number
  message_only_passes: number
  nim_gift_count: number
  nim_passed_luna: number
  started_at: string
  last_continued_at: string
}

async function getChainStats(chainId: string, env: Env): Promise<ChainStatsRow | null> {
  return env.DB.prepare(`
    SELECT
      SUM(CASE WHEN first_opened_at IS NOT NULL THEN 1 ELSE 0 END) AS links_opened,
      COUNT(*) AS positive_messages,
      SUM(CASE WHEN includes_payment = 0 THEN 1 ELSE 0 END) AS message_only_passes,
      SUM(CASE WHEN includes_payment = 1 THEN 1 ELSE 0 END) AS nim_gift_count,
      COALESCE(SUM(CASE WHEN includes_payment = 1 THEN payment_luna ELSE 0 END), 0) AS nim_passed_luna,
      MIN(s.created_at) AS started_at,
      MAX(s.created_at) AS last_continued_at
    FROM sideways s
    INNER JOIN consents c ON c.sideways_id = s.id
    WHERE s.chain_id = ? AND s.status IN ('delivered', 'reported') AND c.allow_aggregate_tracking = 1
  `).bind(chainId).first<ChainStatsRow>()
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
  if (typeof body.trailToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.trailToken)) {
    return json({ error: 'The private trail identifier is missing or invalid.' }, 422)
  }
  const token = body.recipientToken
  const hash = await tokenHash(token)
  const trailHash = await tokenHash(body.trailToken)
  const existing = await env.DB.prepare(
    'SELECT chain_id FROM sideways WHERE recipient_token_hash = ?'
  ).bind(hash).first<{ chain_id: string }>()
  if (existing) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO trail_access (token_hash, chain_id, created_at) VALUES (?, ?, ?)'
    ).bind(trailHash, existing.chain_id, new Date().toISOString()).run()
    return json({ token, path: `/s/${token}`, chainId: existing.chain_id })
  }

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
    if (typeof body.transactionHash !== 'string' || !/^[a-f0-9]{64}$/i.test(body.transactionHash)) {
      return json({ error: 'The NIM transaction result is missing or invalid.' }, 422)
    }
    if (body.paymentMode !== 'claimable') {
      return json({ error: 'New NIM gifts must use a verified private claim link.' }, 422)
    }
    paymentAmount = (body.paymentLuna as number) / 100_000
    transactionHash = body.transactionHash
    paymentMode = 'claimable'
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
      payment_amount, payment_luna, transaction_hash, payment_mode, payment_network, gift_address, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')
  `).bind(
    id, chainId, parentId, now, hash, reason, message,
    includesPayment ? 1 : 0,
    includesPayment ? 'NIM' : null,
    paymentAmount,
    includesPayment ? body.paymentLuna as number : null,
    transactionHash,
    paymentMode,
    paymentNetwork,
    giftAddress,
  ))
  statements.push(env.DB.prepare(
    'INSERT INTO consents (sideways_id, allow_aggregate_tracking, allow_anonymous_quote) VALUES (?, 1, 0)'
  ).bind(id))
  statements.push(env.DB.prepare(
    'INSERT INTO trail_access (token_hash, chain_id, created_at) VALUES (?, ?, ?)'
  ).bind(trailHash, chainId, now))

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
      payment_luna,
      transaction_hash, payment_mode, payment_network, gift_address,
      claim_transaction_hash, pending_claim_transaction_hash, claimed_at, status, kept_at,
      first_opened_at
    FROM sideways WHERE recipient_token_hash = ?
  `).bind(hash).first<SidewaysRow>()

  if (!sideways) return json({ error: 'This kindness link could not be found.' }, 404)
  const reported = sideways.status === 'reported'
  if (reported && !(sideways.includes_payment === 1 && sideways.payment_mode === 'claimable' && !sideways.claimed_at)) {
    return json({ error: 'This message is no longer available.' }, 410)
  }

  await env.DB.prepare(
    'UPDATE sideways SET first_opened_at = ? WHERE id = ? AND first_opened_at IS NULL'
  ).bind(new Date().toISOString(), sideways.id).run()

  const stats = await getChainStats(sideways.chain_id, env)

  const position = await env.DB.prepare(`
    SELECT COUNT(*) AS position FROM sideways
    WHERE chain_id = ? AND status IN ('delivered', 'reported') AND created_at <= ?
  `).bind(sideways.chain_id, sideways.created_at).first<{ position: number }>()

  return json({
    sideways: {
      reason: reported ? '' : sideways.appreciation_reason,
      message: reported ? '' : sideways.positive_message,
      reported,
      includesPayment: sideways.includes_payment === 1,
      paymentCurrency: sideways.payment_currency,
      paymentAmount: sideways.payment_luna === null ? sideways.payment_amount : sideways.payment_luna / 100_000,
      transactionHash: sideways.transaction_hash,
      paymentMode: sideways.payment_mode,
      paymentNetwork: sideways.payment_network,
      giftAddress: sideways.gift_address,
      claimTransactionHash: sideways.claim_transaction_hash,
      claimPending: Boolean(sideways.pending_claim_transaction_hash),
      claimed: Boolean(sideways.claimed_at),
      kept: Boolean(sideways.kept_at),
    },
    chain: {
      linksOpened: Number(stats?.links_opened ?? 1),
      positiveMessages: Number(stats?.positive_messages ?? 1),
      messageOnlyPasses: Number(stats?.message_only_passes ?? 1),
      nimPassed: Number(stats?.nim_passed_luna ?? 0) / 100_000,
      position: Number(position?.position ?? 1),
    },
  })
}

async function getTrail(token: string, env: Env): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return json({ error: 'This private trail could not be found.' }, 404)
  const hash = await tokenHash(token)
  const access = await env.DB.prepare(
    'SELECT chain_id FROM trail_access WHERE token_hash = ?'
  ).bind(hash).first<{ chain_id: string }>()
  if (!access) return json({ error: 'This private trail could not be found.' }, 404)

  const stats = await getChainStats(access.chain_id, env)
  if (!stats?.positive_messages) return json({ error: 'This private trail could not be found.' }, 404)
  return json({
    chain: {
      linksOpened: Number(stats.links_opened),
      positiveMessages: Number(stats.positive_messages),
      messageOnlyPasses: Number(stats.message_only_passes),
      nimGiftCount: Number(stats.nim_gift_count),
      nimPassed: Number(stats.nim_passed_luna) / 100_000,
      startedAt: stats.started_at,
      lastContinuedAt: stats.last_continued_at,
    },
  })
}

async function getGiftBalance(token: string, env: Env): Promise<Response> {
  const hash = await tokenHash(token)
  const gift = await env.DB.prepare(`
    SELECT gift_address, payment_network, pending_claim_transaction_hash,
      pending_claim_validity_start_height
    FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{
    gift_address: string
    payment_network: NimiqNetwork
    pending_claim_transaction_hash: string | null
    pending_claim_validity_start_height: number | null
  }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)

  try {
    const [account, blockNumber] = await Promise.all([
      nimiqRpc<{ balance: number }>(gift.payment_network, 'getAccountByAddress', [gift.gift_address]),
      nimiqRpc<number>(gift.payment_network, 'getBlockNumber', []),
    ])
    return json({
      balance: Number(account.balance),
      blockNumber: Number(blockNumber),
      pendingClaimTransactionHash: gift.pending_claim_transaction_hash,
      pendingClaimExpired: Boolean(
        gift.pending_claim_transaction_hash
        && gift.pending_claim_validity_start_height !== null
        && Number(blockNumber) >= gift.pending_claim_validity_start_height + claimValidityWindow
      ),
    })
  } catch {
    return json({
      balance: null,
      blockNumber: null,
      pendingClaimTransactionHash: gift.pending_claim_transaction_hash,
      pendingClaimExpired: false,
    })
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
  const hash = await tokenHash(token)
  const gift = await env.DB.prepare(`
    SELECT id, payment_luna, gift_address, payment_network, claim_transaction_hash,
      pending_claim_transaction_hash, pending_claim_transaction,
      pending_claim_validity_start_height
    FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{
    id: string
    payment_luna: number
    gift_address: string
    payment_network: NimiqNetwork
    claim_transaction_hash: string | null
    pending_claim_transaction_hash: string | null
    pending_claim_transaction: string | null
    pending_claim_validity_start_height: number | null
  }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)
  if (gift.claim_transaction_hash) {
    return json({ transactionHash: gift.claim_transaction_hash })
  }

  let transactionToBroadcast: string
  let expectedHash: string
  let replaceExpiredPending = false
  if (gift.pending_claim_transaction_hash
    && gift.pending_claim_transaction
    && typeof serializedTransaction === 'string'
    && gift.pending_claim_validity_start_height !== null
  ) {
    try {
      const blockNumber = await nimiqRpc<number>(gift.payment_network, 'getBlockNumber', [])
      if (Number(blockNumber) >= gift.pending_claim_validity_start_height + claimValidityWindow) {
        try {
          await nimiqRpc<NimiqTransaction>(
            gift.payment_network,
            'getTransactionByHash',
            [gift.pending_claim_transaction_hash],
          )
          replaceExpiredPending = false
        } catch (error) {
          replaceExpiredPending = error instanceof Error && /transaction not found/i.test(error.message)
        }
      }
    } catch { /* Keep the known pending claim when expiry cannot be verified. */ }
  }

  if (gift.pending_claim_transaction_hash && gift.pending_claim_transaction && !replaceExpiredPending) {
    transactionToBroadcast = gift.pending_claim_transaction
    expectedHash = gift.pending_claim_transaction_hash.toLowerCase()
  } else {
    if (typeof serializedTransaction !== 'string'
      || !/^[a-f0-9]+$/i.test(serializedTransaction)
      || serializedTransaction.length < 100
      || serializedTransaction.length > 4096
    ) {
      return json({ error: 'That claim transaction is not valid.' }, 422)
    }
    const decoded = await validateSignedClaim({
      serializedTransaction,
      giftAddress: gift.gift_address,
      value: gift.payment_luna,
      network: gift.payment_network,
    })
    if (!decoded) return json({ error: 'That claim transaction does not match this private gift.' }, 422)

    const update = replaceExpiredPending
      ? env.DB.prepare(`
        UPDATE sideways
        SET pending_claim_transaction_hash = ?, pending_claim_transaction = ?,
          pending_claim_created_at = ?, pending_claim_validity_start_height = ?
        WHERE id = ? AND pending_claim_transaction_hash = ?
      `).bind(
        decoded.hash,
        serializedTransaction,
        new Date().toISOString(),
        decoded.validityStartHeight,
        gift.id,
        gift.pending_claim_transaction_hash,
      )
      : env.DB.prepare(`
      UPDATE sideways
      SET pending_claim_transaction_hash = ?, pending_claim_transaction = ?,
        pending_claim_created_at = ?, pending_claim_validity_start_height = ?
      WHERE id = ? AND pending_claim_transaction_hash IS NULL
    `).bind(decoded.hash, serializedTransaction, new Date().toISOString(), decoded.validityStartHeight, gift.id)
    await update.run()
    const pending = await env.DB.prepare(`
      SELECT pending_claim_transaction_hash, pending_claim_transaction
      FROM sideways WHERE id = ?
    `).bind(gift.id).first<{
      pending_claim_transaction_hash: string
      pending_claim_transaction: string
    }>()
    if (!pending?.pending_claim_transaction_hash || !pending.pending_claim_transaction) {
      return json({ error: 'The pending claim could not be saved safely. Please try again.' }, 500)
    }
    transactionToBroadcast = pending.pending_claim_transaction
    expectedHash = pending.pending_claim_transaction_hash.toLowerCase()
  }

  try {
    const transactionHash = await nimiqRpc<string>(
      gift.payment_network,
      'sendRawTransaction',
      [transactionToBroadcast],
    )
    if (transactionHash.toLowerCase() !== expectedHash) {
      return json({ error: 'The Nimiq network returned an unexpected claim identifier.' }, 502)
    }
    return json({ transactionHash })
  } catch {
    return json({ transactionHash: expectedHash, broadcastUncertain: true }, 202)
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
    SELECT id, gift_address, payment_luna, payment_network, claim_transaction_hash,
      pending_claim_transaction_hash
    FROM sideways
    WHERE recipient_token_hash = ? AND status IN ('delivered', 'reported')
      AND includes_payment = 1 AND payment_mode = 'claimable'
  `).bind(hash).first<{
    id: string
    gift_address: string
    payment_luna: number
    payment_network: NimiqNetwork
    claim_transaction_hash: string | null
    pending_claim_transaction_hash: string | null
  }>()
  if (!gift) return json({ error: 'This claimable gift could not be found.' }, 404)
  if (gift.claim_transaction_hash) {
    return json({ transactionHash: gift.claim_transaction_hash, confirmed: true })
  }
  if (gift.pending_claim_transaction_hash
    && gift.pending_claim_transaction_hash.toLowerCase() !== transactionHash.toLowerCase()
  ) {
    return json({ error: 'That transaction is not the pending claim for this private gift.' }, 422)
  }

  try {
    const transaction = await nimiqRpc<NimiqTransaction>(gift.payment_network, 'getTransactionByHash', [transactionHash])
    if (!transactionMatches({
      transaction,
      hash: transactionHash,
      from: gift.gift_address,
      value: gift.payment_luna,
    })) {
      return json({ error: 'That transaction does not claim this private gift.' }, 422)
    }
    await env.DB.prepare(`
      UPDATE sideways SET claim_transaction_hash = ?, claimed_at = ?,
        pending_claim_transaction_hash = NULL,
        pending_claim_transaction = NULL,
        pending_claim_created_at = NULL,
        pending_claim_validity_start_height = NULL
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

async function registerDevice(request: Request, env: Env): Promise<Response> {
  let deviceId: unknown
  try {
    const body = await readSmallJson<{ deviceId?: unknown }>(request, 1024)
    deviceId = body.deviceId
  } catch {
    return json({ error: 'That anonymous device count could not be read.' }, 400)
  }
  if (typeof deviceId !== 'string' || !/^[a-f0-9]{64}$/i.test(deviceId)) {
    return json({ error: 'That anonymous device identifier is not valid.' }, 422)
  }
  const storedHash = await tokenHash(`device:${deviceId.toLowerCase()}`)
  const now = new Date().toISOString()
  await env.DB.prepare(`
    INSERT INTO analytics_devices (device_id_hash, first_seen_at, last_seen_at)
    VALUES (?, ?, ?)
    ON CONFLICT(device_id_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at
  `).bind(storedHash, now, now).run()
  return json({ counted: true })
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/api/events') {
    const limited = await enforceRateLimit(request, env, 'events', 120, 3_600)
    if (limited) return limited
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
  if (request.method === 'POST' && url.pathname === '/api/usage/device') {
    const limited = await enforceRateLimit(request, env, 'device', 10, 3_600)
    if (limited) return limited
    return registerDevice(request, env)
  }
  if (request.method === 'POST' && url.pathname === '/api/sideways') {
    const limited = await enforceRateLimit(request, env, 'create', 20, 3_600)
    if (limited) return limited
    return createSideways(request, env)
  }
  if (request.method === 'POST' && url.pathname === '/api/nimiq/detect-network') {
    const limited = await enforceRateLimit(request, env, 'network-detect', 60, 3_600)
    if (limited) return limited
    return detectNimiqNetwork(request)
  }

  const trailToken = trailTokenFromPath(url.pathname)
  if (request.method === 'GET' && trailToken) {
    const limited = await enforceRateLimit(request, env, 'trail', 300, 3_600)
    return limited || getTrail(trailToken, env)
  }

  const keepToken = tokenFromPath(url.pathname, 'keep')
  if (request.method === 'POST' && keepToken) {
    const limited = await enforceRateLimit(request, env, 'keep', 60, 3_600)
    return limited || keepSideways(keepToken, env)
  }

  const balanceToken = tokenFromPath(url.pathname, 'gift-balance')
  if (request.method === 'GET' && balanceToken) {
    const limited = await enforceRateLimit(request, env, 'gift-balance', 180, 3_600)
    return limited || getGiftBalance(balanceToken, env)
  }

  const claimToken = tokenFromPath(url.pathname, 'claim')
  if (request.method === 'POST' && claimToken) {
    const limited = await enforceRateLimit(request, env, 'claim', 60, 3_600)
    return limited || claimGift(request, claimToken, env)
  }

  const confirmClaimToken = tokenFromPath(url.pathname, 'claim-confirm')
  if (request.method === 'POST' && confirmClaimToken) {
    const limited = await enforceRateLimit(request, env, 'claim-confirm', 120, 3_600)
    return limited || confirmGiftClaim(request, confirmClaimToken, env)
  }

  const reportToken = tokenFromPath(url.pathname, 'report')
  if (request.method === 'POST' && reportToken) {
    const limited = await enforceRateLimit(request, env, 'report', 20, 3_600)
    return limited || reportSideways(reportToken, env)
  }

  const token = tokenFromPath(url.pathname)
  if (request.method === 'GET' && token) {
    const limited = await enforceRateLimit(request, env, 'open', 300, 3_600)
    return limited || getSideways(token, env)
  }

  return json({ error: 'Not found.' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return handleApi(request, env)
    return withSecurityHeaders(await env.ASSETS.fetch(request))
  },
} satisfies ExportedHandler<Env>
