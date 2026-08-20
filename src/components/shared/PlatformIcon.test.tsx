import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PLATFORM_META } from '@/lib/constants'
import { SOCIAL_PLATFORMS } from '@/types'
import { PlatformIcon } from './PlatformIcon'

describe('PlatformIcon', () => {
  it('renders a distinct path for every supported platform', () => {
    const paths = SOCIAL_PLATFORMS.map((platform) => {
      const { container, unmount } = render(<PlatformIcon platform={platform} />)
      const d = container.querySelector('path')?.getAttribute('d')
      unmount()
      return d
    })
    expect(new Set(paths).size).toBe(SOCIAL_PLATFORMS.length)
    expect(paths.every(Boolean)).toBe(true)
  })

  it('is hidden from assistive tech unless given a title', () => {
    const { container, rerender } = render(<PlatformIcon platform="instagram" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    rerender(<PlatformIcon platform="instagram" title="Instagram" />)
    expect(screen.getByRole('img', { name: 'Instagram' })).toBeInTheDocument()
  })

  it('exposes brand colors as CSS variables when asked', () => {
    const { container } = render(<PlatformIcon platform="tiktok" brand />)
    const svg = container.querySelector('svg')!
    expect(svg.style.getPropertyValue('--brand')).toBe(PLATFORM_META.tiktok.brand)
    // TikTok's black mark needs a light variant on dark backgrounds
    expect(svg.style.getPropertyValue('--brand-dark')).toBe('#FFFFFF')
  })
})
