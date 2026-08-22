import { useTranslation } from 'react-i18next'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DriveFolder } from '@/types'

interface FileBreadcrumbsProps {
  breadcrumbs: DriveFolder[]
  onNavigate: (folder: DriveFolder | null) => void
}

export function FileBreadcrumbs({ breadcrumbs, onNavigate }: FileBreadcrumbsProps) {
  const { t } = useTranslation()

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors hover:bg-[#181D22]',
          breadcrumbs.length === 0 ? 'text-white' : 'text-[#A7ADB5] hover:text-[#009FE2]',
        )}
      >
        <Home className="size-3.5" />
        <span>{t('nav.files', 'Files')}</span>
      </button>

      {breadcrumbs.map((folder, index) => {
        const isCurrent = index === breadcrumbs.length - 1
        return (
          <div key={folder.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-[#6F7782]" />
            <button
              type="button"
              onClick={() => onNavigate(folder)}
              disabled={isCurrent}
              className={cn(
                'rounded-lg px-2 py-1 font-medium transition-colors',
                isCurrent
                  ? 'cursor-default font-semibold text-white'
                  : 'text-[#A7ADB5] hover:bg-[#181D22] hover:text-[#009FE2]',
              )}
            >
              {folder.name}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
