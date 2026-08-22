import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { entrySeconds } from '@/lib/time'
import type { TimeEntryView } from './useTimeData'

export const DATE_PRESETS = [
  'all',
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'custom',
] as const
export type DatePreset = (typeof DATE_PRESETS)[number]

export interface DateRange {
  /** yyyy-MM-dd, inclusive. Empty string means unbounded. */
  from: string
  to: string
}

function key(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

/** Weeks start Monday — a design team's week, not a calendar's. */
const WEEK_OPTS = { weekStartsOn: 1 } as const

export function presetRange(preset: DatePreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return { from: key(now), to: key(now) }
    case 'yesterday': {
      const d = subDays(now, 1)
      return { from: key(d), to: key(d) }
    }
    case 'this_week':
      return { from: key(startOfWeek(now, WEEK_OPTS)), to: key(endOfWeek(now, WEEK_OPTS)) }
    case 'last_week': {
      const d = subWeeks(now, 1)
      return { from: key(startOfWeek(d, WEEK_OPTS)), to: key(endOfWeek(d, WEEK_OPTS)) }
    }
    case 'this_month':
      return { from: key(startOfMonth(now)), to: key(endOfMonth(now)) }
    case 'last_month': {
      const d = subMonths(now, 1)
      return { from: key(startOfMonth(d)), to: key(endOfMonth(d)) }
    }
    default:
      return { from: '', to: '' }
  }
}

export interface ReportFilters {
  range: DateRange
  userName: string | null
  companyId: string | null
  projectId: string | null
  workItemId: string | null
  status: string | null
}

export function applyFilters(rows: TimeEntryView[], filters: ReportFilters) {
  return rows.filter(({ entry, work }) => {
    if (filters.range.from && entry.date < filters.range.from) return false
    if (filters.range.to && entry.date > filters.range.to) return false
    if (filters.userName && entry.userName !== filters.userName) return false
    if (filters.workItemId && entry.workItemId !== filters.workItemId) return false
    if (filters.projectId && work?.project?.id !== filters.projectId) return false
    if (filters.companyId && work?.company?.id !== filters.companyId) return false
    if (filters.status && work?.item.status !== filters.status) return false
    return true
  })
}

export interface Contributor {
  name: string
  seconds: number
}

export interface WorkItemTotal {
  id: string
  code: string
  name: string
  seconds: number
  contributors: Contributor[]
}

export interface ProjectTotal {
  id: string
  name: string
  seconds: number
  workItems: WorkItemTotal[]
}

export interface CompanyTotal {
  id: string
  name: string
  seconds: number
  projects: ProjectTotal[]
}

const UNASSIGNED = '__none__'

function descending<T extends { seconds: number }>(list: T[]) {
  return [...list].sort((a, b) => b.seconds - a.seconds)
}

/**
 * One tree — company → project → work item → contributor — that every report
 * view reads. Building it once is what keeps a company total and the sum of its
 * project totals from ever disagreeing.
 */
export function buildCompanyTree(rows: TimeEntryView[], now: number = Date.now()): CompanyTotal[] {
  const companies = new Map<string, CompanyTotal>()
  const projects = new Map<string, ProjectTotal>()
  const items = new Map<string, WorkItemTotal>()
  const contributors = new Map<string, Map<string, number>>()

  for (const { entry, work } of rows) {
    const seconds = entrySeconds(entry, now)
    const companyId = work?.company?.id ?? UNASSIGNED
    const projectId = work?.project?.id ?? UNASSIGNED
    const itemId = work?.item.id ?? UNASSIGNED

    let company = companies.get(companyId)
    if (!company) {
      company = { id: companyId, name: work?.company?.name ?? '—', seconds: 0, projects: [] }
      companies.set(companyId, company)
    }

    const projectKey = `${companyId}/${projectId}`
    let project = projects.get(projectKey)
    if (!project) {
      project = { id: projectId, name: work?.project?.name ?? '—', seconds: 0, workItems: [] }
      projects.set(projectKey, project)
      company.projects.push(project)
    }

    const itemKey = `${projectKey}/${itemId}`
    let item = items.get(itemKey)
    if (!item) {
      item = {
        id: itemId,
        code: work?.item.code ?? '—',
        name: work?.item.name ?? '—',
        seconds: 0,
        contributors: [],
      }
      items.set(itemKey, item)
      project.workItems.push(item)
      contributors.set(itemKey, new Map())
    }

    company.seconds += seconds
    project.seconds += seconds
    item.seconds += seconds
    const byUser = contributors.get(itemKey)
    if (byUser) byUser.set(entry.userName, (byUser.get(entry.userName) ?? 0) + seconds)
  }

  for (const [itemKey, item] of items) {
    const byUser = contributors.get(itemKey)
    if (!byUser) continue
    item.contributors = descending(
      [...byUser.entries()].map(([name, seconds]) => ({ name, seconds })),
    )
  }

  for (const project of projects.values()) project.workItems = descending(project.workItems)
  for (const company of companies.values()) company.projects = descending(company.projects)
  return descending([...companies.values()])
}

export function totalsByUser(rows: TimeEntryView[], now: number = Date.now()): Contributor[] {
  const byUser = new Map<string, number>()
  for (const { entry } of rows) {
    byUser.set(entry.userName, (byUser.get(entry.userName) ?? 0) + entrySeconds(entry, now))
  }
  return descending([...byUser.entries()].map(([name, seconds]) => ({ name, seconds })))
}

export interface ReportSummary {
  entries: number
  users: number
  companies: number
  projects: number
  workItems: number
  seconds: number
}

export function summarize(rows: TimeEntryView[], now: number = Date.now()): ReportSummary {
  const users = new Set<string>()
  const companies = new Set<string>()
  const projects = new Set<string>()
  const workItems = new Set<string>()
  let seconds = 0

  for (const { entry, work } of rows) {
    users.add(entry.userName)
    if (work?.company) companies.add(work.company.id)
    if (work?.project) projects.add(work.project.id)
    workItems.add(entry.workItemId)
    seconds += entrySeconds(entry, now)
  }

  return {
    entries: rows.length,
    users: users.size,
    companies: companies.size,
    projects: projects.size,
    workItems: workItems.size,
    seconds,
  }
}
