import { init, type NimiqProvider } from '@nimiq/mini-app-sdk'

let providerPromise: Promise<NimiqProvider> | undefined

export function getNimiqProvider(): Promise<NimiqProvider> {
  providerPromise ??= init({ timeout: 10_000 }).catch((error: unknown) => {
    providerPromise = undefined
    throw error
  })
  return providerPromise
}

/**
 * Opens an exact web URL as a Mini App, including private query parameters and
 * fragments. The custom scheme is intentional: the public nimpay.app HTTPS
 * handoff currently rebuilds URLs without their fragment, which would strip a
 * Pay It Sideways gift key.
 */
export function nimiqPayDeepLink(targetUrl: string): string {
  const url = new URL(targetUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only web links can be opened in Nimiq Pay.')
  }
  return `nimiqpay://miniapp?url=${encodeURIComponent(url.toString())}`
}
