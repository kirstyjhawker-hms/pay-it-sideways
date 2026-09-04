import { describe, expect, it } from 'vitest'
import { nimiqPayDeepLink } from './nimiq'

describe('Nimiq Pay deep links', () => {
  it('preserves a complete private recipient URL, including its gift fragment', () => {
    const gift = 'ab'.repeat(32)
    const target = `https://pay-it-sideways.example/s/recipient-token?from=share#gift=${gift}`
    const deepLink = nimiqPayDeepLink(target)

    expect(deepLink).toBe(`nimiqpay://miniapp?url=${encodeURIComponent(target)}`)
    expect(decodeURIComponent(deepLink.split('url=')[1])).toBe(target)
  })

  it('rejects non-web schemes', () => {
    expect(() => nimiqPayDeepLink('javascript:alert(1)')).toThrow('Only web links')
  })
})
