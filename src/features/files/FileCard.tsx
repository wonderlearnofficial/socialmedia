import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '@/lib/format'
import { formatDateShort } from '@/lib/dates'
import { driveThumbnailUrl } from '@/lib/media'
import type { DriveFile } from '@/types'
import { fileTypeIcon, getFileExtension, getFileTypeBadgeStyle } from './fileIcons'
import { ItemContextMenu } from './ItemContextMenu'

interface FileCardProps {
  file: DriveFile
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}

export function FileCard({ file, onOpen, onRename, onMove, onDelete }: FileCardProps) {
  const { i18n } = useTranslation()
  const [retryStep, setRetryStep] = useState(0)

  useEffect(() => {
    setRetryStep(0)
  }, [file.driveFileId])

  const extension = getFileExtension(file.name, file.type)
  const Icon = fileTypeIcon(file.type, file.name)
  const badgeStyle = getFileTypeBadgeStyle(extension)

  const isImage =
    file.type.startsWith('image/') ||
    ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'AVIF'].includes(extension)

  // Try Google CDN, then Drive thumbnail, then Direct export for images
  const thumbUrl =
    isImage && file.driveFileId
      ? retryStep === 0
        ? `https://lh3.googleusercontent.com/d/${file.driveFileId}=w800`
        : retryStep === 1
          ? `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w800`
          : retryStep === 2
            ? `https://drive.google.com/uc?export=view&id=${file.driveFileId}`
            : undefined
      : undefined

  const handleImageError = () => {
    if (retryStep < 3) {
      setRetryStep((prev) => prev + 1)
    }
  }

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] text-start transition-all duration-200 hover:-translate-y-1 hover:border-[#009FE2]/40 hover:shadow-[0_8px_25px_rgba(0,159,226,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FE2]"
    >
      {/* Thumbnail Container (4:3 aspect ratio) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-[#090B0D]">
        {isImage && thumbUrl && retryStep < 3 ? (
          <img
            src={thumbUrl}
            alt={file.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            draggable={false}
            className="size-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={handleImageError}
          />
        ) : (
          <div
            className={`grid size-full place-items-center bg-gradient-to-br ${badgeStyle.gradient} p-6 transition-all group-hover:brightness-110`}
          >
            <div
              className={`grid size-14 place-items-center rounded-2xl border ${badgeStyle.border} ${badgeStyle.bg} ${badgeStyle.text} shadow-md transition-transform duration-200 group-hover:scale-105`}
            >
              <Icon className="size-7 stroke-[1.75]" />
            </div>
          </div>
        )}

        {/* File Type Badge in top corner */}
        <div
          className={`absolute start-2.5 top-2.5 flex items-center gap-1 rounded-md border ${badgeStyle.border} ${badgeStyle.bg} px-2 py-0.5 text-[10px] font-bold tracking-wider ${badgeStyle.text} backdrop-blur-md transition-colors`}
        >
          <Icon className="size-3" />
          <span>{extension}</span>
        </div>
      </div>

      {/* File Info & Context Menu */}
      <div className="flex flex-col justify-between gap-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-2 text-xs font-semibold leading-snug text-white group-hover:text-white"
              title={file.name}
            >
              {file.name}
            </h3>
            <p className="mt-1 text-[11px] text-[#A7ADB5]">
              {formatBytes(file.size)} • {formatDateShort(file.createdAt, i18n.language)}
            </p>
          </div>

          <div
            className="opacity-70 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <ItemContextMenu
              onOpen={onOpen}
              onPreview={onOpen}
              onOpenInDrive={() => window.open(file.driveUrl, '_blank', 'noopener,noreferrer')}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
