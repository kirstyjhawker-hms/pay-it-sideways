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

export function track(name: AnalyticsEvent): void {
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
    keepalive: true,
  }).catch(() => undefined)
}
