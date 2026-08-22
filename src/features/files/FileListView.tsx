import { useTranslation } from 'react-i18next'
import { Folder } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { formatDateFull } from '@/lib/dates'
import { driveThumbnailUrl } from '@/lib/media'
import type { DriveFile, DriveFolder } from '@/types'
import { fileTypeIcon } from './fileIcons'
import { ItemContextMenu } from './ItemContextMenu'

interface FileListViewProps {
  subfolders: DriveFolder[]
  files: DriveFile[]
  onNavigate: (folder: DriveFolder) => void
  onPreview: (file: DriveFile) => void
  onRenameFile: (file: DriveFile) => void
  onRenameFolder: (folder: DriveFolder) => void
  onMoveFile: (file: DriveFile) => void
  onMoveFolder: (folder: DriveFolder) => void
  onDeleteFile: (file: DriveFile) => void
  onDeleteFolder: (folder: DriveFolder) => void
}

export function FileListView({
  subfolders,
  files,
  onNavigate,
  onPreview,
  onRenameFile,
  onRenameFolder,
  onMoveFile,
  onMoveFolder,
  onDeleteFile,
  onDeleteFolder,
}: FileListViewProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#15191E]/60 text-[#A7ADB5]">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('files.name')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('files.type')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('files.size')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('files.modified')}</th>
              <th className="w-10 px-2 py-3 text-end" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {subfolders.map((folder) => (
              <tr
                key={folder.id}
                onClick={() => onNavigate(folder)}
                className="group cursor-pointer transition-colors hover:bg-[#181D22]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#009FE2]/20 bg-[#009FE2]/10 text-[#009FE2]">
                      <Folder className="size-4 fill-[#009FE2]/20" />
                    </div>
                    <span className="truncate font-medium text-white group-hover:text-[#009FE2]">
                      {folder.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#A7ADB5]">{t('files.folder')}</td>
                <td className="px-4 py-3 text-[#6F7782]">—</td>
                <td className="px-4 py-3 text-[#A7ADB5]">
                  {formatDateFull(folder.createdAt, i18n.language)}
                </td>
                <td className="px-2 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                  <ItemContextMenu
                    onOpen={() => onNavigate(folder)}
                    onRename={() => onRenameFolder(folder)}
                    onMove={() => onMoveFolder(folder)}
                    onDelete={() => onDeleteFolder(folder)}
                  />
                </td>
              </tr>
            ))}

            {files.map((file) => {
              const Icon = fileTypeIcon(file.type)
              const thumbUrl = file.driveFileId
                ? driveThumbnailUrl(file.driveFileId, 100)
                : undefined

              return (
                <tr
                  key={file.id}
                  onClick={() => onPreview(file)}
                  className="group cursor-pointer transition-colors hover:bg-[#181D22]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 shrink-0 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#090B0D]">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              if (
                                file.driveFileId &&
                                e.currentTarget.src !==
                                  `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w100`
                              ) {
                                e.currentTarget.src = `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w100`
                              }
                            }}
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-[#009FE2]">
                            <Icon className="size-4" />
                          </div>
                        )}
                      </div>
                      <span className="truncate font-medium text-white group-hover:text-[#009FE2]">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#A7ADB5]">{file.type || '—'}</td>
                  <td className="px-4 py-3 text-[#A7ADB5]">{formatBytes(file.size)}</td>
                  <td className="px-4 py-3 text-[#A7ADB5]">
                    {formatDateFull(file.createdAt, i18n.language)}
                  </td>
                  <td className="px-2 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                    <ItemContextMenu
                      onOpen={() => onPreview(file)}
                      onPreview={() => onPreview(file)}
                      onOpenInDrive={() =>
                        window.open(file.driveUrl, '_blank', 'noopener,noreferrer')
                      }
                      onRename={() => onRenameFile(file)}
                      onMove={() => onMoveFile(file)}
                      onDelete={() => onDeleteFile(file)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
