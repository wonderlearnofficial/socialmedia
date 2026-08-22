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
      <DialogContent className="max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">
            {t('files.createFolderTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="folder-name" className="text-xs font-medium text-[#A7ADB5]">
            {t('files.folderNameLabel')}
          </Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Design Assets"
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] text-xs text-white placeholder:text-[#6F7782] focus:border-[#009FE2] focus:ring-[#009FE2]/30"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
          >
            {t('editor.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !name.trim()}
            className="gap-1.5 rounded-xl bg-[#009FE2] text-xs font-semibold text-white shadow-[0_0_15px_rgba(0,159,226,0.3)] hover:bg-[#009FE2]/90"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {t('files.createFolder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
