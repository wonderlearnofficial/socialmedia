import type { ContentType, PostStatus, SocialPlatform, WorkspaceId } from '@/types'
import {
  CirclePlay,
  Clapperboard,
  FileText,
  Image,
  Layers,
  Video,
  type LucideIcon,
} from 'lucide-react'

/** Official simple-icons brand paths (24x24 viewBox). */
export const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; brand: string; brandDark?: string; path: string }
> = {
  instagram: {
    label: 'Instagram',
    brand: '#E1306C',
    path: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
  },
  facebook: {
    label: 'Facebook',
    brand: '#1877F2',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  youtube: {
    label: 'YouTube',
    brand: '#FF0000',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  tiktok: {
    label: 'TikTok',
    brand: '#000000',
    brandDark: '#FFFFFF',
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  x: {
    label: 'X',
    brand: '#000000',
    brandDark: '#FFFFFF',
    path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  },
  linkedin: {
    label: 'LinkedIn',
    brand: '#0A66C2',
    path: 'M20.451 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.355V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
}

export const STATUS_META: Record<
  PostStatus,
  { labelKey: string; dot: string; text: string; chart: string }
> = {
  draft: {
    labelKey: 'status.draft',
    chart: 'oklch(0.72 0.02 286)',
    dot: 'bg-zinc-400',
    text: 'text-zinc-500 dark:text-zinc-400',
  },
  in_review: {
    labelKey: 'status.in_review',
    chart: 'oklch(0.78 0.15 78)',
    dot: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  changes_requested: {
    labelKey: 'status.changes_requested',
    chart: 'oklch(0.68 0.19 18)',
    dot: 'bg-rose-500 dark:bg-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
  },
  approved: {
    labelKey: 'status.approved',
    chart: 'oklch(0.75 0.16 158)',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  scheduled: {
    labelKey: 'status.scheduled',
    chart: 'oklch(0.74 0.13 232)',
    dot: 'bg-sky-500 dark:bg-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
  },
  published: {
    labelKey: 'status.published',
    chart: 'oklch(0.66 0.17 292)',
    dot: 'bg-violet-500 dark:bg-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
  },
}

export const CONTENT_TYPE_META: Record<ContentType, { labelKey: string; icon: LucideIcon }> = {
  image: { labelKey: 'contentType.image', icon: Image },
  video: { labelKey: 'contentType.video', icon: Video },
  carousel: { labelKey: 'contentType.carousel', icon: Layers },
  reel: { labelKey: 'contentType.reel', icon: Clapperboard },
  story: { labelKey: 'contentType.story', icon: CirclePlay },
  text: { labelKey: 'contentType.text', icon: FileText },
}

export const WORKSPACE_META: Record<
  WorkspaceId,
  { label: string; defaultPlatforms: SocialPlatform[] }
> = {
  wonderlearn: { label: 'Wonderlearn', defaultPlatforms: [] },
  dr_wael: { label: 'Dr. Wael', defaultPlatforms: ['linkedin'] },
}

// Two fixed Supabase Auth accounts back the manager login — never shown in
// the UI, just the identity a passphrase ("key") signs in as.
export const ADMIN_EMAIL = 'admin@internal.wonderlearn.app'
export const USER_EMAIL = 'user@internal.wonderlearn.app'
