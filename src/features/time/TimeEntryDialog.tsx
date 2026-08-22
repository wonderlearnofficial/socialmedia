import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateTimeEntry, useUpdateTimeEntry } from '@/hooks/useTimeTracker'
import { formatDuration, manualRange, toDateInput, toTimeInput } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'
import type { WorkItemView } from './useTimeData'
import { WorkItemSelector } from './WorkItemSelector'

interface TimeEntryDialogProps {
  open: boolean
  onClose: () => void
  /** null adds a new manual entry; a value edits that one. `mode` decides
   *  whether an entry is being changed or copied into a fresh one. */
  entry: TimeEntry | null
  mode?: 'edit' | 'duplicate'
  workItems: WorkItemView[]
  recentIds?: string[]
  userName: string
}

const todayKey = () => toDateInput(new Date().toISOString())

export function TimeEntryDialog({
  open,
  onClose,
  entry,
  mode = 'edit',
  workItems,
  recentIds = [],
  userName,
}: TimeEntryDialogProps) {
  const { t } = useTranslation()
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()

  const [workItemId, setWorkItemId] = useState<string | null>(null)
  const [date, setDate] = useState(todayKey)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)

  const isDuplicate = mode === 'duplicate'
  const isEditing = Boolean(entry) && !isDuplicate

  useEffect(() => {
    if (!open) return
    if (entry) {
      setWorkItemId(entry.workItemId)
      // A duplicate keeps the work and the description but lands on today —
      // the whole point is re-logging the same work on a new day.
      setDate(isDuplicate ? todayKey() : entry.date)
      setStart(toTimeInput(entry.startTime))
      setEnd(entry.endTime ? toTimeInput(entry.endTime) : toTimeInput(new Date().toISOString()))
      setDescription(entry.description)
    } else {
      setWorkItemId(null)
      setDate(todayKey())
      setStart('09:00')
      setEnd('10:00')
      setDescription('')
    }
  }, [open, entry, isDuplicate])

  const range = manualRange(date, start, end)

  const submit = async () => {
    if (!workItemId || !range.isValid) return
    setPending(true)
    try {
      const { startTime, endTime, duration } = range
      if (isEditing && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          patch: {
            workItemId,
            description: description.trim(),
            date,
            startTime,
            endTime,
            duration,
            // Keep `manual` as-is; a tracked entry that gets corrected becomes
            // `edited`, so a report can still tell the two apart.
            status: entry.status === 'manual' ? 'manual' : 'edited',
          },
        })
        toast.success(t('time.entryUpdated'))
      } else {
        await createEntry.mutateAsync({
          userName,
          workItemId,
          description: description.trim(),
          date,
          startTime,
          endTime,
          duration,
          status: 'manual',
        })
        toast.success(t('time.entrySaved'))
      }
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('time.editEntry')
              : isDuplicate
                ? t('time.duplicateEntry')
                : t('time.addTime')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="entry-date">{t('time.date')}</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-work-item">{t('time.workItem')}</Label>
            {/* The same selector the timer uses — one way to find work. */}
            <WorkItemSelector
              id="entry-work-item"
              value={workItemId}
              onSelect={setWorkItemId}
              workItems={workItems}
              recentIds={recentIds}
              createdBy={userName}
              placeholder={t('time.selectWorkItem')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-description">{t('time.descriptionOptional')}</Label>
            <Input
              id="entry-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('time.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-start">{t('time.start')}</Label>
              <Input
                id="entry-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={cn(
                  !range.isValid && 'border-destructive focus-visible:ring-destructive',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-end">{t('time.end')}</Label>
              <Input
                id="entry-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={cn(
                  !range.isValid && 'border-destructive focus-visible:ring-destructive',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('time.duration')}</Label>
              <div
                className={cn(
                  'flex h-9 items-center rounded-md border px-3 font-mono text-sm tabular-nums',
                  !range.isValid
                    ? 'border-destructive text-destructive bg-destructive/5 font-semibold'
                    : 'border-input text-foreground',
                )}
              >
                {range.isValid ? formatDuration(range.duration) : '--:--:--'}
              </div>
            </div>

            {!range.isValid && (
              <p className="col-span-3 text-xs font-medium text-destructive">
                {t('time.endBeforeStart', 'End time cannot be before start time')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={submit} disabled={pending || !workItemId || !range.isValid}>
            {pending && <Loader2 className="animate-spin" />}
            {isEditing ? t('time.saveChanges') : t('time.addEntry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
