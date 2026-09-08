import { afterEach, describe, expect, it, vi } from 'vitest'
import { track } from '../domain/analytics'

describe('track', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('nunca lanza, incluso si console.debug fallara', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => track({ name: 'premium_page_viewed' })).not.toThrow()
  })

  it('loguea el nombre y el payload del evento', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    track({ name: 'checkout_started', planTier: 'premium_yearly' })
    expect(spy).toHaveBeenCalledWith(
      '[analytics]',
      'checkout_started',
      expect.objectContaining({ planTier: 'premium_yearly' }),
    )
  })
})
