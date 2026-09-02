export type AnalyticsEvent =
  | 'app_open'
  | 'create_started'
  | 'message_completed'
  | 'payment_option_selected'
  | 'sideways_created'
  | 'share_started'
  | 'recipient_opened'
  | 'recipient_kept'
  | 'continuation_started'
  | 'continuation_completed'
  | 'message_only_used'
  | 'payment_used'

interface ConsentStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const consentKey = 'pay-it-sideways:analytics-consent:v1'

function browserStorage(): ConsentStorage | undefined {
  if (typeof window === 'undefined') return undefined
  try { return window.localStorage } catch { return undefined }
}

export function analyticsConsent(storage: ConsentStorage | undefined = browserStorage()): boolean | null {
  if (!storage) return null
  try {
    const value = storage.getItem(consentKey)
    if (value === 'granted') return true
    if (value === 'declined') return false
  } catch { /* Analytics remains disabled. */ }
  return null
}

export function setAnalyticsConsent(allowed: boolean, storage: ConsentStorage | undefined = browserStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(consentKey, allowed ? 'granted' : 'declined')
    return true
  } catch { return false }
}

export function track(name: AnalyticsEvent): void {
  if (analyticsConsent() !== true) return
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
    keepalive: true,
  }).catch(() => undefined)
}

export type DeviceCountResult = 'counted' | 'outside-pay' | 'declined'

export async function registerAnonymousDevice(): Promise<DeviceCountResult> {
  if (typeof window === 'undefined' || !window.nimiqPay) return 'outside-pay'
  try {
    const { requestDeviceIdentifier } = await import('@nimiq/mini-app-sdk')
    const deviceId = await requestDeviceIdentifier({
      reason: 'Count this device once in anonymous competition usage totals. No wallet address or message is shared.',
    })
    const response = await fetch('/api/usage/device', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    if (!response.ok) throw new Error('The anonymous device count could not be saved.')
    return 'counted'
  } catch {
    return 'declined'
  }
}
