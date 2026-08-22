import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Loader2, RotateCcw, X } from 'lucide-react'
import type { UploadTask } from './useFileUpload'

interface UploadProgressPanelProps {
  tasks: UploadTask[]
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
}

export function UploadProgressPanel({ tasks, onRetry, onDismiss }: UploadProgressPanelProps) {
  const { t } = useTranslation()
  if (tasks.length === 0) return null

  const activeCount = tasks.filter((t) => t.status === 'uploading').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="fixed bottom-5 end-5 z-40 w-84 space-y-2.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {activeCount > 0 && <Loader2 className="size-3.5 animate-spin text-[#009FE2]" />}
          <p className="text-xs font-semibold text-white">
            {activeCount > 0
              ? `${t('files.uploading', 'Uploading')} (${doneCount}/${tasks.length})`
              : t('files.uploadComplete', 'Uploads Complete')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => tasks.forEach((t) => onDismiss(t.id))}
          className="text-xs text-[#6F7782] hover:text-white"
        >
          {t('common.close', 'Close')}
        </button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="space-y-1.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#101317] p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="min-w-0 flex-1 truncate text-xs font-medium text-white"
                title={task.name}
              >
                {task.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.status === 'done' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Check className="size-3.5" />
                  </span>
                )}
                {task.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => onRetry(task.id)}
                    aria-label={t('files.retry', 'Retry')}
                    className="flex items-center gap-1 text-[11px] text-[#E30613] hover:underline"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDismiss(task.id)}
                  aria-label={t('common.close', 'Close')}
                  className="text-[#6F7782] hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {task.status === 'uploading' && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#15191E]">
                <div
                  className="h-full rounded-full bg-[#009FE2] animate-pulse"
                  style={{ width: '85%' }}
                />
              </div>
            )}

            {task.status === 'error' && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#E30613]">
                <AlertCircle className="size-3 shrink-0" />
                <span className="truncate">{task.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
