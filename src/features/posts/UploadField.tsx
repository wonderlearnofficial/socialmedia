import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FolderUp, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/services/upload'

interface UploadFieldProps {
  folderName?: string
  category?: string
  onUploaded: (result: {
    contentUrl: string
    contentFileName: string
    driveFileId?: string
    folderName?: string
  }) => void
  disabled?: boolean
}

export function UploadField({
  onUploaded,
  folderName = 'Project1',
  category = 'Social Media',
  disabled,
}: UploadFieldProps) {
  const { t } = useTranslation()
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    // No size gate: everything picked gets attempted, and anything Apps Script
    // can't swallow (~50MB payload ceiling, inflated ~1.37x by base64) comes
    // back as a failure in the count below.
    const toUpload = Array.from(fileList)

    setProgress({ done: 0, total: toUpload.length })
    const succeeded: { fileName: string; url: string; fileId?: string }[] = []
    let failed = 0

    for (const file of toUpload) {
      try {
        // Uploads into Review / Social Media / [folderName]
        succeeded.push(
          await uploadFile(file, {
            stage: 'review',
            category,
            folderName,
          }),
        )
      } catch {
        failed += 1
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
    }

    setProgress(null)
    if (filesInput.current) filesInput.current.value = ''
    if (folderInput.current) folderInput.current.value = ''

    // The post links its first image and carries that file's id — that's the
    // one the Review → Done move acts on. Any extras still land in Review,
    // but the post can only point at one of them (linking the whole Review
    // folder instead would expose every other post's work in progress).
    if (succeeded.length > 0) {
      onUploaded({
        contentUrl: succeeded[0].url,
        contentFileName:
          succeeded.length === 1
            ? succeeded[0].fileName
            : t('editor.uploadMultipleFiles', { count: succeeded.length }),
        driveFileId: succeeded[0].fileId,
      })
    }

    if (failed > 0) {
      toast.error(t('editor.uploadPartial', { failed, total: toUpload.length }))
    } else if (succeeded.length > 0) {
      toast.success(t('editor.uploadDone'))
    }
  }

  const busy = Boolean(progress) || disabled

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={filesInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={folderInput}
        type="file"
        // @ts-expect-error non-standard attribute, but supported by every Chromium/Firefox browser
        webkitdirectory=""
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => filesInput.current?.click()}
      >
        <Upload className="size-3.5" />
        {t('editor.uploadFiles')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => folderInput.current?.click()}
      >
        <FolderUp className="size-3.5" />
        {t('editor.uploadFolder')}
      </Button>

      {progress && (
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {t('editor.uploading', { done: progress.done, total: progress.total })}
        </span>
      )}
    </div>
  )
}
