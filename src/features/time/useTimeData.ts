import { useMemo } from 'react'
import { useFiles } from '@/hooks/useFiles'
import { useCompanies, useProjects, useTimeEntries, useWorkItems } from '@/hooks/useTimeTracker'
import type { Company, DriveFile, Project, TimeEntry, WorkItem } from '@/types'
import { createPalette, type Palette } from './colors'

/** A work item with its hierarchy resolved — what every list, picker and
 *  report renders instead of raw ids. */
export interface WorkItemView {
  item: WorkItem
  project?: Project
  company?: Company
  file?: DriveFile
  /** "Jisraa · Newton" — the context line shown under every work item name. */
  path: string
  /** Lowercased name + code + project + company + file name, so one search box
   *  covers all four of the fields the spec asks to search by. */
  haystack: string
  /** The project's colour — resolved here so rows, the picker and the
   *  breakdowns all render the same identity without re-deriving it. */
  color: string
}

export interface TimeEntryView {
  entry: TimeEntry
  work?: WorkItemView
}

export function useTimeData() {
  const companiesQuery = useCompanies()
  const projectsQuery = useProjects()
  const workItemsQuery = useWorkItems()
  const entriesQuery = useTimeEntries()
  // Files are workspace-scoped elsewhere, but a work item may point at a file
  // in either workspace, so this deliberately asks for all of them.
  const filesQuery = useFiles('all')

  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data])
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  // Built from the whole data set, because a project's colour depends on its
  // siblings — see colors.ts.
  const palette: Palette = useMemo(() => createPalette(companies, projects), [companies, projects])

  const workItems = useMemo<WorkItemView[]>(() => {
    const projectById = new Map(projects.map((p) => [p.id, p]))
    const companyById = new Map(companies.map((c) => [c.id, c]))
    const fileById = new Map((filesQuery.data ?? []).map((f) => [f.id, f]))

    return (workItemsQuery.data ?? []).map((item) => {
      const project = projectById.get(item.projectId)
      const company = project ? companyById.get(project.companyId) : undefined
      const file = item.fileId ? fileById.get(item.fileId) : undefined
      return {
        item,
        project,
        company,
        file,
        path: [company?.name, project?.name].filter(Boolean).join(' · '),
        haystack: [item.name, item.code, project?.name, company?.name, file?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        color: palette.project(project?.id),
      }
    })
  }, [workItemsQuery.data, projects, companies, filesQuery.data, palette])

  const workItemById = useMemo(() => new Map(workItems.map((w) => [w.item.id, w])), [workItems])

  const entryViews = useMemo<TimeEntryView[]>(
    () => entries.map((entry) => ({ entry, work: workItemById.get(entry.workItemId) })),
    [entries, workItemById],
  )

  return {
    companies,
    projects,
    workItems,
    workItemById,
    entries,
    entryViews,
    palette,
    loading:
      companiesQuery.isLoading ||
      projectsQuery.isLoading ||
      workItemsQuery.isLoading ||
      entriesQuery.isLoading,
  }
}

/** Free-text filter over the combined haystack — every space-separated term
 *  must match, so "newton flyer" narrows rather than widening. */
export function filterWorkItems(items: WorkItemView[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return items
  return items.filter((w) => terms.every((term) => w.haystack.includes(term)))
}
