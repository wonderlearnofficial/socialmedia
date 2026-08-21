import { File, FileText, Image, Presentation, Table, Video } from 'lucide-react'
import { GOOGLE_FILE_META } from '@/lib/constants'

export function fileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Video
  if (mimeType === GOOGLE_FILE_META.doc.mimeType) return FileText
  if (mimeType === GOOGLE_FILE_META.slides.mimeType) return Presentation
  if (mimeType === GOOGLE_FILE_META.sheets.mimeType) return Table
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return FileText
  return File
}
