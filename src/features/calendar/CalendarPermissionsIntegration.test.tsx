import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { CalendarShell } from './CalendarShell'
import { makePost, renderWithProviders } from '@/test/utils'

describe('Calendar Permissions Integration', () => {
  const samplePosts = [makePost({ date: '2026-08-21' })]
  const targetDate = new Date('2026-08-21T00:00:00.000Z')

  it('renders "+ Add post" action when readOnly is false (Management: Super Admin, Founder, SMM, Art Director)', () => {
    const onAddPost = vi.fn()
    renderWithProviders(
      <CalendarShell
        posts={samplePosts}
        allPosts={samplePosts}
        date={targetDate}
        view="month"
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onDateChange={vi.fn()}
        onViewChange={vi.fn()}
        onDayClick={vi.fn()}
        onPostClick={vi.fn()}
        onAddPost={onAddPost}
        readOnly={false}
      />,
    )

    // The add post button should be in the header
    const addButtons = screen.queryAllByRole('button', { name: /add post/i })
    expect(addButtons.length).toBeGreaterThan(0)
  })

  it('hides "+ Add post" action when readOnly is true (View-Only: Graphic Designer, ID, Archive Master, Accountant)', () => {
    renderWithProviders(
      <CalendarShell
        posts={samplePosts}
        allPosts={samplePosts}
        date={targetDate}
        view="month"
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onDateChange={vi.fn()}
        onViewChange={vi.fn()}
        onDayClick={vi.fn()}
        onPostClick={vi.fn()}
        onAddPost={undefined}
        readOnly={true}
      />,
    )

    // The add post button should not exist
    const addButtons = screen.queryAllByRole('button', { name: /add post/i })
    expect(addButtons.length).toBe(0)
  })
})
