import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { listDriveContents } from '@/services/upload'
import type { DriveFile, DriveFolder, WorkspaceId } from '@/types'

/**
 * Keeps the Files page a mirror of the Drive folder it's showing.
 *
 * Drive is the source of truth — the `folders`/`files` tables are a
 * catalogue of what's there. Recursively syncs child folders so folder
 * item counts and subfolder hierarchies are always accurate.
 */
export function useDriveSync({
  folder,
  workspace,
  folders,
  files,
  enabled = true,
}: {
  /** The folder on screen; null means the Drive root. */
  folder: DriveFolder | null
  workspace: WorkspaceId
  folders: DriveFolder[]
  files: DriveFile[]
  enabled?: boolean
}) {
  const qc = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const running = useRef(false)
  const latest = useRef({ folders, files })
  latest.current = { folders, files }

  const sync = useCallback(async () => {
    if (running.current) return
    running.current = true
    setSyncing(true)
    setError(null)

    try {
      let hasChanges = false

      // Helper to sync one level of Drive folders & files to a DB parent ID
      const syncLevel = async (
        driveFolderId: string | undefined,
        dbParentId: string | null,
        depth: number = 0,
      ) => {
        if (depth > 3) return // Cap recursion depth at 3 levels

        const drive = await listDriveContents(driveFolderId)

        // Read the latest state from DB cache
        const allDbFolders = await api.listFolders()
        const allDbFiles = await api.listFiles()

        const dbFolders = allDbFolders.filter((f) => (f.parentId ?? null) === dbParentId)
        const dbFiles = allDbFiles.filter((f) => (f.folderId ?? null) === dbParentId)

        const driveFolderIds = new Set(drive.folders.map((f) => f.id))
        const driveFileIds = new Set(drive.files.map((f) => f.id))

        // 1. Delete removed items
        const removals = [
          ...dbFolders
            .filter((f) => !driveFolderIds.has(f.driveFolderId))
            .map(async (f) => {
              hasChanges = true
              return api.deleteFolder(f.id)
            }),
          ...dbFiles
            .filter((f) => !driveFileIds.has(f.driveFileId))
            .map(async (f) => {
              hasChanges = true
              return api.deleteFile(f.id)
            }),
        ]
        await Promise.all(removals)

        // 2. Add or map new/existing folders
        const activeFolders: DriveFolder[] = []
        for (const d of drive.folders) {
          let existing = dbFolders.find((f) => f.driveFolderId === d.id)
          if (!existing) {
            hasChanges = true
            existing = await api.createFolder({
              workspace,
              name: d.name,
              driveFolderId: d.id,
              parentId: dbParentId,
              createdBy: 'Google Drive',
            })
          }
          activeFolders.push(existing)
        }

        // 3. Add new files
        const knownFileDriveIds = new Set(dbFiles.map((f) => f.driveFileId))
        const fileAdditions = drive.files
          .filter((d) => !knownFileDriveIds.has(d.id))
          .map(async (d) => {
            hasChanges = true
            return api.createFile({
              workspace,
              name: d.name,
              type: d.mimeType ?? '',
              size: Number(d.size ?? 0),
              driveUrl: d.url,
              driveFileId: d.id,
              folderId: dbParentId,
              postId: null,
              uploadedBy: 'Google Drive',
            })
          })
        await Promise.all(fileAdditions)

        // 4. Recursively sync direct subfolders so child counts and nested folders are populated
        for (const subFolder of activeFolders) {
          try {
            await syncLevel(subFolder.driveFolderId, subFolder.id, depth + 1)
          } catch {
            // continue other folders if one fails
          }
        }
      }

      await syncLevel(folder?.driveFolderId, folder?.id ?? null, 0)

      if (hasChanges) {
        await qc.invalidateQueries({ queryKey: ['folders'] })
        await qc.invalidateQueries({ queryKey: ['files'] })
      }
      setSyncedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      running.current = false
      setSyncing(false)
    }
  }, [folder?.driveFolderId, folder?.id, workspace, qc])

  // Re-mirror whenever the folder on screen changes, and when the tab is focused
  useEffect(() => {
    if (!enabled) return
    void sync()
    const onFocus = () => void sync()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, sync])

  return { syncing, error, syncedAt, resync: sync }
}
