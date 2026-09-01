export type NimiqNetwork = 'main' | 'test'

export interface GiftKey {
  address: string
  secret: string
}

export function normalizeNetwork(network: string): NimiqNetwork {
  return /test/i.test(network) ? 'test' : 'main'
}

export function networkId(network: NimiqNetwork): number {
  return network === 'test' ? 5 : 24
}

export function giftSecretFromHash(hash = window.location.hash): string | null {
  const secret = new URLSearchParams(hash.replace(/^#/, '')).get('gift')
  return secret && /^[a-f0-9]{64}$/i.test(secret) ? secret.toLowerCase() : null
}

export async function generateGiftKey(): Promise<GiftKey> {
  const { KeyPair } = await import('@nimiq/core')
  const keyPair = KeyPair.generate()
  return {
    address: keyPair.toAddress().toUserFriendlyAddress(),
    secret: keyPair.privateKey.toHex().toLowerCase(),
  }
}

export async function createClaimTransaction(input: {
  secret: string
  recipient: string
  value: number
  validityStartHeight: number
  network: NimiqNetwork
}): Promise<{ hash: string; serialized: string }> {
  const { Address, KeyPair, PrivateKey, TransactionBuilder } = await import('@nimiq/core')
  const keyPair = KeyPair.derive(PrivateKey.fromHex(input.secret))
  const transaction = TransactionBuilder.newBasic(
    keyPair.toAddress(),
    Address.fromUserFriendlyAddress(input.recipient),
    BigInt(input.value),
    0n,
    input.validityStartHeight,
    networkId(input.network),
  )
  transaction.sign(keyPair, undefined)
  return { hash: transaction.hash(), serialized: transaction.toHex() }
}
