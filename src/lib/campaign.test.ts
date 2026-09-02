import { describe, expect, it } from 'vitest'
import { decryptCampaignGift, encryptCampaignGift } from './campaign'

describe('founder campaign gift encryption', () => {
  it('round-trips a gift only with the private campaign token', async () => {
    const campaignToken = 'A'.repeat(43)
    const gift = { token: 'B'.repeat(43), secret: 'c'.repeat(64) }
    const encrypted = await encryptCampaignGift(campaignToken, gift)

    expect(encrypted).not.toContain(gift.token)
    expect(encrypted).not.toContain(gift.secret)
    await expect(decryptCampaignGift(campaignToken, encrypted)).resolves.toEqual(gift)
    await expect(decryptCampaignGift('D'.repeat(43), encrypted)).rejects.toThrow('could not be opened')
  })
})
