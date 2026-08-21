import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  ExternalLink,
  Folder,
  MoreVertical,
  Move,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatBytes } from '@/lib/format'
import { formatDateFull } from '@/lib/dates'
import { driveThumbnailUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { DriveFile, DriveFolder } from '@/types'
import { fileTypeIcon } from './fileIcons'

interface FileBrowserProps {
  breadcrumbs: DriveFolder[]
  subfolders: DriveFolder[]
  files: DriveFile[]
  view: 'grid' | 'list'
  onNavigate: (folder: DriveFolder | null) => void
  onPreview: (file: DriveFile) => void
  onRenameFile: (file: DriveFile) => void
  onRenameFolder: (folder: DriveFolder) => void
  onMoveFile: (file: DriveFile) => void
  onMoveFolder: (folder: DriveFolder) => void
  onDeleteFile: (file: DriveFile) => void
  onDeleteFolder: (folder: DriveFolder) => void
}

export function FileBrowser({
  breadcrumbs,
  subfolders,
  files,
  view,
  onNavigate,
  onPreview,
  onRenameFile,
  onRenameFolder,
  onMoveFile,
  onMoveFolder,
  onDeleteFile,
  onDeleteFolder,
}: FileBrowserProps) {
  const { t, i18n } = useTranslation()
  const isEmpty = subfolders.length === 0 && files.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigate} />

      {isEmpty ? (
        <EmptyState icon={Folder} title={t('files.emptyTitle')} body={t('files.emptyBody')} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {subfolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onOpen={() => onNavigate(folder)}
              onRename={() => onRenameFolder(folder)}
              onMove={() => onMoveFolder(folder)}
              onDelete={() => onDeleteFolder(folder)}
            />
          ))}
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onOpen={() => onPreview(file)}
              onRename={() => onRenameFile(file)}
              onMove={() => onMoveFile(file)}
              onDelete={() => onDeleteFile(file)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-y-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('files.name')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('files.type')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('files.size')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('files.modified')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {subfolders.map((folder) => (
                <tr
                  key={folder.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                  onClick={() => onNavigate(folder)}
                >
                  <td className="flex items-center gap-2 px-3 py-2 font-medium">
                    <Folder className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{folder.name}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t('files.folder')}</td>
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateFull(folder.createdAt, i18n.language)}
                  </td>
                  <td className="px-1" onClick={(e) => e.stopPropagation()}>
                    <ItemMenu
                      onOpenInDrive={undefined}
                      onRename={() => onRenameFolder(folder)}
                      onMove={() => onMoveFolder(folder)}
                      onDelete={() => onDeleteFolder(folder)}
                    />
                  </td>
                </tr>
              ))}
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                  onClick={() => onPreview(file)}
                >
                  <td className="flex items-center gap-2 px-3 py-2 font-medium">
                    <FileTypeGlyph type={file.type} />
                    <span className="truncate">{file.name}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{file.type || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatBytes(file.size)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateFull(file.createdAt, i18n.language)}
                  </td>
                  <td className="px-1" onClick={(e) => e.stopPropagation()}>
                    <ItemMenu
                      onOpenInDrive={() =>
                        window.open(file.driveUrl, '_blank', 'noopener,noreferrer')
                      }
                      onRename={() => onRenameFile(file)}
                      onMove={() => onMoveFile(file)}
                      onDelete={() => onDeleteFile(file)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Breadcrumbs({
  breadcrumbs,
  onNavigate,
}: {
  breadcrumbs: DriveFolder[]
  onNavigate: (folder: DriveFolder | null) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className={cn(
          'rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-accent',
          breadcrumbs.length === 0 ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {t('nav.files')}
      </button>
      {breadcrumbs.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <button
            type="button"
            onClick={() => onNavigate(folder)}
            className={cn(
              'rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-accent',
              i === breadcrumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </div>
  )
}

function FileTypeGlyph({ type }: { type: string }) {
  const Icon = fileTypeIcon(type)
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

/**
 * Drive renders a thumbnail for anything it can open — PDFs, video, Docs,
 * Slides, Sheets — not just images, so every file gets one attempt at a real
 * preview and falls back to its type glyph only if Drive has none.
 */
function FileThumb({ file }: { file: DriveFile }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [file.driveFileId])
  const Icon = fileTypeIcon(file.type)

  return (
    <div className="grid size-full aspect-square place-items-center overflow-hidden rounded-lg bg-muted/50">
      {file.driveFileId && !failed ? (
        <img
          src={driveThumbnailUrl(file.driveFileId, 400)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon className="size-8 text-muted-foreground" />
      )}
    </div>
  )
}

function ItemMenu({
  onOpenInDrive,
  onRename,
  onMove,
  onDelete,
}: {
  onOpenInDrive?: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('files.moreActions')}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onOpenInDrive && (
          <DropdownMenuItem onSelect={onOpenInDrive}>
            <ExternalLink />
            {t('files.openInDrive')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onRename}>
          <Pencil />
          {t('files.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove}>
          <Move />
          {t('files.move')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive [&_svg]:text-destructive"
        >
          <Trash2 />
          {t('files.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FolderCard({
  folder,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: {
  folder: DriveFolder
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-start gap-2 text-start"
      >
        <Folder className="size-8 text-muted-foreground" />
        <span className="w-full truncate text-sm font-medium">{folder.name}</span>
      </button>
      <div className="absolute end-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <ItemMenu onRename={onRename} onMove={onMove} onDelete={onDelete} />
      </div>
    </div>
  )
}

function FileCard({
  file,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: {
  file: DriveFile
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-start gap-2 text-start"
      >
        <FileThumb file={file} />
        <span className="w-full truncate text-sm font-medium">{file.name}</span>
        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
      </button>
      <div className="absolute end-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <ItemMenu
          onOpenInDrive={() => window.open(file.driveUrl, '_blank', 'noopener,noreferrer')}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
