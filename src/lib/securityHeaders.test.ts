import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('static security headers', () => {
  it('allow official Nimiq WebAssembly without enabling general script eval', () => {
    const headers = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8')
    expect(headers).toContain("script-src 'self' 'wasm-unsafe-eval'")
    expect(headers).not.toMatch(/(?:^| )'unsafe-eval'(?:;| )/)
  })
})
