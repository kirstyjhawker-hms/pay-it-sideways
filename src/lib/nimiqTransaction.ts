export interface NimiqTransaction {
  hash?: string
  transactionHash?: string
  from?: string
  sender?: string
  to?: string
  recipient?: string
  value?: number
  executionResult?: boolean
}

export function normalizeAddress(address: string | undefined): string {
  return (address || '').replace(/\s/g, '').toUpperCase()
}

export function transactionHashOf(transaction: NimiqTransaction): string | undefined {
  return transaction.transactionHash || transaction.hash
}

export function transactionMatches(input: {
  transaction: NimiqTransaction
  hash: string
  from?: string
  to?: string
  value: number
}): boolean {
  const { transaction } = input
  const from = transaction.from || transaction.sender
  const to = transaction.to || transaction.recipient
  return transactionHashOf(transaction)?.toLowerCase() === input.hash.toLowerCase()
    && transaction.executionResult === true
    && Number(transaction.value) === input.value
    && (!input.from || normalizeAddress(from) === normalizeAddress(input.from))
    && (!input.to || normalizeAddress(to) === normalizeAddress(input.to))
}
