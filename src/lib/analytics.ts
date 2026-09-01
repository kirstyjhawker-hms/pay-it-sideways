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
