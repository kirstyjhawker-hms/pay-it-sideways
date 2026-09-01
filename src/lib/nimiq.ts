import { init, type NimiqProvider } from '@nimiq/mini-app-sdk'

let providerPromise: Promise<NimiqProvider> | undefined

export function getNimiqProvider(): Promise<NimiqProvider> {
  providerPromise ??= init({ timeout: 10_000 }).catch((error: unknown) => {
    providerPromise = undefined
    throw error
  })
  return providerPromise
}
