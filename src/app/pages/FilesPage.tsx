import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronDown,
  FilePlus,
  FolderPlus,
  FolderUp,
  LayoutGrid,
  List,
  Search,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreateFolderDialog } from '@/features/files/CreateFolderDialog'
import { CreateGoogleFileDialog } from '@/features/files/CreateGoogleFileDialog'
import { FileBrowser } from '@/features/files/FileBrowser'
import { FilePreviewSheet } from '@/features/files/FilePreviewSheet'
import { MoveItemDialog, type MoveTarget } from '@/features/files/MoveItemDialog'
import { RenameItemDialog, type RenameTarget } from '@/features/files/RenameItemDialog'
import { UploadProgressPanel } from '@/features/files/UploadProgressPanel'
import { useFileUpload } from '@/features/files/useFileUpload'
import { useFileDrop } from '@/features/files/useFileDrop'
import { useDeleteFile, useDeleteFolder, useFiles, useFolders } from '@/hooks/useFiles'
import { useSession } from '@/hooks/useSession'
import { trashDriveItem } from '@/services/upload'
import { GOOGLE_FILE_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import { GOOGLE_FILE_KINDS, type DriveFile, type DriveFolder, type GoogleFileKind } from '@/types'

export function FilesPage() {
  const { t } = useTranslation()
  const workspace = useAppSelector((s) => s.settings.activeWorkspace)
  const { displayName } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentFolderId = searchParams.get('folder')

  const { data: folders = [] } = useFolders(workspace)
  const { data: files = [] } = useFiles(workspace)

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null
  const breadcrumbs = useMemo(() => {
    const chain: DriveFolder[] = []
    let cursor = currentFolder
    while (cursor) {
      chain.unshift(cursor)
      cursor = folders.find((f) => f.id === cursor!.parentId) ?? null
    }
    return chain
  }, [currentFolder, folders])

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [googleKind, setGoogleKind] = useState<GoogleFileKind | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null)
  const [deleteFile, setDeleteFile] = useState<DriveFile | null>(null)
  const [deleteFolder, setDeleteFolder] = useState<DriveFolder | null>(null)

  const removeFile = useDeleteFile()
  const removeFolder = useDeleteFolder()

  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const uploadedBy = displayName || 'Unknown'
  const { tasks, uploadFiles, retryTask, dismissTask } = useFileUpload({
    workspace,
    uploadedBy,
    currentFolder,
  })
  const { isDragging, dropProps } = useFileDrop(uploadFiles)

  const navigate = (folder: DriveFolder | null) => {
    if (folder) setSearchParams({ folder: folder.id })
    else setSearchParams({})
  }

  const q = query.trim().toLowerCase()
  const visibleSubfolders = folders
    .filter((f) =>
      q ? f.name.toLowerCase().includes(q) : f.parentId === (currentFolder?.id ?? null),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  const visibleFiles = files
    .filter((f) =>
      q ? f.name.toLowerCase().includes(q) : f.folderId === (currentFolder?.id ?? null),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const confirmDeleteFile = async () => {
    if (!deleteFile) return
    try {
      await trashDriveItem('file', deleteFile.driveFileId)
      await removeFile.mutateAsync(deleteFile.id)
      toast.success(t('files.deleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setDeleteFile(null)
    }
  }

  const confirmDeleteFolder = async () => {
    if (!deleteFolder) return
    try {
      await trashDriveItem('folder', deleteFolder.driveFolderId)
      await removeFolder.mutateAsync(deleteFolder.id)
      toast.success(t('files.deleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setDeleteFolder(null)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-5 lg:p-6">
      <PageHeader
        title={t('nav.files')}
        subtitle={t('files.subtitle')}
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus />
              {t('files.newFolder')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <FilePlus />
                  {t('files.newGoogleFile')}
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {GOOGLE_FILE_KINDS.map((kind) => {
                  const { icon: Icon, labelKey } = GOOGLE_FILE_META[kind]
                  return (
                    <DropdownMenuItem key={kind} onSelect={() => setGoogleKind(kind)}>
                      <Icon />
                      {t(labelKey)}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={() => filesInputRef.current?.click()}>
              <Upload />
              {t('files.uploadFiles')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => folderInputRef.current?.click()}>
              <FolderUp />
              {t('files.uploadFolder')}
            </Button>
          </div>
        }
      />

      <input
        ref={filesInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error non-standard attribute, supported by every Chromium/Firefox browser
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('files.searchPlaceholder')}
            className="ps-8"
          />
        </div>
        <div className="ms-auto flex items-center gap-1 rounded-lg border p-0.5">
          <button
            type="button"
            aria-label={t('files.gridView')}
            onClick={() => setView('grid')}
            className={cn(
              'grid size-7 place-items-center rounded-md transition-colors',
              view === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={t('files.listView')}
            onClick={() => setView('list')}
            className={cn(
              'grid size-7 place-items-center rounded-md transition-colors',
              view === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            <List className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        {...dropProps}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col rounded-xl border border-transparent transition-colors',
          isDragging && 'border-dashed border-primary/70 bg-primary/5',
        )}
      >
        <FileBrowser
          breadcrumbs={q ? [] : breadcrumbs}
          subfolders={visibleSubfolders}
          files={visibleFiles}
          view={view}
          onNavigate={(folder) => {
            setQuery('')
            navigate(folder)
          }}
          onPreview={setPreviewFile}
          onRenameFile={(file) =>
            setRenameTarget({
              itemType: 'file',
              id: file.id,
              driveId: file.driveFileId,
              name: file.name,
            })
          }
          onRenameFolder={(folder) =>
            setRenameTarget({
              itemType: 'folder',
              id: folder.id,
              driveId: folder.driveFolderId,
              name: folder.name,
            })
          }
          onMoveFile={(file) =>
            setMoveTarget({
              itemType: 'file',
              id: file.id,
              driveId: file.driveFileId,
              name: file.name,
            })
          }
          onMoveFolder={(folder) =>
            setMoveTarget({
              itemType: 'folder',
              id: folder.id,
              driveId: folder.driveFolderId,
              name: folder.name,
            })
          }
          onDeleteFile={setDeleteFile}
          onDeleteFolder={setDeleteFolder}
        />

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl bg-background/70">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="grid size-11 place-items-center rounded-full border border-primary/40 bg-card text-primary">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-medium">{t('files.dropTitle')}</p>
              <p className="text-xs text-muted-foreground">
                {currentFolder
                  ? t('files.dropIntoFolder', { name: currentFolder.name })
                  : t('files.dropIntoRoot')}
              </p>
            </div>
          </div>
        )}
      </div>

      <UploadProgressPanel tasks={tasks} onRetry={retryTask} onDismiss={dismissTask} />

      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        workspace={workspace}
        parentFolder={currentFolder}
        createdBy={uploadedBy}
      />
      <CreateGoogleFileDialog
        kind={googleKind}
        onClose={() => setGoogleKind(null)}
        workspace={workspace}
        parentFolder={currentFolder}
        createdBy={uploadedBy}
      />
      <FilePreviewSheet file={previewFile} onClose={() => setPreviewFile(null)} />
      <RenameItemDialog target={renameTarget} onClose={() => setRenameTarget(null)} />
      <MoveItemDialog
        target={moveTarget}
        onClose={() => setMoveTarget(null)}
        workspace={workspace}
      />

      <Dialog open={Boolean(deleteFile)} onOpenChange={(next) => !next && setDeleteFile(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('files.deleteFileConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('files.deleteConfirmBody', { name: deleteFile?.name })}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteFile(null)}>
              {t('editor.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFile}
              disabled={removeFile.isPending}
            >
              {t('files.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteFolder)} onOpenChange={(next) => !next && setDeleteFolder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('files.deleteFolderConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('files.deleteConfirmBody', { name: deleteFolder?.name })}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteFolder(null)}>
              {t('editor.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFolder}
              disabled={removeFolder.isPending}
            >
              {t('files.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
