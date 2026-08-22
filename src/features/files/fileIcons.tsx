import {
  Archive,
  Code,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Image,
  Layers,
  Music,
  Palette,
  Presentation,
  Table,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { GOOGLE_FILE_META } from '@/lib/constants'

export function getFileExtension(filename: string, mimeType?: string): string {
  const parts = filename.split('.')
  if (parts.length > 1) {
    const ext = parts.pop()?.toUpperCase()
    if (ext && ext.length <= 6) return ext
  }

  if (mimeType === GOOGLE_FILE_META.doc.mimeType || mimeType?.includes('document')) return 'DOC'
  if (mimeType === GOOGLE_FILE_META.slides.mimeType || mimeType?.includes('presentation'))
    return 'SLIDES'
  if (
    mimeType === GOOGLE_FILE_META.sheets.mimeType ||
    mimeType?.includes('spreadsheet') ||
    mimeType === 'text/csv'
  )
    return 'SHEET'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType?.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'
  if (mimeType?.startsWith('video/')) return 'VIDEO'
  if (mimeType?.startsWith('audio/')) return 'AUDIO'
  if (mimeType?.includes('zip') || mimeType?.includes('compressed') || mimeType?.includes('tar'))
    return 'ZIP'

  return 'FILE'
}

export function fileTypeIcon(mimeType: string, filename = ''): LucideIcon {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const m = (mimeType || '').toLowerCase()

  // Images
  if (
    m.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp'].includes(ext)
  ) {
    return Image
  }

  // Videos
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'].includes(ext)) {
    return Video
  }

  // Audio
  if (m.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(ext)) {
    return Music
  }

  // Google Docs & Word Documents
  if (
    m === GOOGLE_FILE_META.doc.mimeType ||
    m.includes('document') ||
    m.includes('word') ||
    ['doc', 'docx', 'gdoc', 'odt', 'rtf'].includes(ext)
  ) {
    return FileText
  }

  // Google Slides & Presentations
  if (
    m === GOOGLE_FILE_META.slides.mimeType ||
    m.includes('presentation') ||
    m.includes('powerpoint') ||
    ['ppt', 'pptx', 'gslides', 'key', 'odp'].includes(ext)
  ) {
    return Presentation
  }

  // Google Sheets & Spreadsheets
  if (
    m === GOOGLE_FILE_META.sheets.mimeType ||
    m.includes('spreadsheet') ||
    m.includes('excel') ||
    m === 'text/csv' ||
    ['xls', 'xlsx', 'gsheet', 'csv', 'ods'].includes(ext)
  ) {
    return Table
  }

  // PDF
  if (m === 'application/pdf' || ext === 'pdf') {
    return FileText
  }

  // Code & Web
  if (
    m.startsWith('text/') ||
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'html',
      'css',
      'json',
      'sql',
      'py',
      'md',
      'xml',
      'yaml',
      'yml',
    ].includes(ext)
  ) {
    return FileCode
  }

  // Archives
  if (
    m.includes('zip') ||
    m.includes('tar') ||
    m.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  ) {
    return Archive
  }

  // Design files
  if (['fig', 'sketch', 'xd', 'ai', 'psd', 'eps', 'indd'].includes(ext)) {
    return Palette
  }

  return File
}

export function getFileTypeBadgeStyle(extension: string) {
  const ext = extension.toUpperCase()
  switch (ext) {
    case 'DOC':
    case 'DOCX':
    case 'TXT':
    case 'MD':
      return {
        bg: 'bg-[#009FE2]/15',
        border: 'border-[#009FE2]/30',
        text: 'text-[#009FE2]',
        gradient: 'from-[#009FE2]/15 via-[#101317] to-[#101317]',
      }
    case 'SLIDES':
    case 'PPT':
    case 'PPTX':
    case 'KEY':
      return {
        bg: 'bg-[#FAB800]/15',
        border: 'border-[#FAB800]/30',
        text: 'text-[#FAB800]',
        gradient: 'from-[#FAB800]/15 via-[#101317] to-[#101317]',
      }
    case 'SHEET':
    case 'XLS':
    case 'XLSX':
    case 'CSV':
      return {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        gradient: 'from-emerald-500/15 via-[#101317] to-[#101317]',
      }
    case 'PDF':
      return {
        bg: 'bg-[#E30613]/15',
        border: 'border-[#E30613]/30',
        text: 'text-[#E30613]',
        gradient: 'from-[#E30613]/15 via-[#101317] to-[#101317]',
      }
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'WEBP':
    case 'SVG':
    case 'IMAGE':
      return {
        bg: 'bg-[#009FE2]/15',
        border: 'border-[#009FE2]/30',
        text: 'text-[#009FE2]',
        gradient: 'from-[#009FE2]/15 via-[#101317] to-[#101317]',
      }
    case 'MP4':
    case 'MOV':
    case 'VIDEO':
      return {
        bg: 'bg-[#009FE2]/15',
        border: 'border-[#009FE2]/30',
        text: 'text-[#009FE2]',
        gradient: 'from-[#009FE2]/15 via-[#101317] to-[#101317]',
      }
    case 'ZIP':
    case 'RAR':
      return {
        bg: 'bg-[#FAB800]/15',
        border: 'border-[#FAB800]/30',
        text: 'text-[#FAB800]',
        gradient: 'from-[#FAB800]/15 via-[#101317] to-[#101317]',
      }
    default:
      return {
        bg: 'bg-white/10',
        border: 'border-white/20',
        text: 'text-white',
        gradient: 'from-white/10 via-[#101317] to-[#101317]',
      }
  }
}
