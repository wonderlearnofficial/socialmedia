import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Folder, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateFile, useCreateFolder } from '@/hooks/useFiles'
import { listDriveContents, type DriveListedFile, type DriveListedFolder } from '@/services/upload'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DriveFile, DriveFolder, WorkspaceId } from '@/types'
import { fileTypeIcon } from './fileIcons'

interface ImportFromDriveDialogProps {
  open: boolean
  onClose: () => void
  workspace: WorkspaceId
  currentFolder: DriveFolder | null
  existingFolders: DriveFolder[]
  existingFiles: DriveFile[]
  importedBy: string
}

export function ImportFromDriveDialog({
  open,
  onClose,
  workspace,
  currentFolder,
  existingFolders,
  existingFiles,
  importedBy,
}: ImportFromDriveDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [newFolders, setNewFolders] = useState<DriveListedFolder[]>([])
  const [newFiles, setNewFiles] = useState<DriveListedFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const createFolder = useCreateFolder()
  const createFile = useCreateFile()

  const scan = async () => {
    setLoading(true)
    setScanError(null)
    try {
      const { folders, files } = await listDriveContents(currentFolder?.driveFolderId)
      const knownFolderIds = new Set(existingFolders.map((f) => f.driveFolderId))
      const knownFileIds = new Set(existingFiles.map((f) => f.driveFileId))
      const foldersToShow = folders.filter((f) => !knownFolderIds.has(f.id))
      const filesToShow = files.filter((f) => !knownFileIds.has(f.id))
      setNewFolders(foldersToShow)
      setNewFiles(filesToShow)
      setSelected(new Set([...foldersToShow.map((f) => f.id), ...filesToShow.map((f) => f.id)]))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t('common.errorTitle'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentFolder?.id])

  if (!open) return null

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runImport = async () => {
    setImporting(true)
    try {
      let imported = 0
      for (const folder of newFolders) {
        if (!selected.has(folder.id)) continue
        await createFolder.mutateAsync({
          workspace,
          name: folder.name,
          driveFolderId: folder.id,
          parentId: currentFolder?.id ?? null,
          createdBy: importedBy,
        })
        imported += 1
      }
      for (const file of newFiles) {
        if (!selected.has(file.id)) continue
        await createFile.mutateAsync({
          workspace,
          name: file.name,
          type: file.mimeType,
          size: file.size,
          driveUrl: file.url,
          driveFileId: file.id,
          folderId: currentFolder?.id ?? null,
          postId: null,
          uploadedBy: importedBy,
        })
        imported += 1
      }
      toast.success(t('files.importedCount', { count: imported }))
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setImporting(false)
    }
  }

  const totalFound = newFolders.length + newFiles.length

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">
            {t('files.importFromDrive')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[#A7ADB5]">
          {currentFolder
            ? t('files.importScopeFolder', { name: currentFolder.name })
            : t('files.importScopeRoot')}
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#A7ADB5]">
            <Loader2 className="size-4 animate-spin" />
            {t('files.scanningDrive')}
          </div>
        ) : scanError ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-xs text-[#E30613]">{scanError}</p>
            <button
              type="button"
              onClick={scan}
              className="inline-flex items-center gap-1.5 text-xs text-[#009FE2] hover:underline"
            >
              <RefreshCw className="size-3.5" />
              {t('files.rescan')}
            </button>
          </div>
        ) : totalFound === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Check className="size-6 text-emerald-400" />
            <p className="text-xs text-[#A7ADB5]">{t('files.nothingToImport')}</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto py-1">
            {newFolders.map((folder) => (
              <ImportRow
                key={folder.id}
                icon={Folder}
                name={folder.name}
                meta={t('files.folder')}
                checked={selected.has(folder.id)}
                onToggle={() => toggle(folder.id)}
              />
            ))}
            {newFiles.map((file) => (
              <ImportRow
                key={file.id}
                icon={fileTypeIcon(file.mimeType, file.name)}
                name={file.name}
                meta={formatBytes(file.size)}
                checked={selected.has(file.id)}
                onToggle={() => toggle(file.id)}
              />
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!loading && totalFound > 0 && (
            <button
              type="button"
              onClick={scan}
              className="me-auto inline-flex items-center gap-1.5 text-xs text-[#A7ADB5] hover:text-white"
            >
              <RefreshCw className="size-3.5" />
              {t('files.rescan')}
            </button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={importing}
            className="rounded-xl text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
          >
            {t('editor.cancel')}
          </Button>
          {totalFound > 0 && (
            <Button
              onClick={runImport}
              disabled={importing || selected.size === 0}
              className="gap-1.5 rounded-xl bg-[#009FE2] text-xs font-semibold text-white shadow-[0_0_15px_rgba(0,159,226,0.3)] hover:bg-[#009FE2]/90"
            >
              {importing && <Loader2 className="size-3.5 animate-spin" />}
              {t('files.importSelected', { count: selected.size })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportRow({
  icon: Icon,
  name,
  meta,
  checked,
  onToggle,
}: {
  icon: typeof Folder
  name: string
  meta: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-[#181D22]"
    >
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-md border transition-colors',
          checked ? 'border-[#009FE2] bg-[#009FE2] text-white' : 'border-[rgba(255,255,255,0.2)]',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <Icon className="size-4 shrink-0 text-[#009FE2]" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{name}</span>
      <span className="shrink-0 text-[11px] text-[#6F7782]">{meta}</span>
    </button>
  )
}
