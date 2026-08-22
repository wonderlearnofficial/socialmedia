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
    } catch (error) {
      // Apps Script reports the real reason in its JSON body (a missing OAuth
      // scope, a bad parent folder id); a bare generic toast discarded it and
      // left nothing to debug from.
      toast.error(t('common.errorTitle'), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-5 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <meta.icon className="size-4 text-[#009FE2]" />
            {t('files.createGoogleFileTitle', { kind: t(meta.labelKey) })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="google-file-name" className="text-xs font-medium text-[#A7ADB5]">
            {t('files.nameLabel')}
          </Label>
          <Input
            id="google-file-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Social Media Strategy"
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
            {t('files.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
