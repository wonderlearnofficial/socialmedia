import { useTranslation } from 'react-i18next'
import { FolderOpen, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DriveFile, DriveFolder } from '@/types'
import { FileCard } from './FileCard'
import { FolderCard } from './FolderCard'
import { FileListView } from './FileListView'

interface FileBrowserProps {
  subfolders: DriveFolder[]
  files: DriveFile[]
  allFolders?: DriveFolder[]
  allFiles?: DriveFile[]
  view: 'grid' | 'list'
  onNavigate: (folder: DriveFolder | null) => void
  onPreview: (file: DriveFile) => void
  onRenameFile: (file: DriveFile) => void
  onRenameFolder: (folder: DriveFolder) => void
  onMoveFile: (file: DriveFile) => void
  onMoveFolder: (folder: DriveFolder) => void
  onDeleteFile: (file: DriveFile) => void
  onDeleteFolder: (folder: DriveFolder) => void
  onUploadClick?: () => void
  onCreateFolderClick?: () => void
}

export function FileBrowser({
  subfolders,
  files,
  allFolders = [],
  allFiles = [],
  view,
  onNavigate,
  onPreview,
  onRenameFile,
  onRenameFolder,
  onMoveFile,
  onMoveFolder,
  onDeleteFile,
  onDeleteFolder,
  onUploadClick,
  onCreateFolderClick,
}: FileBrowserProps) {
  const { t } = useTranslation()
  const isEmpty = subfolders.length === 0 && files.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-12 text-center shadow-xs">
        <div className="grid size-16 place-items-center rounded-2xl border border-[#009FE2]/25 bg-[#009FE2]/10 text-[#009FE2] shadow-xs">
          <FolderOpen className="size-8 stroke-[1.5]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-white">
          {t('files.emptyTitle', 'This folder is empty')}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-[#A7ADB5]">
          {t('files.emptyBody', 'Upload files or create a new folder to get started.')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {onUploadClick && (
            <Button
              size="sm"
              onClick={onUploadClick}
              className="gap-2 rounded-xl bg-[#009FE2] text-xs font-semibold text-white shadow-[0_0_15px_rgba(0,159,226,0.3)] hover:bg-[#009FE2]/90"
            >
              <Upload className="size-3.5" />
              {t('files.uploadFiles', 'Upload files')}
            </Button>
          )}
          {onCreateFolderClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateFolderClick}
              className="rounded-xl border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
            >
              {t('files.newFolder', 'New folder')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Calculate items count inside each folder
  const getItemCountForFolder = (folderId: string) => {
    const getDescendantFolderIds = (id: string): string[] => {
      const children = allFolders.filter((f) => f.parentId === id)
      return [id, ...children.flatMap((c) => getDescendantFolderIds(c.id))]
    }
    const allDescendantFolderIds = getDescendantFolderIds(folderId)
    const directFolders = allFolders.filter((f) => f.parentId === folderId).length
    const descendantFiles = allFiles.filter(
      (f) => f.folderId && allDescendantFolderIds.includes(f.folderId),
    ).length
    const directFiles = allFiles.filter((f) => f.folderId === folderId).length

    if (directFolders > 0) {
      return directFolders + descendantFiles
    }
    return directFiles
  }

  if (view === 'list') {
    return (
      <FileListView
        subfolders={subfolders}
        files={files}
        onNavigate={onNavigate}
        onPreview={onPreview}
        onRenameFile={onRenameFile}
        onRenameFolder={onRenameFolder}
        onMoveFile={onMoveFile}
        onMoveFolder={onMoveFolder}
        onDeleteFile={onDeleteFile}
        onDeleteFolder={onDeleteFolder}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Folders Section (if any) */}
      {subfolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A7ADB5]">
              {t('files.folders', 'Folders')} ({subfolders.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {subfolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                itemCount={getItemCountForFolder(folder.id)}
                onOpen={() => onNavigate(folder)}
                onRename={() => onRenameFolder(folder)}
                onMove={() => onMoveFolder(folder)}
                onDelete={() => onDeleteFolder(folder)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files Section (if any) */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A7ADB5]">
              {t('files.files', 'Files')} ({files.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
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
        </div>
      )}
    </div>
  )
}
