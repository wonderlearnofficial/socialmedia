import { supabase } from '@/services/supabaseClient'

/**
 * Resize and center-crop an uploaded image file into a square blob (256x256).
 */
export async function processAvatarBlob(
  file: File,
  maxSize = 256,
): Promise<{ blob: Blob; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = maxSize
        canvas.height = maxSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        // Center-crop to square
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize)

        const dataUrl = canvas.toDataURL('image/webp', 0.88)
        const mimeType = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'))
              return
            }
            resolve({ blob, dataUrl, mimeType })
          },
          mimeType,
          0.88,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export interface ProcessedAvatar {
  blob: Blob
  dataUrl: string
  mimeType: string
}

/**
 * Render an explicit square region of an already-loaded image — the crop the
 * person actually chose, in the image's own pixel coordinates.
 *
 * `processAvatarBlob` above still center-crops, which is the right default for
 * a file nobody has adjusted, but it's a guess: on a portrait photo it cuts the
 * head off. This is how that guess gets overridden.
 */
export async function renderAvatarCrop(
  image: HTMLImageElement,
  crop: { x: number; y: number; size: number },
  maxSize = 256,
): Promise<ProcessedAvatar> {
  const canvas = document.createElement('canvas')
  canvas.width = maxSize
  canvas.height = maxSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // Clamp into the image so a rounding error at the edge can't produce a
  // transparent sliver down one side of the avatar.
  const size = Math.min(crop.size, image.naturalWidth, image.naturalHeight)
  const x = Math.max(0, Math.min(crop.x, image.naturalWidth - size))
  const y = Math.max(0, Math.min(crop.y, image.naturalHeight - size))

  ctx.drawImage(image, x, y, size, size, 0, 0, maxSize, maxSize)

  const dataUrl = canvas.toDataURL('image/webp', 0.88)
  const mimeType = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.88))
  if (!blob) throw new Error('Failed to create image blob')
  return { blob, dataUrl, mimeType }
}

/**
 * Put an already-processed avatar into Supabase Storage. Split out from
 * `uploadAvatar` so a cropped blob takes exactly the same path — including the
 * data-URL fallback when the bucket isn't reachable.
 */
export async function uploadAvatarBlob(
  processed: ProcessedAvatar,
  memberId?: string,
): Promise<string> {
  const { blob, dataUrl, mimeType } = processed
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const cleanId = memberId ? memberId.replace(/[^a-zA-Z0-9_-]/g, '') : 'member'
  const filePath = `team/${cleanId}-${Date.now()}.${ext}`

  try {
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: mimeType,
    })

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      if (data?.publicUrl) {
        return data.publicUrl
      }
    } else {
      console.warn('Supabase storage upload fallback:', uploadError.message)
    }
  } catch (err) {
    console.warn('Supabase storage unavailable, falling back to data URL:', err)
  }

  // Graceful fallback to optimized data URL so UI never fails
  return dataUrl
}

/**
 * Resize image and upload directly to Supabase Storage 'avatars' bucket.
 * Returns the public URL of the uploaded avatar.
 * Falls back to the optimized data URL if storage bucket is unavailable.
 */
export async function uploadAvatar(file: File, memberId?: string): Promise<string> {
  return uploadAvatarBlob(await processAvatarBlob(file, 256), memberId)
}

/** Legacy alias for backwards compatibility */
export const processAvatarImage = async (file: File, maxSize = 256): Promise<string> => {
  const res = await processAvatarBlob(file, maxSize)
  return res.dataUrl
}
