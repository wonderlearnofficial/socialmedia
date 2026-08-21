import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makePost, renderWithProviders } from '@/test/utils'
import { DayDetailsModal } from './DayDetailsModal'

const posts = [
  makePost({ id: 'a', title: 'Back to School Campaign', time: '10:00', platforms: ['instagram'] }),
  makePost({
    id: 'b',
    title: 'Behind The Scenes',
    time: '18:00',
    platforms: ['tiktok'],
    status: 'changes_required',
  }),
  makePost({ id: 'c', title: 'Next Day Post', date: '2026-08-22' }),
]

describe('DayDetailsModal', () => {
  it('shows the date and how many posts that day holds', () => {
    renderWithProviders(
      <DayDetailsModal
        dateKey="2026-08-21"
        posts={posts}
        onClose={vi.fn()}
        onPostClick={vi.fn()}
      />,
    )
    expect(screen.getByText('August 21, 2026')).toBeInTheDocument()
    expect(screen.getByText('2 posts planned')).toBeInTheDocument()
  })

  it('lists only that day’s posts, in time order', () => {
    renderWithProviders(
      <DayDetailsModal
        dateKey="2026-08-21"
        posts={posts}
        onClose={vi.fn()}
        onPostClick={vi.fn()}
      />,
    )
    const titles = screen.getAllByRole('button').map((b) => b.textContent ?? '')
    const shown = titles.filter((text) => text.includes('Campaign') || text.includes('Scenes'))
    expect(shown[0]).toContain('Back to School Campaign')
    expect(shown[1]).toContain('Behind The Scenes')
    expect(screen.queryByText('Next Day Post')).not.toBeInTheDocument()
  })

  it('opens a post when its row is clicked', async () => {
    const onPostClick = vi.fn()
    renderWithProviders(
      <DayDetailsModal
        dateKey="2026-08-21"
        posts={posts}
        onClose={vi.fn()}
        onPostClick={onPostClick}
      />,
    )
    await userEvent.click(screen.getByText('Behind The Scenes'))
    expect(onPostClick).toHaveBeenCalledWith('b')
  })

  it('renders nothing when no day is selected', () => {
    const { container } = renderWithProviders(
      <DayDetailsModal dateKey={null} posts={posts} onClose={vi.fn()} onPostClick={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('tells the user when a day is empty', () => {
    renderWithProviders(
      <DayDetailsModal
        dateKey="2026-08-25"
        posts={posts}
        onClose={vi.fn()}
        onPostClick={vi.fn()}
      />,
    )
    expect(screen.getByText(/nothing planned/i)).toBeInTheDocument()
  })
})
