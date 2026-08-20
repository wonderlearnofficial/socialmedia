export type MediaProviderId =
  'google-drive' | 'dropbox' | 'onedrive' | 'figma' | 'canva' | 'image' | 'video' | 'link'

export interface MediaInfo {
  provider: MediaProviderId
  label: string
  url: string
  /** Best-effort direct preview URL. May still fail (permissions) — always guard with onError. */
  previewUrl?: string
  kind: 'image' | 'video' | 'external'
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i

const PROVIDER_LABELS: Record<MediaProviderId, string> = {
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox',
  onedrive: 'OneDrive',
  figma: 'Figma',
  canva: 'Canva',
  image: 'Image',
  video: 'Video',
  link: 'Link',
}

export function googleDriveFileId(url: string): string | null {
  const byPath = url.match(/\/(?:file\/)?d\/([\w-]{10,})/)
  if (byPath) return byPath[1]
  const byQuery = url.match(/[?&]id=([\w-]{10,})/)
  return byQuery ? byQuery[1] : null
}

export function driveThumbnailUrl(fileId: string, width = 1200) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`
}

export function dropboxDirectUrl(url: string) {
  return url.includes('dl=0') ? url.replace('dl=0', 'raw=1') : url
}

export function detectMedia(url: string): MediaInfo {
  const base = (provider: MediaProviderId, extra?: Partial<MediaInfo>): MediaInfo => ({
    provider,
    label: PROVIDER_LABELS[provider],
    url,
    kind: 'external',
    ...extra,
  })

  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return base('link')
  }

  if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
    const id = googleDriveFileId(url)
    return base('google-drive', id ? { previewUrl: driveThumbnailUrl(id) } : undefined)
  }
  if (host.includes('dropbox.com')) {
    const direct = dropboxDirectUrl(url)
    return base('dropbox', IMAGE_RE.test(url) ? { previewUrl: direct } : undefined)
  }
  if (
    host.includes('onedrive.live.com') ||
    host.includes('1drv.ms') ||
    host.includes('sharepoint.com')
  ) {
    return base('onedrive')
  }
  if (host.includes('figma.com')) return base('figma')
  if (host.includes('canva.com')) return base('canva')
  if (VIDEO_RE.test(url)) return base('video', { kind: 'video', previewUrl: url })
  if (
    IMAGE_RE.test(url) ||
    host.includes('picsum.photos') ||
    host.includes('images.unsplash.com')
  ) {
    return base('image', { kind: 'image', previewUrl: url })
  }
  return base('link')
}

export function fileNameFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname
    const last = path.split('/').filter(Boolean).pop()
    if (last && /\.\w{2,5}$/.test(last)) return decodeURIComponent(last)
    return null
  } catch {
    return null
  }
}
