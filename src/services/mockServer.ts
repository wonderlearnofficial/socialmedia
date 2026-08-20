import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MOCK_POSTS } from '@/data/mockPosts'
import { sortPosts } from '@/lib/filtering'
import { uid } from '@/lib/utils'
import type { Feedback, Post, PostStatus, ShareLink } from '@/types'

/**
 * A tiny in-browser "server" wired in as a custom axios adapter and persisted
 * to localStorage, so the whole review workflow (approve, request changes,
 * share links) survives reloads. Swap the adapter out to point at a real API.
 */

const DB_KEY = 'cadence-db-v1'
const SEED_VERSION = 1

interface Db {
  seedVersion: number
  posts: Post[]
  shares: ShareLink[]
}

let db: Db | null = null

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.seedVersion === SEED_VERSION && Array.isArray(parsed.posts)) return parsed
    }
  } catch {
    // fall through to reseed
  }
  const fresh: Db = { seedVersion: SEED_VERSION, posts: structuredClone(MOCK_POSTS), shares: [] }
  localStorage.setItem(DB_KEY, JSON.stringify(fresh))
  return fresh
}

function getDb(): Db {
  if (!db) db = loadDb()
  return db
}

function save() {
  if (db) localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDemoData() {
  localStorage.removeItem(DB_KEY)
  db = null
}

const MONTH_SLUGS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/** "august-2026-k2ej20" -> "2026-08" */
export function monthFromShareId(id: string): string | null {
  const match = /^([a-z]+)-(\d{4})(?:-|$)/.exec(id)
  if (!match) return null
  const index = MONTH_SLUGS.indexOf(match[1])
  if (index === -1) return null
  return `${match[2]}-${String(index + 1).padStart(2, '0')}`
}

const latency = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250))

function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

export interface FeedbackInput {
  author: string
  role: Feedback['role']
  message: string
  kind: Feedback['kind']
  status?: PostStatus
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await latency()
  const method = (config.method ?? 'get').toLowerCase()
  const url = config.url ?? ''
  const body =
    typeof config.data === 'string' && config.data.length > 0 ? JSON.parse(config.data) : undefined
  const store = getDb()
  const now = new Date().toISOString()

  if (method === 'get' && url === '/posts') {
    return ok(config, sortPosts(structuredClone(store.posts)))
  }

  if (method === 'post' && url === '/posts') {
    const post: Post = {
      ...(body as Omit<Post, 'id' | 'feedback' | 'createdAt' | 'updatedAt'>),
      id: uid('post'),
      feedback: [],
      createdAt: now,
      updatedAt: now,
    }
    store.posts.push(post)
    save()
    return ok(config, structuredClone(post))
  }

  const postMatch = url.match(/^\/posts\/([^/]+)$/)
  if (postMatch) {
    const post = store.posts.find((p) => p.id === postMatch[1])
    if (method === 'patch') {
      if (!post) throw new Error('Post not found')
      Object.assign(post, body, { updatedAt: now })
      save()
      return ok(config, structuredClone(post))
    }
    if (method === 'delete') {
      store.posts = store.posts.filter((p) => p.id !== postMatch[1])
      save()
      return ok(config, { id: postMatch[1] })
    }
  }

  const dupMatch = url.match(/^\/posts\/([^/]+)\/duplicate$/)
  if (method === 'post' && dupMatch) {
    const source = store.posts.find((p) => p.id === dupMatch[1])
    if (!source) throw new Error('Post not found')
    const copy: Post = {
      ...structuredClone(source),
      id: uid('post'),
      title: `${source.title} (Copy)`,
      status: 'draft',
      feedback: [],
      createdAt: now,
      updatedAt: now,
    }
    store.posts.push(copy)
    save()
    return ok(config, structuredClone(copy))
  }

  const fbMatch = url.match(/^\/posts\/([^/]+)\/feedback$/)
  if (method === 'post' && fbMatch) {
    const post = store.posts.find((p) => p.id === fbMatch[1])
    if (!post) throw new Error('Post not found')
    const input = body as FeedbackInput
    const entry: Feedback = {
      id: uid('fb'),
      author: input.author,
      role: input.role,
      kind: input.kind,
      message: input.message,
      status: input.status,
      createdAt: now,
    }
    post.feedback.push(entry)
    if (input.status) post.status = input.status
    post.updatedAt = now
    save()
    return ok(config, structuredClone(post))
  }

  if (method === 'post' && url === '/shares') {
    const { month, slug } = body as { month: string; slug: string }
    const share: ShareLink = {
      id: `${slug}-${Math.random().toString(36).slice(2, 8)}`,
      month,
      createdAt: now,
    }
    store.shares.push(share)
    save()
    return ok(config, structuredClone(share))
  }

  const shareMatch = url.match(/^\/shares\/([^/]+)$/)
  if (method === 'get' && shareMatch) {
    const id = shareMatch[1]
    const stored = store.shares.find((s) => s.id === id)
    if (stored) return ok(config, structuredClone(stored))
    // The recipient of a link is a different browser, so it holds no record of
    // the share. Share ids carry their month ("august-2026-xxxxxx"), so the link
    // still resolves against that browser's copy of the calendar.
    const derived = monthFromShareId(id)
    return ok(config, derived ? ({ id, month: derived, createdAt: now } satisfies ShareLink) : null)
  }

  throw new Error(`Unhandled mock request: ${method.toUpperCase()} ${url}`)
}
