import { useTranslation } from 'react-i18next'
import { FileText, Folder, HardDrive, Users } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import type { DriveFile, DriveFolder, TeamMember } from '@/types'

interface StorageSummaryProps {
  folders: DriveFolder[]
  files: DriveFile[]
  teamMembers?: TeamMember[]
}

export function StorageSummary({ folders, files, teamMembers = [] }: StorageSummaryProps) {
  const { t } = useTranslation()

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0)
  const usedStorageFormatted = formatBytes(totalBytes)

  return (
    <div className="space-y-3">
      {/* 4 Equal Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* 1. Folders */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-3.5 shadow-xs transition-all hover:bg-[#15191E]">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#009FE2]/25 bg-[#009FE2]/10 text-[#009FE2]">
            <Folder className="size-5 fill-[#009FE2]/20" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white tabular-nums">{folders.length}</p>
            <p className="truncate text-xs font-medium text-[#A7ADB5]">
              {t('files.folders', 'Folders')}
            </p>
            <p className="truncate text-[10px] text-[#6F7782]">
              {t('files.organizedContent', 'Organized content')}
            </p>
          </div>
        </div>

        {/* 2. Files */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-3.5 shadow-xs transition-all hover:bg-[#15191E]">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#009FE2]/25 bg-[#009FE2]/10 text-[#009FE2]">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white tabular-nums">{files.length}</p>
            <p className="truncate text-xs font-medium text-[#A7ADB5]">
              {t('files.files', 'Files')}
            </p>
            <p className="truncate text-[10px] text-[#6F7782]">
              {t('files.uploadedFiles', 'Uploaded files')}
            </p>
          </div>
        </div>

        {/* 3. Storage (Wonder Yellow) */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-3.5 shadow-xs transition-all hover:bg-[#15191E]">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#FAB800]/30 bg-[#FAB800]/10 text-[#FAB800]">
            <HardDrive className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white tabular-nums">{usedStorageFormatted}</p>
            <p className="truncate text-xs font-medium text-[#A7ADB5]">
              {t('files.storageUsed', 'Storage used')}
            </p>
            <p className="truncate text-[10px] text-[#6F7782]">
              {t('files.acrossAllFiles', 'Across all files')}
            </p>
          </div>
        </div>

        {/* 4. Team Members */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-3.5 shadow-xs transition-all hover:bg-[#15191E]">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#009FE2]/25 bg-[#009FE2]/10 text-[#009FE2]">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white tabular-nums">{teamMembers.length || 5}</p>
            <p className="truncate text-xs font-medium text-[#A7ADB5]">
              {t('files.teamMembers', 'Team members')}
            </p>
            <p className="truncate text-[10px] text-[#6F7782]">
              {t('files.haveAccess', 'Have access')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
