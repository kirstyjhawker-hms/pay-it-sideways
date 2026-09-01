import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.resolve(import.meta.dirname, 'migrations'))

  return {
    test: {
      projects: [
        {
          test: {
            name: 'unit',
            include: ['src/**/*.test.ts'],
          },
        },
        {
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.test.jsonc' },
              miniflare: {
                bindings: { TEST_MIGRATIONS: migrations },
              },
            }),
          ],
          test: {
            name: 'worker',
            include: ['worker/**/*.test.ts'],
            setupFiles: ['./worker/test/setup.ts'],
          },
        },
      ],
    },
  }
})
