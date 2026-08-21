import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { makePost, renderWithProviders } from '@/test/utils'
import { CalendarPost } from './CalendarPost'

describe('CalendarPost', () => {
  it('shows the title, platform, status and a thumbnail — but never the caption', () => {
    const post = makePost({
      title: 'Back to School Campaign',
      caption: 'Ready for a fresh start?',
      platforms: ['instagram'],
      status: 'review',
      contentUrl: 'https://example.com/artwork.png',
    })
    const { container } = renderWithProviders(<CalendarPost post={post} />)

    expect(screen.getByText('Back to School Campaign')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
    // Status rides on the card as colour plus a title attribute, not a label.
    expect(container.querySelector('[title*="Review"]')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/artwork.png')
    // The month grid is for scanning: a caption would cost a row of the plan.
    expect(screen.queryByText('Ready for a fresh start?')).not.toBeInTheDocument()
  })

  it('falls back to a content-type glyph when the post has no image', () => {
    const { container } = renderWithProviders(
      <CalendarPost post={makePost({ contentUrl: undefined, title: 'No artwork yet' })} />,
    )
    expect(screen.getByText('No artwork yet')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
