import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { detectMedia, fileNameFromUrl } from '@/lib/media'
import { PROVIDER_ICON } from './MediaProviderBadge'

/**
 * The "Content Link" block shown under post details: provider, file name and
 * a way out to the original asset.
 */
export function ContentLinkCard({
  url,
  fileName,
  onPreview,
}: {
  url: string
  fileName?: string
  onPreview?: () => void
}) {
  const { t } = useTranslation()
  const media = detectMedia(url)
  const Icon = PROVIDER_ICON[media.provider]
  const name = fileName ?? fileNameFromUrl(url) ?? url

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{media.label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview}>
            {t('post.preview')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">{t('post.openOriginal')}</span>
        </Button>
      </div>
    </div>
  )
}
