const encoder = new TextEncoder()
const tokenPattern = /^[A-Za-z0-9_-]{43}$/
const giftPattern = /^[a-f0-9]{64}$/i

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function encryptionKey(campaignToken: string): Promise<CryptoKey> {
  if (!tokenPattern.test(campaignToken)) throw new Error('The private campaign link is invalid.')
  const input = await crypto.subtle.importKey('raw', encoder.encode(campaignToken), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: encoder.encode('pay-it-sideways-founder-campaign-v1'),
    info: encoder.encode('gift-link-encryption'),
  }, input, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encryptCampaignGift(
  campaignToken: string,
  gift: { token: string; secret: string },
): Promise<string> {
  if (!tokenPattern.test(gift.token) || !giftPattern.test(gift.secret)) {
    throw new Error('The private gift link is invalid.')
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(campaignToken),
    encoder.encode(JSON.stringify({ token: gift.token, secret: gift.secret.toLowerCase() })),
  )
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`
}

export async function decryptCampaignGift(
  campaignToken: string,
  encryptedGift: string,
): Promise<{ token: string; secret: string }> {
  const [ivValue, payloadValue, extra] = encryptedGift.split('.')
  if (!ivValue || !payloadValue || extra) throw new Error('This allocated gift is invalid.')
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlToBytes(ivValue) },
      await encryptionKey(campaignToken),
      base64UrlToBytes(payloadValue),
    )
    const gift = JSON.parse(new TextDecoder().decode(decrypted)) as { token?: unknown; secret?: unknown }
    if (typeof gift.token !== 'string' || !tokenPattern.test(gift.token)
      || typeof gift.secret !== 'string' || !giftPattern.test(gift.secret)
    ) throw new Error()
    return { token: gift.token, secret: gift.secret.toLowerCase() }
  } catch {
    throw new Error('This gift could not be opened. Check that you used the complete private campaign link.')
  }
}
