import { describe, expect, it } from 'vitest'
import { kindnessShareText } from './share'

describe('kindness sharing', () => {
  it('puts the complete funded link in the shared message body', () => {
    const url = 'https://example.com/s/private-token#gift=private-secret'

    const message = kindnessShareText(url)

    expect(message).toContain(url)
    expect(message).toContain('#gift=private-secret')
  })
})
