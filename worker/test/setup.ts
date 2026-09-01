import { afterAll, afterEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
import { network } from './network'

declare module 'cloudflare:workers' {
  interface ProvidedEnv {
    DB: D1Database
    TEST_MIGRATIONS: D1Migration[]
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
  network.enable()
})

afterEach(() => network.resetHandlers())
afterAll(() => network.disable())
