export interface SentLink {
  token: string
  trailToken?: string
  createdAt: string
  includesGift: boolean
  paymentAmount?: number
  paymentNetwork?: 'main' | 'test'
  transactionHash?: string
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const indexKey = 'pay-it-sideways:sent-links:v1'

function browserStores(): StorageLike[] {
  if (typeof window === 'undefined') return []
  const stores: StorageLike[] = []
  try { stores.push(window.localStorage) } catch { /* Storage may be unavailable. */ }
  try { stores.push(window.sessionStorage) } catch { /* Storage may be unavailable. */ }
  return stores
}

function validLink(value: unknown): value is SentLink {
  if (!value || typeof value !== 'object') return false
  const link = value as Partial<SentLink>
  return typeof link.token === 'string'
    && /^[A-Za-z0-9_-]{20,100}$/.test(link.token)
    && typeof link.createdAt === 'string'
    && !Number.isNaN(Date.parse(link.createdAt))
    && typeof link.includesGift === 'boolean'
    && (link.trailToken === undefined || /^[A-Za-z0-9_-]{43}$/.test(link.trailToken))
    && (link.paymentAmount === undefined || (Number.isFinite(link.paymentAmount) && link.paymentAmount > 0))
    && (link.paymentNetwork === undefined || link.paymentNetwork === 'main' || link.paymentNetwork === 'test')
    && (link.transactionHash === undefined || /^[a-f0-9]{64}$/i.test(link.transactionHash))
}

export function parseSentLinks(raw: string | null): SentLink[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(validLink) : []
  } catch { return [] }
}

export function listSentLinks(stores: StorageLike[] = browserStores()): SentLink[] {
  const byToken = new Map<string, SentLink>()
  for (const store of stores) {
    try {
      for (const link of parseSentLinks(store.getItem(indexKey))) {
        const existing = byToken.get(link.token)
        if (!existing || Date.parse(link.createdAt) > Date.parse(existing.createdAt)) byToken.set(link.token, link)
      }
    } catch { /* Ignore an unavailable store. */ }
  }
  return [...byToken.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function saveSentLink(link: SentLink, stores: StorageLike[] = browserStores()): void {
  if (!validLink(link)) throw new Error('Invalid sent link')
  for (const store of stores) {
    try {
      const links = listSentLinks([store]).filter((item) => item.token !== link.token)
      store.setItem(indexKey, JSON.stringify([link, ...links]))
      return
    } catch { /* Try the next store. */ }
  }
  throw new Error('This browser could not safely store the private link. Keep this page open and enable site storage before retrying.')
}

export function readGiftSecret(token: string, stores: StorageLike[] = browserStores()): string | null {
  for (const store of stores) {
    try {
      const secret = store.getItem(`gift:${token}`)
      if (secret) return secret
    } catch { /* Try the next store. */ }
  }
  return null
}

export function saveGiftSecret(token: string, secret: string, stores: StorageLike[] = browserStores()): void {
  for (const store of stores) {
    try { store.setItem(`gift:${token}`, secret); return } catch { /* Try the next store. */ }
  }
  throw new Error('This browser could not safely store the private gift key. Keep this page open and enable site storage before retrying.')
}

export function recipientUrl(origin: string, token: string, secret: string | null): string {
  const base = `${origin}/s/${token}`
  return secret ? `${base}#gift=${secret}` : base
}
