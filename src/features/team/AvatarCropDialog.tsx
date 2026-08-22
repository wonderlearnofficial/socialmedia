import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { renderAvatarCrop, type ProcessedAvatar } from '@/lib/avatarImage'

/** On-screen side of the crop window, in CSS pixels. */
const VIEW = 260
const MAX_ZOOM = 4

interface AvatarCropDialogProps {
  /** The picked file. Non-null is what opens the dialog. */
  file: File | null
  onCancel: () => void
  onCropped: (processed: ProcessedAvatar) => void
}

/**
 * Drag-and-zoom square cropper.
 *
 * At zoom 1 the image exactly covers the crop window, and panning is clamped to
 * the image bounds — so whatever is framed is always real pixels, and the
 * result can never come back with a transparent edge.
 */
export function AvatarCropDialog({ file, onCancel, onCropped }: AvatarCropDialogProps) {
  const { t } = useTranslation()
  const [src, setSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  // Read the picked file once; revoke the object URL when it goes away.
  useEffect(() => {
    if (!file) {
      setSrc(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('team.notAnImage'))
      onCancel()
      return
    }
    const url = URL.createObjectURL(file)
    setSrc(url)
    setReady(false)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(url)
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Screen pixels per image pixel at the current zoom. */
  const scaleFor = useCallback((z: number) => {
    const img = imageRef.current
    if (!img) return 1
    return (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * z
  }, [])

  const clamp = useCallback(
    (next: { x: number; y: number }, z: number) => {
      const img = imageRef.current
      if (!img) return next
      const scale = scaleFor(z)
      const minX = VIEW - img.naturalWidth * scale
      const minY = VIEW - img.naturalHeight * scale
      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      }
    },
    [scaleFor],
  )

  const handleLoad = () => {
    const img = imageRef.current
    if (!img) return
    const scale = scaleFor(1)
    // Start centred — the same framing the old silent center-crop produced,
    // so leaving it untouched is never worse than before.
    setOffset({
      x: (VIEW - img.naturalWidth * scale) / 2,
      y: (VIEW - img.naturalHeight * scale) / 2,
    })
    setReady(true)
  }

  /** Zoom about the centre of the crop window, not the image's origin. */
  const applyZoom = (nextZoom: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, Number(nextZoom.toFixed(3))))
    const oldScale = scaleFor(zoom)
    const newScale = scaleFor(z)
    const centreX = (VIEW / 2 - offset.x) / oldScale
    const centreY = (VIEW / 2 - offset.y) / oldScale
    setZoom(z)
    setOffset(clamp({ x: VIEW / 2 - centreX * newScale, y: VIEW / 2 - centreY * newScale }, z))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset(clamp({ x: e.clientX - drag.x, y: e.clientY - drag.y }, zoom))
  }

  const endDrag = (e: React.PointerEvent) => {
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const reset = () => {
    setZoom(1)
    handleLoad()
  }

  const confirm = async () => {
    const img = imageRef.current
    if (!img) return
    setSaving(true)
    try {
      // Screen coordinates back into the image's own pixels.
      const scale = scaleFor(zoom)
      const processed = await renderAvatarCrop(img, {
        x: -offset.x / scale,
        y: -offset.y / scale,
        size: VIEW / scale,
      })
      onCropped(processed)
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setSaving(false)
    }
  }

  const scale = ready ? scaleFor(zoom) : 1
  const img = imageRef.current

  return (
    <Dialog open={Boolean(file)} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('team.cropTitle')}</DialogTitle>
          <DialogDescription>{t('team.cropBody')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={(e) => applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            style={{ width: VIEW, height: VIEW }}
            className="relative touch-none overflow-hidden rounded-lg bg-black/40 cursor-grab active:cursor-grabbing"
          >
            {src && (
              <img
                ref={imageRef}
                src={src}
                onLoad={handleLoad}
                alt=""
                draggable={false}
                style={
                  ready && img
                    ? {
                        position: 'absolute',
                        left: offset.x,
                        top: offset.y,
                        width: img.naturalWidth * scale,
                        height: img.naturalHeight * scale,
                        maxWidth: 'none',
                      }
                    : { position: 'absolute', opacity: 0 }
                }
              />
            )}
            {/* Circular guide — avatars render round everywhere in the app, so
                the framing shown here is the framing people will see. One
                element: the huge outward box-shadow dims everything outside the
                circle, and the parent's overflow-hidden trims it to the box. */}
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>

          <div className="flex w-full items-center gap-3">
            <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              aria-label={t('team.zoom')}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={reset}
              aria-label={t('team.resetCrop')}
              title={t('team.resetCrop')}
            >
              <RotateCcw />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={confirm} disabled={saving || !ready}>
            {saving && <Loader2 className="animate-spin" />}
            {t('team.applyCrop')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
