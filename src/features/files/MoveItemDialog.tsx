import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FolderIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFolders, useUpdateFile, useUpdateFolder } from '@/hooks/useFiles'
import { moveDriveItem } from '@/services/upload'
import { cn } from '@/lib/utils'
import type { DriveFolder, WorkspaceId } from '@/types'

export interface MoveTarget {
  itemType: 'file' | 'folder'
  id: string
  driveId: string
  name: string
}

interface MoveItemDialogProps {
  target: MoveTarget | null
  onClose: () => void
  workspace: WorkspaceId
}

function descendantIds(folders: DriveFolder[], rootId: string): Set<string> {
  const ids = new Set([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        grew = true
      }
    }
  }
  return ids
}

export function MoveItemDialog({ target, onClose, workspace }: MoveItemDialogProps) {
  const { t } = useTranslation()
  const { data: folders = [] } = useFolders(workspace)
  const updateFile = useUpdateFile()
  const updateFolder = useUpdateFolder()
  const [selected, setSelected] = useState<DriveFolder | null>(null)
  const [pending, setPending] = useState(false)

  const options = useMemo(() => {
    if (!target) return []
    const excluded = target.itemType === 'folder' ? descendantIds(folders, target.id) : new Set()
    return folders
      .filter((f) => !excluded.has(f.id))
      .map((f) => ({ folder: f, depth: depthOf(folders, f) }))
      .sort((a, b) => a.folder.name.localeCompare(b.folder.name))
  }, [folders, target])

  if (!target) return null

  const submit = async () => {
    setPending(true)
    try {
      await moveDriveItem(target.itemType, target.driveId, selected?.driveFolderId ?? '')
      if (target.itemType === 'file') {
        await updateFile.mutateAsync({ id: target.id, patch: { folderId: selected?.id ?? null } })
      } else {
        await updateFolder.mutateAsync({ id: target.id, patch: { parentId: selected?.id ?? null } })
      }
      toast.success(t('files.moved'))
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('files.moveTitle', { name: target.name })}</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('files.noOtherFolders')}
            </p>
          ) : (
            options.map(({ folder, depth }) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelected(folder)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors',
                  selected?.id === folder.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/60',
                )}
                style={{ paddingInlineStart: `${depth * 16 + 10}px` }}
              >
                <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={submit} disabled={pending || !selected}>
            {pending && <Loader2 className="animate-spin" />}
            {t('files.move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function depthOf(folders: DriveFolder[], folder: DriveFolder): number {
  let depth = 0
  let current = folder
  while (current.parentId) {
    const parent = folders.find((f) => f.id === current.parentId)
    if (!parent) break
    depth += 1
    current = parent
  }
  return depth
}
