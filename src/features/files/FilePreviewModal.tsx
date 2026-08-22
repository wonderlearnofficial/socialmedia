import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  Download,
  ExternalLink,
  Folder,
  ImageOff,
  Move,
  Pencil,
  Play,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { driveFilePreviewUrl, driveThumbnailUrl } from '@/lib/media'
import { formatBytes } from '@/lib/format'
import { formatDateFull } from '@/lib/dates'
import { usePostsQuery } from '@/hooks/usePosts'
import { useUpdateFile } from '@/hooks/useFiles'
import type { DriveFile, DriveFolder } from '@/types'

interface FilePreviewModalProps {
  file: DriveFile | null
  currentFolder?: DriveFolder | null
  onClose: () => void
  onRename: (file: DriveFile) => void
  onMove: (file: DriveFile) => void
  onDelete: (file: DriveFile) => void
}

export function FilePreviewModal({
  file,
  currentFolder,
  onClose,
  onRename,
  onMove,
  onDelete,
}: FilePreviewModalProps) {
  const { t, i18n } = useTranslation()
  const [failed, setFailed] = useState(false)
  const { data: posts = [] } = usePostsQuery()
  const updateFile = useUpdateFile()

  useEffect(() => {
    setFailed(false)
  }, [file?.id])

  if (!file) return null

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const previewUrl =
    isImage && file.driveFileId ? driveThumbnailUrl(file.driveFileId, 1600) : undefined
  const embedUrl = !isImage && file.driveFileId ? driveFilePreviewUrl(file.driveFileId) : undefined
  const linkedPost = posts.find((p) => p.id === file.postId)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.driveUrl)
    toast.success(t('files.linkCopied', 'File link copied to clipboard'))
  }

  const handleDownload = () => {
    window.open(file.driveUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl gap-0 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-0 text-white shadow-2xl backdrop-blur-xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
          <div className="min-w-0 flex-1 pe-4">
            <DialogTitle className="truncate text-base font-semibold text-white">
              {file.name}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="rounded-lg p-1 text-[#A7ADB5] transition-colors hover:bg-[#181D22] hover:text-white"
          >
            <X className="size-5" />
          </button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[80vh] overflow-y-auto">
          {/* Main Visual Preview Area */}
          <div className="flex min-h-72 md:min-h-96 md:col-span-7 items-center justify-center border-b md:border-b-0 md:border-e border-[rgba(255,255,255,0.08)] bg-[#07090B] p-4">
            {previewUrl && !failed ? (
              <img
                src={previewUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                onError={(e) => {
                  if (
                    file.driveFileId &&
                    e.currentTarget.src !==
                      `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w1600`
                  ) {
                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w1600`
                  } else {
                    setFailed(true)
                  }
                }}
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                title={file.name}
                className="h-[55vh] w-full rounded-xl border-0"
                allow="autoplay"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-[#6F7782]">
                <div className="grid size-14 place-items-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] text-[#009FE2]">
                  {isVideo ? <Play className="size-6" /> : <ImageOff className="size-6" />}
                </div>
                <p className="text-xs font-medium">{t('files.previewUnavailable')}</p>
              </div>
            )}
          </div>

          {/* Right Information & Action Panel */}
          <div className="flex flex-col justify-between p-5 md:col-span-5 bg-[#101317]">
            <div className="space-y-4">
              {/* Primary Drive action */}
              <Button
                className="w-full gap-2 rounded-xl bg-[#009FE2] font-semibold text-white shadow-[0_0_15px_rgba(0,159,226,0.3)] transition-all hover:bg-[#009FE2]/90 hover:brightness-110"
                onClick={() => window.open(file.driveUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-4" />
                {t('files.openInDrive', 'Open in Google Drive')}
              </Button>

              {/* Action buttons row */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-1.5 rounded-lg border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs text-white hover:bg-[#181D22] hover:text-[#009FE2]"
                >
                  <Download className="size-3.5 text-[#009FE2]" />
                  {t('files.download', 'Download')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 rounded-lg border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs text-white hover:bg-[#181D22] hover:text-[#009FE2]"
                >
                  <Copy className="size-3.5 text-[#009FE2]" />
                  {t('files.copyLink', 'Copy link')}
                </Button>
              </div>

              <div className="h-px bg-[rgba(255,255,255,0.08)]" />

              {/* Metadata Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7782]">{t('files.type', 'Type')}</span>
                  <span className="font-medium text-[#A7ADB5]">{file.type || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7782]">{t('files.size', 'Size')}</span>
                  <span className="font-medium text-[#A7ADB5]">{formatBytes(file.size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7782]">{t('files.uploadedBy', 'Uploaded by')}</span>
                  <span className="font-medium text-[#A7ADB5]">{file.uploadedBy || 'Team'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7782]">{t('files.createdAt', 'Created')}</span>
                  <span className="font-medium text-[#A7ADB5]">
                    {formatDateFull(file.createdAt, i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7782]">{t('files.folder', 'Folder')}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#A7ADB5]">
                    <Folder className="size-3 text-[#009FE2]" />
                    {currentFolder?.name || t('nav.files', 'Files Root')}
                  </span>
                </div>
              </div>

              <div className="h-px bg-[rgba(255,255,255,0.08)]" />

              {/* Post Linking Selector */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-[#6F7782]">
                  {t('files.linkToPost', 'Link to social post')}
                </p>
                <Select
                  value={file.postId ?? 'none'}
                  onValueChange={(v) =>
                    updateFile.mutate({ id: file.id, patch: { postId: v === 'none' ? null : v } })
                  }
                >
                  <SelectTrigger className="h-8 rounded-lg border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] text-white">
                    <SelectItem value="none">—</SelectItem>
                    {posts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linkedPost && (
                  <p className="text-[11px] text-[#009FE2]">
                    {t('files.linkedTo', { title: linkedPost.title })}
                  </p>
                )}
              </div>
            </div>

            {/* Secondary management actions */}
            <div className="mt-6 space-y-2 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onRename(file)
                  }}
                  className="flex-1 gap-1.5 text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
                >
                  <Pencil className="size-3.5" />
                  {t('files.rename', 'Rename')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onMove(file)
                  }}
                  className="flex-1 gap-1.5 text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
                >
                  <Move className="size-3.5" />
                  {t('files.move', 'Move')}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose()
                  onDelete(file)
                }}
                className="w-full gap-1.5 text-xs text-[#E30613] hover:bg-[#E30613]/10 hover:text-[#E30613]"
              >
                <Trash2 className="size-3.5" />
                {t('files.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
