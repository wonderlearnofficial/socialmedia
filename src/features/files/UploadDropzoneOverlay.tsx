import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import type { DriveFolder } from '@/types'

interface UploadDropzoneOverlayProps {
  isDragging: boolean
  currentFolder?: DriveFolder | null
}

export function UploadDropzoneOverlay({ isDragging, currentFolder }: UploadDropzoneOverlayProps) {
  const { t } = useTranslation()

  if (!isDragging) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#07090B]/80 p-8 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#009FE2] bg-[#101317]/90 p-12 text-center shadow-[0_0_50px_rgba(0,159,226,0.25)]">
        <div className="grid size-20 place-items-center rounded-2xl border border-[#009FE2]/40 bg-[#009FE2]/15 text-[#009FE2] shadow-[0_0_20px_rgba(0,159,226,0.3)] animate-bounce">
          <Upload className="size-10 stroke-[2]" />
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-white">
          {t('files.dropFilesHere', 'Drop files here')}
        </h2>
        <p className="mt-1 text-sm font-medium text-[#009FE2]">
          {t('files.uploadToWonderLearn', 'Upload to WonderLearn')}
        </p>
        <p className="mt-2 text-xs text-[#A7ADB5]">
          {currentFolder
            ? t('files.dropIntoFolder', { name: currentFolder.name })
            : t('files.dropIntoRoot', 'Uploads will go into the root folder')}
        </p>
      </div>
    </div>
  )
}
