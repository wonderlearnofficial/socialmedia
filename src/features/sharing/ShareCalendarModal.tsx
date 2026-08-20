import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { formatMonthTitle, toMonthKey } from '@/lib/dates'
import { appUrl } from '@/lib/utils'
import { format } from 'date-fns'

interface ShareCalendarModalProps {
  open: boolean
  onClose: () => void
  month: Date
}

/**
 * Generates a review link for the visible month. The owner opens it and lands
 * in a stripped-down review experience — no dashboard, no editing.
 */
export function ShareCalendarModal({ open, onClose, month }: ShareCalendarModalProps) {
  const { t, i18n } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const monthKey = toMonthKey(month)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setUrl(null)
    setCopied(false)

    const slug = format(month, 'MMMM-yyyy').toLowerCase()
    api
      .createShare(monthKey, slug)
      .then((share) => {
        if (!cancelled) setUrl(appUrl(`share/${share.id}`))
      })
      .catch(() => {
        if (!cancelled) toast.error(t('common.errorTitle'))
      })

    return () => {
      cancelled = true
    }
  }, [open, monthKey, month, t])

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(t('share.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Link2 className="size-4" />
          </div>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>{t('share.body')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">{t('share.sharedTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {formatMonthTitle(month, i18n.language)}
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              readOnly
              value={url ?? ''}
              placeholder={t('share.generating')}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
              aria-label={t('share.copy')}
            />
            <Button onClick={copy} disabled={!url} className="shrink-0">
              {!url ? <Loader2 className="animate-spin" /> : copied ? <Check /> : <Copy />}
              {t('share.copy')}
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={!url}
            onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink />
            {t('share.openPreview')}
          </Button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">{t('share.note')}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
