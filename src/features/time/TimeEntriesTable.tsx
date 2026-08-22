import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Copy, MoreVertical, Pencil, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTimeEntry } from '@/hooks/useTimeTracker'
import { formatDateShort } from '@/lib/dates'
import { entrySeconds, formatHm, toTimeInput } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'
import { EntryStatusBadge } from './EntryStatusBadge'
import type { TimeEntryView } from './useTimeData'

interface TimeEntriesTableProps {
  rows: TimeEntryView[]
  /** Hidden on the personal view, where every row is yours anyway. */
  showUser?: boolean
  showDate?: boolean
  showDescription?: boolean
  /** Today's list is about what you worked on and for how long — start/end
   *  clock times are detail that belongs in the full entry tables. */
  showTimes?: boolean
  /** Decides which rows get an actions menu — you can only change your own
   *  time on the tracker page; Time Reports passes `() => true`. */
  canEdit?: (entry: TimeEntry) => boolean
  onEdit?: (entry: TimeEntry) => void
  onDuplicate?: (entry: TimeEntry) => void
  onResume?: (entry: TimeEntry) => void
  emptyLabel?: string
}

export function TimeEntriesTable({
  rows,
  showUser = true,
  showDate = true,
  showDescription = true,
  showTimes = true,
  canEdit,
  onEdit,
  onDuplicate,
  onResume,
  emptyLabel,
}: TimeEntriesTableProps) {
  const { t } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null)
  const remove = useDeleteTimeEntry()

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await remove.mutateAsync(pendingDelete.id)
      toast.success(t('time.entryDeleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPendingDelete(null)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel ?? t('time.noEntries')}
      </p>
    )
  }

  const menuFor = (entry: TimeEntry) => {
    if (!(canEdit?.(entry) ?? false) || entry.status === 'running') return null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t('time.entryActions')}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onResume && (
            <DropdownMenuItem onSelect={() => onResume(entry)}>
              <Play />
              {t('time.resume')}
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onSelect={() => onEdit(entry)}>
              <Pencil />
              {t('time.edit')}
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onSelect={() => onDuplicate(entry)}>
              <Copy />
              {t('time.duplicate')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setPendingDelete(entry)}
            className="text-destructive focus:text-destructive [&_svg]:text-destructive"
          >
            <Trash2 />
            {t('time.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      {/* Phones get a compact list — a nine-column table squeezed onto a
          360px screen is unreadable no matter how it scrolls. */}
      <ul className="divide-y sm:hidden">
        {rows.map(({ entry, work }) => (
          <li key={entry.id} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {work?.item.name ?? t('time.unknownWorkItem')}
                </span>
                <EntryStatusBadge status={entry.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {[work?.company?.name, work?.project?.name].filter(Boolean).join(' · ')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {showUser && `${entry.userName} · `}
                {showDate && `${formatDateShort(entry.date)} · `}
                {toTimeInput(entry.startTime)}
                {entry.endTime ? ` — ${toTimeInput(entry.endTime)}` : ''}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 font-mono text-sm tabular-nums',
                entry.status === 'running' && 'text-emerald-400',
              )}
            >
              {formatHm(entrySeconds(entry))}
            </span>
            {menuFor(entry)}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              {showDate && <th className="px-2 py-2 text-start font-medium">{t('time.date')}</th>}
              {showUser && <th className="px-2 py-2 text-start font-medium">{t('time.user')}</th>}
              <th className="px-2 py-2 text-start font-medium">{t('time.workItem')}</th>
              <th className="px-2 py-2 text-start font-medium">{t('time.project')}</th>
              <th className="px-2 py-2 text-start font-medium">{t('time.company')}</th>
              {showDescription && (
                <th className="px-2 py-2 text-start font-medium">{t('time.description')}</th>
              )}
              {showTimes && (
                <>
                  <th className="px-2 py-2 text-end font-medium">{t('time.start')}</th>
                  <th className="px-2 py-2 text-end font-medium">{t('time.end')}</th>
                </>
              )}
              <th className="px-2 py-2 text-end font-medium">{t('time.duration')}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, work }) => (
              <tr key={entry.id} className="border-b border-border/50 last:border-0">
                {showDate && (
                  <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">
                    {formatDateShort(entry.date)}
                  </td>
                )}
                {showUser && <td className="whitespace-nowrap px-2 py-2">{entry.userName}</td>}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {work?.item.name ?? t('time.unknownWorkItem')}
                    </span>
                    <EntryStatusBadge status={entry.status} />
                  </div>
                </td>
                <td className="px-2 py-2 text-muted-foreground">{work?.project?.name ?? '—'}</td>
                <td className="px-2 py-2 text-muted-foreground">{work?.company?.name ?? '—'}</td>
                {showDescription && (
                  <td className="max-w-[200px] truncate px-2 py-2 text-muted-foreground">
                    {entry.description || '—'}
                  </td>
                )}
                {showTimes && (
                  <>
                    <td className="whitespace-nowrap px-2 py-2 text-end tabular-nums text-muted-foreground">
                      {toTimeInput(entry.startTime)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-end tabular-nums text-muted-foreground">
                      {entry.endTime ? toTimeInput(entry.endTime) : '—'}
                    </td>
                  </>
                )}
                <td
                  className={cn(
                    'whitespace-nowrap px-2 py-2 text-end font-mono tabular-nums',
                    entry.status === 'running' && 'text-emerald-400',
                  )}
                >
                  {formatHm(entrySeconds(entry))}
                </td>
                <td className="px-1 py-2">{menuFor(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('time.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('time.deleteConfirmBody')}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('editor.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={remove.isPending}>
              {t('time.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
