import { useCallback, useState } from 'react'
import { useCreateFile, useCreateFolder, useFolders } from '@/hooks/useFiles'
import { createDriveFolder, uploadFile } from '@/services/upload'
import type { DriveFolder, WorkspaceId } from '@/types'

export interface UploadTask {
  id: string
  name: string
  status: 'uploading' | 'done' | 'error'
  error?: string
  file: File
}

interface UseFileUploadOptions {
  workspace: WorkspaceId
  uploadedBy: string
  currentFolder: DriveFolder | null
}

/** Pulls the folder segments out of a folder-picker's relative path, e.g.
 *  "Campaign/Instagram/Post 01.png" -> ["Campaign", "Instagram"]. */
function pathSegments(file: File): string[] {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  if (!rel) return []
  return rel.split('/').slice(0, -1)
}

export function useFileUpload({ workspace, uploadedBy, currentFolder }: UseFileUploadOptions) {
  const { data: folders = [] } = useFolders(workspace)
  const createFolder = useCreateFolder()
  const createFile = useCreateFile()
  const [tasks, setTasks] = useState<UploadTask[]>([])

  // Resolves (creating as needed) the folder chain under currentFolder that
  // matches `segments`, mirroring each new level into both Drive and our
  // own `folders` table so the two structures always match.
  const resolveFolder = useCallback(
    async (segments: string[], known: Map<string, DriveFolder>): Promise<DriveFolder | null> => {
      let parent = currentFolder
      let pathKey = ''
      for (const segment of segments) {
        pathKey = pathKey ? `${pathKey}/${segment}` : segment
        const cached = known.get(pathKey)
        if (cached) {
          parent = cached
          continue
        }
        const existing = folders.find(
          (f) => f.parentId === (parent?.id ?? null) && f.name === segment,
        )
        if (existing) {
          known.set(pathKey, existing)
          parent = existing
          continue
        }
        const drive = await createDriveFolder(segment, parent?.driveFolderId)
        const record = await createFolder.mutateAsync({
          workspace,
          name: segment,
          driveFolderId: drive.folderId,
          parentId: parent?.id ?? null,
          createdBy: uploadedBy,
        })
        known.set(pathKey, record)
        parent = record
      }
      return parent
    },
    [folders, currentFolder, createFolder, workspace, uploadedBy],
  )

  const runOne = useCallback(
    async (file: File, taskId: string, known: Map<string, DriveFolder>) => {
      try {
        const segments = pathSegments(file)
        const folder = segments.length ? await resolveFolder(segments, known) : currentFolder
        const result = await uploadFile(file, { startFolderId: folder?.driveFolderId })
        await createFile.mutateAsync({
          workspace,
          name: result.fileName,
          type: file.type || 'application/octet-stream',
          size: file.size,
          driveUrl: result.url,
          driveFileId: result.fileId ?? '',
          folderId: folder?.id ?? null,
          postId: null,
          uploadedBy,
        })
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t)))
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : t,
          ),
        )
      }
    },
    [currentFolder, resolveFolder, createFile, workspace, uploadedBy],
  )

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      const known = new Map<string, DriveFolder>()

      const initial: UploadTask[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        status: 'uploading',
        file: f,
      }))
      setTasks((prev) => [...prev, ...initial])

      // Every file is attempted, whatever its size. Apps Script's own payload
      // ceiling (~50MB, and base64 inflates a file ~1.37x) still applies, but
      // it surfaces as a real upload error with a retry rather than as a file
      // this app refused to try.
      for (let i = 0; i < files.length; i++) {
        await runOne(files[i], initial[i].id, known)
      }
    },
    [runOne],
  )

  const retryTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'uploading', error: undefined } : t)),
      )
      runOne(task.file, id, new Map())
    },
    [tasks, runOne],
  )

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === 'uploading'))
  }, [])

  return { tasks, uploadFiles, retryTask, dismissTask, clearFinished }
}
