import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Clock, ListChecks, Timer, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BreakdownList, type BreakdownNode } from '@/features/time/BreakdownList'
import { ReportFiltersBar } from '@/features/time/ReportFilters'
import {
  applyFilters,
  buildCompanyTree,
  presetRange,
  summarize,
  totalsByUser,
  type DatePreset,
  type ReportFilters,
} from '@/features/time/reports'
import { TimeEntriesTable } from '@/features/time/TimeEntriesTable'
import { TimeEntryDialog } from '@/features/time/TimeEntryDialog'
import { useTrackingUser } from '@/features/time/useActiveTimer'
import { useTimeData } from '@/features/time/useTimeData'
import { formatHoursMinutes, totalSeconds } from '@/lib/time'
import type { TimeEntry } from '@/types'

const EMPTY_FILTERS: ReportFilters = {
  range: { from: '', to: '' },
  userName: null,
  companyId: null,
  projectId: null,
  workItemId: null,
  status: null,
}

export function TimeReportsPage() {
  const { t } = useTranslation()
  const { companies, projects, workItems, entries, entryViews, loading } = useTimeData()
  const userName = useTrackingUser()

  const [preset, setPreset] = useState<DatePreset>('all')
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const filtered = useMemo(() => applyFilters(entryViews, filters), [entryViews, filters])
  const summary = useMemo(() => summarize(filtered), [filtered])
  const tree = useMemo(() => buildCompanyTree(filtered), [filtered])
  const byUser = useMemo(() => totalsByUser(filtered), [filtered])

  const users = useMemo(() => [...new Set(entries.map((e) => e.userName))].sort(), [entries])
  const activeTimers = useMemo(
    () => entries.filter((e) => e.status === 'running').length,
    [entries],
  )

  // The headline "this week"/"this month" figures ignore the filters on
  // purpose — they're the standing numbers, not a slice of them.
  const weekSeconds = useMemo(() => {
    const range = presetRange('this_week')
    return totalSeconds(entries.filter((e) => e.date >= range.from && e.date <= range.to))
  }, [entries])
  const monthSeconds = useMemo(() => {
    const range = presetRange('this_month')
    return totalSeconds(entries.filter((e) => e.date >= range.from && e.date <= range.to))
  }, [entries])

  const companyNodes = useMemo<BreakdownNode[]>(
    () =>
      tree.map((company) => ({
        key: company.id,
        label: company.name,
        seconds: company.seconds,
        children: company.projects.map((project) => ({
          key: `${company.id}/${project.id}`,
          label: project.name,
          seconds: project.seconds,
          children: project.workItems.map((item) => ({
            key: `${company.id}/${project.id}/${item.id}`,
            label: item.name,
            hint: item.code,
            seconds: item.seconds,
            children: item.contributors.map((c) => ({
              key: `${company.id}/${project.id}/${item.id}/${c.name}`,
              label: c.name,
              seconds: c.seconds,
            })),
          })),
        })),
      })),
    [tree],
  )

  // Projects and work items get their own flat, already-sorted views so a
  // project report doesn't require expanding its company first.
  const projectNodes = useMemo<BreakdownNode[]>(() => {
    const rows = tree.flatMap((company) =>
      company.projects.map((project) => ({
        key: `${company.id}/${project.id}`,
        label: project.name,
        hint: company.name,
        seconds: project.seconds,
        children: project.workItems.map((item) => ({
          key: `${company.id}/${project.id}/${item.id}`,
          label: item.name,
          hint: item.code,
          seconds: item.seconds,
        })),
      })),
    )
    return rows.sort((a, b) => b.seconds - a.seconds)
  }, [tree])

  const workItemNodes = useMemo<BreakdownNode[]>(() => {
    const rows = tree.flatMap((company) =>
      company.projects.flatMap((project) =>
        project.workItems.map((item) => ({
          key: `${company.id}/${project.id}/${item.id}`,
          label: item.name,
          hint: `${item.code} · ${company.name} · ${project.name}`,
          seconds: item.seconds,
          children: item.contributors.map((c) => ({
            key: `${company.id}/${project.id}/${item.id}/${c.name}`,
            label: c.name,
            seconds: c.seconds,
          })),
        })),
      ),
    )
    return rows.sort((a, b) => b.seconds - a.seconds)
  }, [tree])

  const employeeNodes = useMemo<BreakdownNode[]>(
    () =>
      byUser.map((u) => {
        const children: BreakdownNode[] = tree
          .flatMap((company) =>
            company.projects.flatMap((project) =>
              project.workItems.flatMap((item) => {
                const share = item.contributors.find((c) => c.name === u.name)
                if (!share) return []
                const node: BreakdownNode = {
                  key: `${u.name}/${item.id}/${project.id}`,
                  label: item.name,
                  hint: `${company.name} · ${project.name}`,
                  seconds: share.seconds,
                }
                return [node]
              }),
            ),
          )
          .sort((a, b) => b.seconds - a.seconds)

        return {
          key: u.name,
          label: u.name,
          seconds: u.seconds,
          children,
        }
      }),
    [byUser, tree],
  )

  const openEdit = (entry: TimeEntry) => {
    setEditing(entry)
    setEditorOpen(true)
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader title={t('time.reportsTitle')} subtitle={t('time.reportsSubtitle')} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={Clock}
            label={t('time.totalHours')}
            value={formatHoursMinutes(summary.seconds)}
          />
          <StatCard icon={Users} label={t('time.teamMembers')} value={String(users.length)} />
          <StatCard
            icon={Timer}
            label={t('time.activeTimers')}
            value={String(activeTimers)}
            accent={activeTimers > 0}
          />
          <StatCard
            icon={ListChecks}
            label={t('time.thisWeek')}
            value={formatHoursMinutes(weekSeconds)}
          />
          <StatCard
            icon={Building2}
            label={t('time.thisMonth')}
            value={formatHoursMinutes(monthSeconds)}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('time.filters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReportFiltersBar
              filters={filters}
              onChange={setFilters}
              preset={preset}
              onPresetChange={setPreset}
              users={users}
              companies={companies}
              projects={projects}
              workItems={workItems}
            />
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
              <span>{t('time.summaryEntries', { count: summary.entries })}</span>
              <span>{t('time.summaryUsers', { count: summary.users })}</span>
              <span>{t('time.summaryCompanies', { count: summary.companies })}</span>
              <span>{t('time.summaryProjects', { count: summary.projects })}</span>
              <span>{t('time.summaryWorkItems', { count: summary.workItems })}</span>
              <span className="ms-auto font-mono text-sm text-foreground">
                {formatHoursMinutes(summary.seconds)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">{t('time.employees')}</TabsTrigger>
            <TabsTrigger value="companies">{t('time.companies')}</TabsTrigger>
            <TabsTrigger value="projects">{t('time.projects')}</TabsTrigger>
            <TabsTrigger value="workItems">{t('time.workItems')}</TabsTrigger>
            <TabsTrigger value="entries">{t('time.entries')}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardContent className="p-3">
                {loading ? (
                  <Loading />
                ) : (
                  <BreakdownList nodes={employeeNodes} emptyLabel={t('time.noData')} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card>
              <CardContent className="p-3">
                {loading ? <Loading /> : <BreakdownList nodes={companyNodes} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardContent className="p-3">
                {loading ? <Loading /> : <BreakdownList nodes={projectNodes} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workItems">
            <Card>
              <CardContent className="p-3">
                {loading ? <Loading /> : <BreakdownList nodes={workItemNodes} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entries">
            <Card>
              <CardContent className="p-3">
                {/* Reports are where any entry can be corrected — the tracker
                    page only ever unlocks your own rows. */}
                <TimeEntriesTable rows={filtered} canEdit={() => true} onEdit={openEdit} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <TimeEntryDialog
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
        workItems={workItems}
        userName={userName}
      />
    </div>
  )
}

function Loading() {
  const { t } = useTranslation()
  return <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <p
          className={
            accent
              ? 'mt-1 font-mono text-xl tabular-nums text-emerald-400'
              : 'mt-1 font-mono text-xl tabular-nums'
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
