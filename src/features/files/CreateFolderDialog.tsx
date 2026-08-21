import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateFolder } from '@/hooks/useFiles'
import { createDriveFolder } from '@/services/upload'
import type { DriveFolder, WorkspaceId } from '@/types'

interface CreateFolderDialogProps {
  open: boolean
  onClose: () => void
  workspace: WorkspaceId
  parentFolder: DriveFolder | null
  createdBy: string
}

export function CreateFolderDialog({
  open,
  onClose,
  workspace,
  parentFolder,
  createdBy,
}: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const createFolder = useCreateFolder()

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPending(true)
    try {
      const drive = await createDriveFolder(trimmed, parentFolder?.driveFolderId)
      await createFolder.mutateAsync({
        workspace,
        name: trimmed,
        driveFolderId: drive.folderId,
        parentId: parentFolder?.id ?? null,
        createdBy,
      })
      toast.success(t('files.folderCreated'))
      setName('')
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('files.createFolderTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="folder-name">{t('files.folderNameLabel')}</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            {t('files.createFolder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
