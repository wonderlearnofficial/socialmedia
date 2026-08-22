import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, CloudDownload, FolderPlus, FolderUp, HardDrive, Upload } from 'lucide-react'
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
import { CreateFolderDialog } from '@/features/files/CreateFolderDialog'
import { CreateGoogleFileDialog } from '@/features/files/CreateGoogleFileDialog'
import { FileBreadcrumbs } from '@/features/files/FileBreadcrumbs'
import { FileBrowser } from '@/features/files/FileBrowser'
import { FilePreviewModal } from '@/features/files/FilePreviewModal'
import {
  FileToolbar,
  type FileFilterCategory,
  type FileSortKey,
} from '@/features/files/FileToolbar'
import { ImportFromDriveDialog } from '@/features/files/ImportFromDriveDialog'
import { useDriveSync } from '@/features/files/useDriveSync'
import { MoveItemDialog, type MoveTarget } from '@/features/files/MoveItemDialog'
import { RenameItemDialog, type RenameTarget } from '@/features/files/RenameItemDialog'
import { StorageSummary } from '@/features/files/StorageSummary'
import { UploadDropzoneOverlay } from '@/features/files/UploadDropzoneOverlay'
import { UploadProgressPanel } from '@/features/files/UploadProgressPanel'
import { useFileUpload } from '@/features/files/useFileUpload'
import { useFileDrop } from '@/features/files/useFileDrop'
import { useDeleteFile, useDeleteFolder, useFiles, useFolders } from '@/hooks/useFiles'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useSession } from '@/hooks/useSession'
import { trashDriveItem } from '@/services/upload'
import { GOOGLE_FILE_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import {
  GOOGLE_FILE_KINDS,
  type DriveFile,
  type DriveFolder,
  type GoogleFileKind,
  type WorkspaceId,
} from '@/types'

export function FilesPage() {
  const { t } = useTranslation()
  const activeWorkspace = useAppSelector((s) => s.settings.activeWorkspace)
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceId | 'all'>('all')
  const { displayName } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentFolderId = searchParams.get('folder')

  const effectiveWorkspace: WorkspaceId =
    workspaceFilter === 'all' ? activeWorkspace || 'wonderlearn' : workspaceFilter

  const { data: folders = [], isLoading: foldersLoading } = useFolders(workspaceFilter)
  const { data: files = [], isLoading: filesLoading } = useFiles(workspaceFilter)
  const { data: teamMembers = [] } = useTeamMembers()

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null

  // Drive is the source of truth: reconcile this folder against it on open,
  // on navigation, and whenever the tab regains focus — which is exactly when
  // someone has just been rearranging things in Drive itself.
  const driveSync = useDriveSync({
    folder: currentFolder,
    workspace: effectiveWorkspace,
    folders,
    files,
  })

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
  const [category, setCategory] = useState<FileFilterCategory>('all')
  const [sortKey, setSortKey] = useState<FileSortKey>('modified')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
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
  const uploadedBy = displayName || 'Dr. Wael Elmayyah'
  const { tasks, uploadFiles, retryTask, dismissTask } = useFileUpload({
    workspace: effectiveWorkspace,
    uploadedBy,
    currentFolder,
  })
  const { isDragging, dropProps } = useFileDrop(uploadFiles)

  const navigate = (folder: DriveFolder | null) => {
    if (folder) setSearchParams({ folder: folder.id })
    else setSearchParams({})
  }

  const q = query.trim().toLowerCase()

  // Filter & Sort subfolders
  const visibleSubfolders = useMemo(() => {
    if (category === 'images' || category === 'documents' || category === 'videos') {
      return []
    }
    let list = folders.filter((f) =>
      q ? f.name.toLowerCase().includes(q) : f.parentId === (currentFolder?.id ?? null),
    )

    list = [...list].sort((a, b) => {
      let res = 0
      if (sortKey === 'name') res = a.name.localeCompare(b.name)
      else if (sortKey === 'created' || sortKey === 'modified')
        res = a.createdAt.localeCompare(b.createdAt)
      return sortDirection === 'asc' ? res : -res
    })

    return list
  }, [folders, currentFolder, q, category, sortKey, sortDirection])

  // Filter & Sort all file types and extensions
  const visibleFiles = useMemo(() => {
    if (category === 'folders') return []

    let list = files.filter((f) => {
      const inCurrentDir = q ? true : f.folderId === (currentFolder?.id ?? null)
      if (!inCurrentDir) return false

      if (q && !f.name.toLowerCase().includes(q) && !f.type.toLowerCase().includes(q)) {
        return false
      }

      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      const type = f.type.toLowerCase()

      if (category === 'images') {
        return (
          type.startsWith('image/') ||
          ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico', 'avif'].includes(ext)
        )
      }
      if (category === 'videos') {
        return type.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)
      }
      if (category === 'documents') {
        return (
          type === 'application/pdf' ||
          type.startsWith('text/') ||
          type.includes('document') ||
          type.includes('presentation') ||
          type.includes('spreadsheet') ||
          [
            'pdf',
            'doc',
            'docx',
            'gdoc',
            'ppt',
            'pptx',
            'gslides',
            'xls',
            'xlsx',
            'gsheet',
            'csv',
            'txt',
            'md',
          ].includes(ext)
        )
      }

      return true
    })

    list = [...list].sort((a, b) => {
      let res: number
      if (sortKey === 'name') res = a.name.localeCompare(b.name)
      else if (sortKey === 'size') res = (a.size || 0) - (b.size || 0)
      else if (sortKey === 'type') res = (a.type || '').localeCompare(b.type || '')
      else res = (a.createdAt || '').localeCompare(b.createdAt || '')
      return sortDirection === 'asc' ? res : -res
    })

    return list
  }, [files, currentFolder, q, category, sortKey, sortDirection])

  const confirmDeleteFile = async () => {
    if (!deleteFile) return
    try {
      await trashDriveItem('file', deleteFile.driveFileId)
      await removeFile.mutateAsync(deleteFile.id)
      toast.success(t('files.deleted', 'File deleted'))
    } catch {
      toast.error(t('common.errorTitle', 'Something went wrong'))
    } finally {
      setDeleteFile(null)
    }
  }

  const confirmDeleteFolder = async () => {
    if (!deleteFolder) return
    try {
      await trashDriveItem('folder', deleteFolder.driveFolderId)
      await removeFolder.mutateAsync(deleteFolder.id)
      toast.success(t('files.deleted', 'Folder deleted'))
    } catch {
      toast.error(t('common.errorTitle', 'Something went wrong'))
    } finally {
      setDeleteFolder(null)
    }
  }

  const isLoading = foldersLoading || filesLoading

  return (
    <div
      {...dropProps}
      className="relative flex h-full flex-col overflow-y-auto bg-[#07090B] p-4 sm:p-6 lg:p-8"
    >
      {/* Hidden file inputs */}
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
        // @ts-expect-error non-standard directory upload attribute
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        {/* Main Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t('nav.files', 'Files')}
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#A7ADB5]">
              {t('files.subtitle', 'Everything the team has uploaded, organized in Drive folders')}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. New Folder (Primary CTA in Wonder Blue) */}
            <Button
              size="sm"
              onClick={() => setCreateFolderOpen(true)}
              className="gap-2 rounded-xl bg-[#009FE2] text-xs font-semibold text-white shadow-[0_0_20px_rgba(0,159,226,0.3)] transition-all hover:bg-[#009FE2]/90 hover:brightness-110"
            >
              <FolderPlus className="size-4" />
              <span>{t('files.newFolder', 'New folder')}</span>
            </Button>

            {/* 2. New Google File */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 rounded-xl border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#181D22] hover:text-[#009FE2]"
                >
                  <HardDrive className="size-4 text-[#009FE2]" />
                  <span>{t('files.newGoogleFile', 'New Google file')}</span>
                  <ChevronDown className="size-3 text-[#6F7782]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] p-1 text-white shadow-xl"
              >
                {GOOGLE_FILE_KINDS.map((kind) => {
                  const { icon: Icon, labelKey } = GOOGLE_FILE_META[kind]
                  return (
                    <DropdownMenuItem
                      key={kind}
                      onSelect={() => setGoogleKind(kind)}
                      className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
                    >
                      <Icon className="size-4 text-[#009FE2]" />
                      <span>{t(labelKey)}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. Upload Files */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => filesInputRef.current?.click()}
              className="gap-2 rounded-xl border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#181D22] hover:text-[#009FE2]"
            >
              <Upload className="size-4 text-[#009FE2]" />
              <span>{t('files.uploadFiles', 'Upload files')}</span>
            </Button>

            {/* 4. Upload Folder */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              className="gap-2 rounded-xl border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#181D22] hover:text-[#009FE2]"
            >
              <FolderUp className="size-4 text-[#009FE2]" />
              <span>{t('files.uploadFolder', 'Upload folder')}</span>
            </Button>

            {/* 5. Force a re-mirror. It runs automatically too — this is for
                   "I just changed something in Drive and want it now". */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void driveSync.resync()}
              disabled={driveSync.syncing}
              title={driveSync.error ?? undefined}
              className="gap-2 rounded-xl border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#181D22] hover:text-[#009FE2]"
            >
              <CloudDownload
                className={cn('size-4 text-[#009FE2]', driveSync.syncing && 'animate-pulse')}
              />
              <span>
                {driveSync.syncing
                  ? t('files.syncing')
                  : driveSync.error
                    ? t('files.syncFailed')
                    : t('files.syncNow')}
              </span>
            </Button>
          </div>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#101317] px-3.5 py-2">
          <FileBreadcrumbs
            breadcrumbs={q ? [] : breadcrumbs}
            onNavigate={(folder) => {
              setQuery('')
              navigate(folder)
            }}
          />
        </div>

        {/* Toolbar: Search, Filters, Sort, View Mode */}
        <FileToolbar
          query={query}
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortDirection={sortDirection}
          onToggleSortDirection={() =>
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
          }
          view={view}
          onViewChange={setView}
        />

        {/* Content Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {t('files.foldersAndFiles', 'Folders & Files')}
          </h2>
          <span className="text-xs text-[#A7ADB5]">
            {visibleSubfolders.length + visibleFiles.length} {t('files.items', 'items')}
          </span>
        </div>

        {/* File Browser Grid / List Area */}
        <div className="min-h-56 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#101317]"
                />
              ))}
            </div>
          ) : (
            <FileBrowser
              subfolders={visibleSubfolders}
              files={visibleFiles}
              allFolders={folders}
              allFiles={files}
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
              onUploadClick={() => filesInputRef.current?.click()}
              onCreateFolderClick={() => setCreateFolderOpen(true)}
            />
          )}
        </div>

        {/* Bottom Storage Summary Panel */}
        <div className="mt-auto pt-4">
          <StorageSummary folders={folders} files={files} teamMembers={teamMembers} />
        </div>
      </div>

      {/* Full-Page Drag-and-Drop Overlay */}
      <UploadDropzoneOverlay isDragging={isDragging} currentFolder={currentFolder} />

      {/* Floating Upload Progress Panel */}
      <UploadProgressPanel tasks={tasks} onRetry={retryTask} onDismiss={dismissTask} />

      {/* Modals and Dialogs */}
      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        workspace={effectiveWorkspace}
        parentFolder={currentFolder}
        createdBy={uploadedBy}
      />
      <CreateGoogleFileDialog
        kind={googleKind}
        onClose={() => setGoogleKind(null)}
        workspace={effectiveWorkspace}
        parentFolder={currentFolder}
        createdBy={uploadedBy}
      />
      <ImportFromDriveDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        workspace={effectiveWorkspace}
        currentFolder={currentFolder}
        existingFolders={folders}
        existingFiles={files}
        importedBy={uploadedBy}
      />
      <FilePreviewModal
        file={previewFile}
        currentFolder={currentFolder}
        onClose={() => setPreviewFile(null)}
        onRename={(file) =>
          setRenameTarget({
            itemType: 'file',
            id: file.id,
            driveId: file.driveFileId,
            name: file.name,
          })
        }
        onMove={(file) =>
          setMoveTarget({
            itemType: 'file',
            id: file.id,
            driveId: file.driveFileId,
            name: file.name,
          })
        }
        onDelete={setDeleteFile}
      />
      <RenameItemDialog target={renameTarget} onClose={() => setRenameTarget(null)} />
      <MoveItemDialog
        target={moveTarget}
        onClose={() => setMoveTarget(null)}
        workspace={effectiveWorkspace}
      />

      {/* Delete Confirmation Dialogs with Wonder Red button */}
      <Dialog open={Boolean(deleteFile)} onOpenChange={(next) => !next && setDeleteFile(null)}>
        <DialogContent className="max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {t('files.deleteFileConfirmTitle', 'Delete this file?')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#A7ADB5]">
            {t('files.deleteConfirmBody', { name: deleteFile?.name })}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteFile(null)}
              className="rounded-xl text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
            >
              {t('editor.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={confirmDeleteFile}
              disabled={removeFile.isPending}
              className="rounded-xl bg-[#E30613] text-xs font-semibold text-white shadow-[0_0_15px_rgba(227,6,19,0.3)] hover:bg-[#E30613]/90"
            >
              {t('files.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteFolder)} onOpenChange={(next) => !next && setDeleteFolder(null)}>
        <DialogContent className="max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {t('files.deleteFolderConfirmTitle', 'Delete this folder?')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#A7ADB5]">
            {t('files.deleteConfirmBody', { name: deleteFolder?.name })}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteFolder(null)}
              className="rounded-xl text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
            >
              {t('editor.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={confirmDeleteFolder}
              disabled={removeFolder.isPending}
              className="rounded-xl bg-[#E30613] text-xs font-semibold text-white shadow-[0_0_15px_rgba(227,6,19,0.3)] hover:bg-[#E30613]/90"
            >
              {t('files.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
