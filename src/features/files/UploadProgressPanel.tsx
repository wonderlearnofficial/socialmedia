import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadTask } from './useFileUpload'

interface UploadProgressPanelProps {
  tasks: UploadTask[]
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
}

export function UploadProgressPanel({ tasks, onRetry, onDismiss }: UploadProgressPanelProps) {
  const { t } = useTranslation()
  if (tasks.length === 0) return null

  return (
    <div className="fixed bottom-4 end-4 z-40 w-80 space-y-2 rounded-xl border bg-card p-3 shadow-lg">
      <p className="px-1 text-xs font-semibold text-muted-foreground">{t('files.uploading')}</p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="space-y-1 rounded-lg border bg-background/60 p-2">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{task.name}</span>
              {task.status === 'done' && <Check className="size-3.5 shrink-0 text-emerald-500" />}
              {task.status === 'error' && (
                <AlertCircle className="size-3.5 shrink-0 text-destructive" />
              )}
              {task.status === 'error' && (
                <button
                  type="button"
                  onClick={() => onRetry(task.id)}
                  aria-label={t('files.retry')}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              {task.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => onDismiss(task.id)}
                  aria-label={t('common.close')}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {task.status === 'uploading' && (
              // Apps Script gives no upload-progress signal (tracking it via
              // XHR would force a CORS preflight it can't answer), so this is
              // an indeterminate "still working" pulse, not a real percentage.
              <div className="h-1.5 animate-pulse rounded-full bg-primary/60" />
            )}
            {task.status === 'error' && (
              <p className={cn('text-[11px] text-destructive')}>{task.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
