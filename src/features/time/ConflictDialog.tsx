import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toTimeInput } from '@/lib/time'
import type { TimeEntry } from '@/types'

interface ConflictDialogProps {
  open: boolean
  workItemName: string
  /** Running entries by other people on this exact work item. */
  entries: TimeEntry[]
  onContinue: () => void
  onCancel: () => void
}

/**
 * A warning, never a lock. Two people editing the same deck at once is normal;
 * what isn't normal is doing it by accident. Note this only ever fires for the
 * same work item id — two people on different items in one project are just
 * working.
 */
export function ConflictDialog({
  open,
  workItemName,
  entries,
  onContinue,
  onCancel,
}: ConflictDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4 text-amber-500" />
            {workItemName}
          </DialogTitle>
          <DialogDescription>{t('time.conflictBody')}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
          {entries.map((entry) => (
            <li key={entry.id} className="text-sm">
              <span className="font-medium">{entry.userName}</span>
              <span className="text-muted-foreground">
                {' — '}
                {t('time.startedAt', { time: toTimeInput(entry.startTime) })}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={onContinue}>{t('time.continueAnyway')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
