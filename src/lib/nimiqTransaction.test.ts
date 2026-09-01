import { describe, expect, it } from 'vitest'
import { transactionMatches } from './nimiqTransaction'

const hash = 'ab'.repeat(32)
const gift = 'NQ12 3456 7890 ABCD EFGH IJKL MNOP QRST UVWX'

describe('transactionMatches', () => {
  it('accepts a confirmed matching transaction across RPC field aliases', () => {
    expect(transactionMatches({
      transaction: { transactionHash: hash.toUpperCase(), sender: gift.replace(/ /g, ''), recipient: 'NQ00 DEST', value: 50_000, executionResult: true },
      hash,
      from: gift,
      value: 50_000,
    })).toBe(true)
  })

  it.each([
    { from: 'NQ00 ATTACKER', value: 50_000, executionResult: true },
    { from: gift, value: 49_999, executionResult: true },
    { from: gift, value: 50_000, executionResult: false },
  ])('rejects a mismatched or failed claim', (transaction) => {
    expect(transactionMatches({ transaction: { hash, ...transaction }, hash, from: gift, value: 50_000 })).toBe(false)
  })
})
