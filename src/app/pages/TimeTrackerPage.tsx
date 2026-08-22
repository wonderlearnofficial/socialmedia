import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { TimeEntryDialog } from '@/features/time/TimeEntryDialog'
import { ProjectSettingsDialog } from '@/features/time/ProjectSettingsDialog'
import { TimeHistory } from '@/features/time/TimeHistory'
import { TimerBar } from '@/features/time/TimerBar'
import { useActiveTimer } from '@/features/time/useActiveTimer'
import { useTimeData } from '@/features/time/useTimeData'
import { validSeconds } from '@/features/time/integrity'
import { formatHoursMinutes, toDateInput } from '@/lib/time'
import type { TimeEntry } from '@/types'

export function TimeTrackerPage() {
  const { t } = useTranslation()
  const { workItems, workItemById, entryViews, palette, loading } = useTimeData()
  const { userName, start } = useActiveTimer()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [dialogMode, setDialogMode] = useState<'edit' | 'duplicate'>('edit')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const today = toDateInput(new Date().toISOString())

  const mine = useMemo(
    () => entryViews.filter((row) => row.entry.userName === userName),
    [entryViews, userName],
  )

  // The day's total lives in the page header — it's the one number worth a
  // glance, and it used to be small muted text at the edge of a section.
  // Excludes invalid rows, exactly like the tables below — a headline figure
  // that disagrees with the list under it is worse than no headline.
  const todayTotal = validSeconds(
    mine.filter((row) => row.entry.date === today).map((row) => row.entry),
  )

  // What the work selector opens on: the work this person touched most
  // recently, newest first, deduplicated.
  const recentIds = useMemo(() => {
    const seen: string[] = []
    for (const { entry } of mine) {
      if (!seen.includes(entry.workItemId)) seen.push(entry.workItemId)
      if (seen.length >= 8) break
    }
    return seen
  }, [mine])

  const openDialog = (entry: TimeEntry | null, mode: 'edit' | 'duplicate' = 'edit') => {
    setEditing(entry)
    setDialogMode(mode)
    setDialogOpen(true)
  }

  const resume = async (entry: TimeEntry) => {
    try {
      await start(entry.workItemId, entry.description)
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <PageHeader
          title={t('time.title')}
          subtitle={t('time.subtitle')}
          actions={
            <div className="flex items-end gap-4">
              <div className="text-end">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t('time.today')}
                </div>
                <div className="font-mono text-xl tabular-nums">
                  {formatHoursMinutes(todayTotal)}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)}>
                <SlidersHorizontal />
                {t('time.projects')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openDialog(null)}>
                <Plus />
                {t('time.addTime')}
              </Button>
            </div>
          }
        />

        <TimerBar workItems={workItems} workItemById={workItemById} recentIds={recentIds} />

        {/* One list: your own time. Everyone's time still lives in Time
            Reports, which is the place built for cross-person totals. */}
        <TimeHistory
          rows={mine}
          palette={palette}
          currentUser={userName}
          loading={loading}
          onEdit={(entry) => openDialog(entry)}
          onDuplicate={(entry) => openDialog(entry, 'duplicate')}
          onResume={resume}
        />
      </div>

      <ProjectSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        palette={palette}
        rows={entryViews}
        createdBy={userName}
      />

      <TimeEntryDialog
        open={dialogOpen}
        entry={editing}
        mode={dialogMode}
        onClose={() => setDialogOpen(false)}
        workItems={workItems}
        recentIds={recentIds}
        userName={userName}
      />
    </div>
  )
}
