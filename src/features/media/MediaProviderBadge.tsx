import { Cloud, FileImage, Film, Frame, HardDrive, Link2, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaProviderId } from '@/lib/media'

const PROVIDER_ICON: Record<MediaProviderId, typeof Cloud> = {
  'google-drive': HardDrive,
  dropbox: Cloud,
  onedrive: Cloud,
  figma: Frame,
  canva: Palette,
  image: FileImage,
  video: Film,
  link: Link2,
}

export function MediaProviderBadge({
  provider,
  label,
  className,
}: {
  provider: MediaProviderId
  label: string
  className?: string
}) {
  const Icon = PROVIDER_ICON[provider]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur',
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}

export { PROVIDER_ICON }
