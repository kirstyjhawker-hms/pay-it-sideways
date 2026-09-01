export function parseNimToLuna(value: string): number | null {
  const trimmed = value.trim()
  if (!/^(?:0|[1-9]\d{0,3})(?:\.\d{1,5})?$/.test(trimmed)) return null
  const [whole = '0', fraction = ''] = trimmed.split('.')
  const luna = Number(whole) * 100_000 + Number(fraction.padEnd(5, '0'))
  return luna >= 1 && luna <= 100_000_000 ? luna : null
}
