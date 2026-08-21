import { useEffect, useState } from 'react'
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
import { useUpdateFile, useUpdateFolder } from '@/hooks/useFiles'
import { renameDriveItem } from '@/services/upload'

export interface RenameTarget {
  itemType: 'file' | 'folder'
  id: string
  driveId: string
  name: string
}

export function RenameItemDialog({
  target,
  onClose,
}: {
  target: RenameTarget | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const updateFile = useUpdateFile()
  const updateFolder = useUpdateFolder()

  useEffect(() => setName(target?.name ?? ''), [target])

  if (!target) return null

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPending(true)
    try {
      await renameDriveItem(target.itemType, target.driveId, trimmed)
      if (target.itemType === 'file') {
        await updateFile.mutateAsync({ id: target.id, patch: { name: trimmed } })
      } else {
        await updateFolder.mutateAsync({ id: target.id, patch: { name: trimmed } })
      }
      toast.success(t('files.renamed'))
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
          <DialogTitle>{t('files.renameTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rename-name">{t('files.nameLabel')}</Label>
          <Input
            id="rename-name"
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
            {t('files.rename')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
