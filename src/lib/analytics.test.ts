import { describe, expect, it, vi } from 'vitest'
import { analyticsConsent, setAnalyticsConsent, track } from './analytics'

class MemoryStorage {
  value: string | null = null
  getItem(): string | null { return this.value }
  setItem(_key: string, value: string): void { this.value = value }
}

describe('analytics consent', () => {
  it('is disabled until the user makes an explicit choice', () => {
    const storage = new MemoryStorage()
    expect(analyticsConsent(storage)).toBeNull()
    expect(setAnalyticsConsent(true, storage)).toBe(true)
    expect(analyticsConsent(storage)).toBe(true)
    expect(setAnalyticsConsent(false, storage)).toBe(true)
    expect(analyticsConsent(storage)).toBe(false)
  })

  it('does not send an event without browser consent', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    track('app_open')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
