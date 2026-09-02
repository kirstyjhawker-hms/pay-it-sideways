export interface ChainStats {
  peopleReached: number
  positiveMessages: number
  messageOnlyPasses: number
  nimPassed: number
  position: number
}

export interface SidewaysResponse {
  sideways: {
    reason: string
    message: string
    reported: boolean
    includesPayment: boolean
    paymentCurrency: string | null
    paymentAmount: number | null
    transactionHash: string | null
    paymentMode: 'direct' | 'claimable' | null
    paymentNetwork: 'main' | 'test' | null
    giftAddress: string | null
    claimTransactionHash: string | null
    claimPending: boolean
    claimed: boolean
    kept: boolean
  }
  chain: ChainStats
}

export interface CreatedSideways {
  token: string
  path: string
  chainId: string
}

export interface TrailResponse {
  chain: Omit<ChainStats, 'position'> & {
    nimGiftCount: number
    startedAt: string
    lastContinuedAt: string
  }
}
