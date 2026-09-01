import { describe, expect, it } from 'vitest'
import { parseNimToLuna } from './money'

describe('parseNimToLuna', () => {
  it.each([
    ['0.00001', 1],
    ['0.5', 50_000],
    ['1', 100_000],
    ['1000', 100_000_000],
    [' 2.12345 ', 212_345],
  ])('parses %s without floating-point money math', (value, expected) => {
    expect(parseNimToLuna(value)).toBe(expected)
  })

  it.each(['', '0', '-1', '1e2', '1,2', '01', '0.000001', '1000.00001', '1001'])('rejects %s', (value) => {
    expect(parseNimToLuna(value)).toBeNull()
  })
})
