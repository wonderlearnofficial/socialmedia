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
import { useCreateFile } from '@/hooks/useFiles'
import { GOOGLE_FILE_META } from '@/lib/constants'
import { createGoogleFile } from '@/services/upload'
import type { DriveFolder, GoogleFileKind, WorkspaceId } from '@/types'

interface CreateGoogleFileDialogProps {
  /** Which kind to create, or null when the dialog is closed. */
  kind: GoogleFileKind | null
  onClose: () => void
  workspace: WorkspaceId
  parentFolder: DriveFolder | null
  createdBy: string
}

export function CreateGoogleFileDialog({
  kind,
  onClose,
  workspace,
  parentFolder,
  createdBy,
}: CreateGoogleFileDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const createFile = useCreateFile()

  // Each kind opens its own empty dialog rather than inheriting the last name.
  useEffect(() => setName(''), [kind])

  if (!kind) return null
  const meta = GOOGLE_FILE_META[kind]

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPending(true)
    try {
      const created = await createGoogleFile(kind, trimmed, parentFolder?.driveFolderId)
      await createFile.mutateAsync({
        workspace,
        name: created.fileName,
        // Drive's own mime type, so the icon and preview both know what this is.
        type: created.mimeType || meta.mimeType,
        // Google-native files hold no bytes of their own.
        size: 0,
        driveUrl: created.url,
        driveFileId: created.fileId,
        folderId: parentFolder?.id ?? null,
        postId: null,
        uploadedBy: createdBy,
      })
      toast.success(t('files.googleFileCreated'))
      onClose()
      // A blank document is only useful open — a blocked popup still leaves
      // the file sitting in the grid.
      window.open(created.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <meta.icon className="size-4 text-muted-foreground" />
            {t('files.createGoogleFileTitle', { kind: t(meta.labelKey) })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="google-file-name">{t('files.nameLabel')}</Label>
          <Input
            id="google-file-name"
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
            {t('files.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
