import { useTranslation } from 'react-i18next'
import { Folder } from 'lucide-react'
import type { DriveFolder } from '@/types'
import { ItemContextMenu } from './ItemContextMenu'

interface FolderCardProps {
  folder: DriveFolder
  itemCount?: number
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}

export function FolderCard({
  folder,
  itemCount = 0,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: FolderCardProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-4 text-start transition-all duration-200 hover:-translate-y-1 hover:border-[#009FE2]/40 hover:bg-gradient-to-br hover:from-[#009FE2]/12 hover:via-[#101317] hover:to-[#101317] hover:shadow-[0_8px_25px_rgba(0,159,226,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FE2]"
    >
      {/* Subtle background glow effect */}
      <div className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-[#009FE2]/5 blur-xl transition-all duration-300 group-hover:bg-[#009FE2]/15" />

      <div className="flex items-start justify-between gap-3">
        {/* Large Folder Icon container */}
        <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#009FE2]/25 bg-[#009FE2]/10 text-[#009FE2] shadow-xs transition-transform duration-200 group-hover:scale-105">
          <Folder className="size-6 fill-[#009FE2]/20" />
        </div>

        {/* Context Menu */}
        <div
          className="opacity-80 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ItemContextMenu
            onOpen={onOpen}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <h3
          className="truncate text-sm font-semibold text-white group-hover:text-white"
          title={folder.name}
        >
          {folder.name}
        </h3>
        <p className="mt-0.5 text-xs text-[#A7ADB5]">
          {t('files.folder', 'Folder')} • {itemCount}{' '}
          {itemCount === 1 ? t('files.item', 'item') : t('files.items', 'items')}
        </p>
      </div>
    </div>
  )
}
