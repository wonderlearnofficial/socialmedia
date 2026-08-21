import { useCallback, useEffect, useRef, useState } from 'react'
import { filesFromDataTransfer } from './dataTransferFiles'

/** True only for drags carrying files — text and in-app drags shouldn't light
 *  the drop zone up. */
const hasFiles = (dt: DataTransfer | null) => Boolean(dt && Array.from(dt.types).includes('Files'))

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false)
  // dragleave also fires when the pointer crosses into a child element, so
  // count enter/leave pairs rather than trusting a single leave.
  const depth = useRef(0)

  // A file dropped anywhere else makes the browser navigate to it, throwing
  // away the whole SPA session. Swallow those drops instead.
  useEffect(() => {
    const swallow = (e: DragEvent) => {
      if (hasFiles(e.dataTransfer)) e.preventDefault()
    }
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => {
      window.removeEventListener('dragover', swallow)
      window.removeEventListener('drop', swallow)
    }
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    depth.current += 1
    setIsDragging(true)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    // Without this the drop event never fires at all.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setIsDragging(false)
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      depth.current = 0
      setIsDragging(false)
      const files = await filesFromDataTransfer(e.dataTransfer)
      if (files.length > 0) onFiles(files)
    },
    [onFiles],
  )

  return { isDragging, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
