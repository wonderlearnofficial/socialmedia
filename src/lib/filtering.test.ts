import { describe, expect, it } from 'vitest'
import type { Post } from '@/types'
import { countByStatus, filterPosts, postsForDay, postsForMonth, sortPosts } from './filtering'

const base: Omit<Post, 'id' | 'title' | 'date' | 'time' | 'platforms' | 'status'> = {
  description: '',
  topic: '',
  caption: '',
  contentType: 'image',
  feedback: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const posts: Post[] = [
  {
    ...base,
    id: '1',
    title: 'Back to School Campaign',
    description: 'Welcoming students back',
    topic: 'Back to School',
    caption: 'Ready for a fresh start?',
    date: '2026-08-21',
    time: '10:00',
    platforms: ['instagram'],
    status: 'in_review',
  },
  {
    ...base,
    id: '2',
    title: 'Behind The Scenes',
    date: '2026-08-21',
    time: '18:00',
    platforms: ['tiktok'],
    status: 'changes_requested',
  },
  {
    ...base,
    id: '3',
    title: 'September Preview',
    date: '2026-09-01',
    time: '09:00',
    platforms: ['instagram', 'facebook'],
    status: 'approved',
  },
]

const noFilters = { platforms: [], statuses: [], search: '' }

describe('filterPosts', () => {
  it('returns everything when nothing is selected', () => {
    expect(filterPosts(posts, noFilters)).toHaveLength(3)
  })

  it('matches a post if ANY of its platforms is selected', () => {
    const result = filterPosts(posts, { ...noFilters, platforms: ['facebook'] })
    expect(result.map((p) => p.id)).toEqual(['3'])
  })

  it('treats multiple platforms as a union', () => {
    const result = filterPosts(posts, { ...noFilters, platforms: ['tiktok', 'facebook'] })
    expect(result.map((p) => p.id)).toEqual(['2', '3'])
  })

  it('filters by status', () => {
    const result = filterPosts(posts, { ...noFilters, statuses: ['changes_requested'] })
    expect(result.map((p) => p.id)).toEqual(['2'])
  })

  it('searches title, description, topic and caption case-insensitively', () => {
    expect(filterPosts(posts, { ...noFilters, search: 'BACK TO SCHOOL' })).toHaveLength(1)
    expect(filterPosts(posts, { ...noFilters, search: 'welcoming' })).toHaveLength(1)
    expect(filterPosts(posts, { ...noFilters, search: 'fresh start' })).toHaveLength(1)
    expect(filterPosts(posts, { ...noFilters, search: 'nothing here' })).toHaveLength(0)
  })

  it('combines filters with AND', () => {
    const result = filterPosts(posts, {
      platforms: ['instagram'],
      statuses: ['approved'],
      search: '',
    })
    expect(result.map((p) => p.id)).toEqual(['3'])
  })
})

describe('sorting and grouping', () => {
  it('sorts chronologically by date then time', () => {
    const shuffled = [posts[2], posts[1], posts[0]]
    expect(sortPosts(shuffled).map((p) => p.id)).toEqual(['1', '2', '3'])
  })

  it('collects the posts for one day in time order', () => {
    expect(postsForDay(posts, '2026-08-21').map((p) => p.id)).toEqual(['1', '2'])
  })

  it('scopes posts to a month', () => {
    expect(postsForMonth(posts, '2026-08')).toHaveLength(2)
    expect(postsForMonth(posts, '2026-09')).toHaveLength(1)
  })
})

describe('countByStatus', () => {
  it('counts each status and zero-fills the rest', () => {
    const counts = countByStatus(posts)
    expect(counts.in_review).toBe(1)
    expect(counts.changes_requested).toBe(1)
    expect(counts.approved).toBe(1)
    expect(counts.draft).toBe(0)
    expect(counts.published).toBe(0)
  })
})
