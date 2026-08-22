import { describe, expect, it } from 'vitest'
import { formatDuration, formatHoursMinutes, manualRange } from '@/lib/time'
import type { Company, Project, TimeEntry, WorkItem } from '@/types'
import { applyFilters, buildCompanyTree, summarize, totalsByUser } from './reports'
import type { TimeEntryView, WorkItemView } from './useTimeData'

const jisraa: Company = { id: 'c1', name: 'Jisraa', color: null, createdBy: '', createdAt: '' }
const newton: Project = {
  id: 'p1',
  companyId: 'c1',
  name: 'Newton',
  color: null,
  createdBy: '',
  createdAt: '',
}

function workItem(id: string, code: string, name: string): WorkItem {
  return {
    id,
    code,
    projectId: 'p1',
    name,
    description: '',
    status: 'in_progress',
    fileId: null,
    postId: null,
    createdBy: '',
    createdAt: '',
    updatedAt: '',
  }
}

function view(item: WorkItem): WorkItemView {
  return {
    item,
    project: newton,
    company: jisraa,
    path: 'Jisraa · Newton',
    haystack: `${item.name} ${item.code} newton jisraa`.toLowerCase(),
    color: 'hsl(199 68% 64%)',
  }
}

const presentation = view(workItem('w1', 'WI-000182', 'Newton Presentation'))
const flyer = view(workItem('w2', 'WI-000183', 'Newton Flyer'))

function entry(
  id: string,
  userName: string,
  work: WorkItemView,
  seconds: number,
  date = '2026-08-22',
): TimeEntryView {
  const e: TimeEntry = {
    id,
    userName,
    workItemId: work.item.id,
    description: '',
    startTime: `${date}T09:00:00.000Z`,
    endTime: `${date}T10:00:00.000Z`,
    duration: seconds,
    date,
    status: 'completed',
    createdAt: '',
    updatedAt: '',
  }
  return { entry: e, work }
}

describe('buildCompanyTree', () => {
  // The point of the whole module: two work items in one project stay
  // separate, and the totals nest without double counting.
  it('keeps work items in the same project independent', () => {
    const tree = buildCompanyTree([
      entry('1', 'Ali', presentation, 9000),
      entry('2', 'Mazen', presentation, 3600),
      entry('3', 'Randa', flyer, 1800),
    ])

    expect(tree).toHaveLength(1)
    const company = tree[0]
    expect(company.name).toBe('Jisraa')
    expect(company.seconds).toBe(9000 + 3600 + 1800)

    expect(company.projects).toHaveLength(1)
    const project = company.projects[0]
    expect(project.workItems.map((w) => w.name)).toEqual(['Newton Presentation', 'Newton Flyer'])
    expect(project.workItems[0].seconds).toBe(12600)
    expect(project.workItems[1].seconds).toBe(1800)
  })

  it('splits a work item total across its contributors', () => {
    const tree = buildCompanyTree([
      entry('1', 'Ali', presentation, 9000),
      entry('2', 'Mazen', presentation, 3600),
    ])
    const item = tree[0].projects[0].workItems[0]
    expect(item.contributors).toEqual([
      { name: 'Ali', seconds: 9000 },
      { name: 'Mazen', seconds: 3600 },
    ])
  })

  it('sums a company total from its project totals', () => {
    const branding: Project = { ...newton, id: 'p2', name: 'Branding' }
    const logo = { ...view(workItem('w3', 'WI-000184', 'Logo')), project: branding }
    const tree = buildCompanyTree([
      entry('1', 'Ali', presentation, 3600),
      entry('2', 'Ali', logo, 1800),
    ])
    const company = tree[0]
    expect(company.seconds).toBe(company.projects.reduce((sum, p) => sum + p.seconds, 0))
    expect(company.projects.map((p) => p.name)).toEqual(['Newton', 'Branding'])
  })
})

describe('applyFilters', () => {
  const rows = [
    entry('1', 'Ali', presentation, 3600, '2026-08-20'),
    entry('2', 'Randa', flyer, 1800, '2026-08-22'),
  ]

  it('filters by date range inclusively', () => {
    const result = applyFilters(rows, {
      range: { from: '2026-08-22', to: '2026-08-22' },
      userName: null,
      companyId: null,
      projectId: null,
      workItemId: null,
      status: null,
    })
    expect(result.map((r) => r.entry.id)).toEqual(['2'])
  })

  it('filters by work item, not by project', () => {
    const result = applyFilters(rows, {
      range: { from: '', to: '' },
      userName: null,
      companyId: null,
      projectId: 'p1',
      workItemId: 'w1',
      status: null,
    })
    expect(result.map((r) => r.entry.id)).toEqual(['1'])
  })
})

describe('summarize', () => {
  it('counts distinct users, companies, projects and work items', () => {
    const summary = summarize([
      entry('1', 'Ali', presentation, 3600),
      entry('2', 'Ali', flyer, 1800),
      entry('3', 'Randa', flyer, 1800),
    ])
    expect(summary).toEqual({
      entries: 3,
      users: 2,
      companies: 1,
      projects: 1,
      workItems: 2,
      seconds: 7200,
    })
  })
})

describe('totalsByUser', () => {
  it('ranks people by tracked time', () => {
    expect(
      totalsByUser([
        entry('1', 'Ali', presentation, 3600),
        entry('2', 'Randa', flyer, 7200),
        entry('3', 'Ali', flyer, 1800),
      ]),
    ).toEqual([
      { name: 'Randa', seconds: 7200 },
      { name: 'Ali', seconds: 5400 },
    ])
  })
})

describe('duration formatting', () => {
  it('formats a running clock', () => {
    expect(formatDuration(5072)).toBe('01:24:32')
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('formats report totals', () => {
    expect(formatHoursMinutes(65_940)).toBe('18h 19m')
    expect(formatHoursMinutes(120)).toBe('2m')
  })

  // "0m" reads as "nothing was tracked"; seconds say what actually happened.
  it('falls back to seconds under a minute', () => {
    expect(formatHoursMinutes(42)).toBe('42s')
    expect(formatHoursMinutes(0)).toBe('0s')
    expect(formatHoursMinutes(59)).toBe('59s')
    expect(formatHoursMinutes(60)).toBe('1m')
  })

  it('validates that end must be after start', () => {
    expect(manualRange('2026-08-22', '09:00', '11:30').duration).toBe(2.5 * 3600)
    expect(manualRange('2026-08-22', '09:00', '11:30').isValid).toBe(true)
    expect(manualRange('2026-08-22', '12:00', '11:00').duration).toBe(0)
    expect(manualRange('2026-08-22', '12:00', '11:00').isValid).toBe(false)
  })
})
