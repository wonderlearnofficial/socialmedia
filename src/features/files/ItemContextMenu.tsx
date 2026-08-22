import { useTranslation } from 'react-i18next'
import { Copy, Download, ExternalLink, Eye, MoreVertical, Move, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ItemContextMenuProps {
  onOpen?: () => void
  onPreview?: () => void
  onOpenInDrive?: () => void
  onDownload?: () => void
  onCopyLink?: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
  triggerClassName?: string
}

export function ItemContextMenu({
  onOpen,
  onPreview,
  onOpenInDrive,
  onDownload,
  onCopyLink,
  onRename,
  onMove,
  onDelete,
  triggerClassName,
}: ItemContextMenuProps) {
  const { t } = useTranslation()

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink()
    } else if (onOpenInDrive) {
      onOpenInDrive()
      toast.success(t('files.linkCopied', 'Link copied to clipboard'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('files.moreActions')}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'size-8 rounded-lg bg-[#15191E]/80 text-[#A7ADB5] backdrop-blur-xs transition-all hover:bg-[#181D22] hover:text-white border border-[rgba(255,255,255,0.08)]',
            triggerClassName,
          )}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] p-1.5 text-white shadow-xl backdrop-blur-md"
      >
        {onOpen && (
          <DropdownMenuItem
            onSelect={onOpen}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
          >
            <Eye className="size-3.5 text-[#009FE2]" />
            {t('files.open', 'Open')}
          </DropdownMenuItem>
        )}
        {onPreview && (
          <DropdownMenuItem
            onSelect={onPreview}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
          >
            <Eye className="size-3.5 text-[#009FE2]" />
            {t('files.preview', 'Preview')}
          </DropdownMenuItem>
        )}
        {onOpenInDrive && (
          <DropdownMenuItem
            onSelect={onOpenInDrive}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
          >
            <ExternalLink className="size-3.5 text-[#009FE2]" />
            {t('files.openInDrive')}
          </DropdownMenuItem>
        )}
        {onDownload && (
          <DropdownMenuItem
            onSelect={onDownload}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
          >
            <Download className="size-3.5 text-[#009FE2]" />
            {t('files.download', 'Download')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={handleCopyLink}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-[#009FE2]"
        >
          <Copy className="size-3.5 text-[#009FE2]" />
          {t('files.copyLink', 'Copy link')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onRename}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-white"
        >
          <Pencil className="size-3.5 text-[#A7ADB5]" />
          {t('files.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onMove}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-[#181D22] hover:text-white"
        >
          <Move className="size-3.5 text-[#A7ADB5]" />
          {t('files.move')}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-[rgba(255,255,255,0.08)]" />
        <DropdownMenuItem
          onSelect={onDelete}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#E30613] hover:bg-[#E30613]/10 focus:bg-[#E30613]/15 focus:text-[#E30613]"
        >
          <Trash2 className="size-3.5 text-[#E30613]" />
          {t('files.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
