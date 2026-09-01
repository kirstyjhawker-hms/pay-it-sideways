import { describe, expect, it } from 'vitest'
import { listSentLinks, parseSentLinks, readGiftSecret, recipientUrl, saveGiftSecret, saveSentLink } from './sentLinks'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

class FailingStorage {
  getItem(): string | null { throw new Error('disabled') }
  setItem(): void { throw new Error('disabled') }
}

const tokenA = 'abcdefghijklmnopqrstuvwxyz123456'
const tokenB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ654321'

describe('device-local sent link recovery', () => {
  it('rejects malformed index data', () => {
    expect(parseSentLinks('{broken')).toEqual([])
    expect(parseSentLinks(JSON.stringify([{ token: 'short', createdAt: 'today', includesGift: true }]))).toEqual([])
  })

  it('deduplicates and returns links newest first', () => {
    const store = new MemoryStorage()
    saveSentLink({ token: tokenA, createdAt: '2026-08-01T00:00:00.000Z', includesGift: false }, [store])
    saveSentLink({ token: tokenB, createdAt: '2026-09-01T00:00:00.000Z', includesGift: true }, [store])
    saveSentLink({ token: tokenA, createdAt: '2026-09-02T00:00:00.000Z', includesGift: false }, [store])
    expect(listSentLinks([store]).map((link) => link.token)).toEqual([tokenA, tokenB])
  })

  it('keeps the gift key separate and rebuilds a fragment-only claim link', () => {
    const store = new MemoryStorage()
    const secret = 'a'.repeat(64)
    saveGiftSecret(tokenA, secret, [store])
    expect(readGiftSecret(tokenA, [store])).toBe(secret)
    expect(recipientUrl('https://example.test', tokenA, secret)).toBe(`https://example.test/s/${tokenA}#gift=${secret}`)
  })

  it('stops instead of silently losing a funded link when storage is unavailable', () => {
    const failing = new FailingStorage()
    expect(() => saveSentLink({ token: tokenA, createdAt: '2026-09-01T00:00:00.000Z', includesGift: true }, [failing])).toThrow(/could not safely store/)
    expect(() => saveGiftSecret(tokenA, 'a'.repeat(64), [failing])).toThrow(/could not safely store/)
  })
})
