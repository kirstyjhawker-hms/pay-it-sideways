import { describe, expect, it } from 'vitest'
import { giftSecretFromHash, networkId, normalizeNetwork } from './gift'

describe('gift link parsing', () => {
  it('accepts only a 32-byte hexadecimal bearer key', () => {
    const secret = 'ab'.repeat(32)
    expect(giftSecretFromHash(`#gift=${secret.toUpperCase()}`)).toBe(secret)
    expect(giftSecretFromHash('#gift=short')).toBeNull()
    expect(giftSecretFromHash(`#gift=${'z'.repeat(64)}`)).toBeNull()
  })
})

describe('network mapping', () => {
  it('uses the Nimiq PoS test and main network ids', () => {
    expect(normalizeNetwork('Nimiq Testnet')).toBe('test')
    expect(normalizeNetwork('Nimiq')).toBe('main')
    expect(networkId('test')).toBe(5)
    expect(networkId('main')).toBe(24)
  })
})
