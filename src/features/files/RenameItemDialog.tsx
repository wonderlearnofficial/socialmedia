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
      <DialogContent className="max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">
            {t('files.renameTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="rename-name" className="text-xs font-medium text-[#A7ADB5]">
            {t('files.nameLabel')}
          </Label>
          <Input
            id="rename-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
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
            {t('files.rename')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
