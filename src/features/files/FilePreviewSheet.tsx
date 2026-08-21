import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, ImageOff, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { driveFilePreviewUrl, driveThumbnailUrl } from '@/lib/media'
import { formatBytes } from '@/lib/format'
import { formatDateFull } from '@/lib/dates'
import { usePostsQuery } from '@/hooks/usePosts'
import { useUpdateFile } from '@/hooks/useFiles'
import type { DriveFile } from '@/types'

interface FilePreviewSheetProps {
  file: DriveFile | null
  onClose: () => void
}

export function FilePreviewSheet({ file, onClose }: FilePreviewSheetProps) {
  const { t, i18n } = useTranslation()
  const [failed, setFailed] = useState(false)
  const { data: posts = [] } = usePostsQuery()
  const updateFile = useUpdateFile()

  useEffect(() => setFailed(false), [file?.id])

  if (!file) return null

  // Images get the thumbnail endpoint (crisp, cheap, no iframe). Everything
  // else Drive can open — PDFs, video, Docs, Slides, Sheets — goes through
  // Drive's own viewer, which is the only thing that can actually render them.
  const isImage = file.type.startsWith('image/')
  const previewUrl =
    isImage && file.driveFileId ? driveThumbnailUrl(file.driveFileId, 1600) : undefined
  const embedUrl = !isImage && file.driveFileId ? driveFilePreviewUrl(file.driveFileId) : undefined
  const linkedPost = posts.find((p) => p.id === file.postId)

  return (
    <Sheet open={Boolean(file)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="gap-0 p-0" aria-describedby={undefined}>
        <header className="shrink-0 border-b p-5 pe-14">
          <SheetTitle className="truncate text-lg font-semibold leading-snug tracking-tight">
            {file.name}
          </SheetTitle>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
            {previewUrl && !failed ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-96 w-full object-contain"
                onError={() => setFailed(true)}
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                title={file.name}
                className="h-96 w-full border-0"
                allow="autoplay"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="grid size-11 place-items-center rounded-full border bg-muted/60 text-muted-foreground">
                  {file.type.startsWith('video/') ? (
                    <Play className="size-5" />
                  ) : (
                    <ImageOff className="size-5" />
                  )}
                </div>
                <p className="text-sm font-medium">{t('files.previewUnavailable')}</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(file.driveUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="size-3.5" />
            {t('files.openInDrive')}
          </Button>

          <Separator />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Meta label={t('files.type')}>{file.type || '—'}</Meta>
            <Meta label={t('files.size')}>{formatBytes(file.size)}</Meta>
            <Meta label={t('files.uploadedBy')}>{file.uploadedBy}</Meta>
            <Meta label={t('files.createdAt')}>
              {formatDateFull(file.createdAt, i18n.language)}
            </Meta>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('files.linkToPost')}
            </p>
            <Select
              value={file.postId ?? 'none'}
              onValueChange={(v) =>
                updateFile.mutate({ id: file.id, patch: { postId: v === 'none' ? null : v } })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {posts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {linkedPost && (
              <p className="text-xs text-muted-foreground">
                {t('files.linkedTo', { title: linkedPost.title })}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="truncate">{children}</div>
    </div>
  )
}
