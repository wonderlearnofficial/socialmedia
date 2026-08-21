import type { DriveStage, GoogleFileKind } from '@/types'

const SCRIPT_URL = import.meta.env.VITE_UPLOAD_SCRIPT_URL

// Apps Script web apps don't handle CORS preflight — sending the body as
// text/plain (the default when no Content-Type is set) keeps this a
// "simple request" so the browser never sends an OPTIONS request first.
interface UploadResponse {
  success: boolean
  fileId?: string
  fileName?: string
  url?: string
  folderId?: string
  folderUrl?: string
  mimeType?: string
  error?: string
}

export interface UploadedFile {
  fileName: string
  url: string
  fileId?: string
  folderId?: string
  folderUrl?: string
}

export interface CreatedGoogleFile {
  fileId: string
  fileName: string
  url: string
  mimeType: string
}

interface CreatedFolder {
  folderId: string
  name: string
  url: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Plain fetch, no explicit headers, body as a JSON string — this is what
// keeps every request a CORS "simple request". Apps Script cannot answer an
// OPTIONS preflight at all, so nothing here may trigger one: no custom
// headers, no XHR upload-progress listener (attaching one forces the browser
// to preflight even with an otherwise-simple request/content-type).
async function postToScript<T>(body: unknown): Promise<T> {
  if (!SCRIPT_URL) {
    throw new Error(
      'Missing VITE_UPLOAD_SCRIPT_URL — copy .env.local.example to .env.local and fill it in.',
    )
  }
  const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

/** `stage` is how a post image lands in the Review folder without anyone
 *  choosing it; the Files browser passes `startFolderId` instead, which wins. */
export async function uploadFile(
  file: File,
  opts: { startFolderId?: string; stage?: DriveStage } = {},
): Promise<UploadedFile> {
  const base64 = await fileToBase64(file)
  const body: UploadResponse = await postToScript({
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    base64,
    startFolderId: opts.startFolderId,
    stage: opts.stage,
  })
  if (!body.success || !body.url) {
    throw new Error(body.error || `Upload failed for ${file.name}`)
  }
  return {
    fileName: body.fileName ?? file.name,
    url: body.url,
    fileId: body.fileId,
    folderId: body.folderId,
    folderUrl: body.folderUrl,
  }
}

export async function createDriveFolder(
  name: string,
  parentFolderId?: string,
): Promise<CreatedFolder> {
  const body: UploadResponse & { name?: string } = await postToScript({
    action: 'createFolder',
    name,
    parentFolderId,
  })
  if (!body.success || !body.folderId || !body.url) {
    throw new Error(body.error || `Could not create folder "${name}"`)
  }
  return { folderId: body.folderId, name: body.name ?? name, url: body.url }
}

/** Creates an empty Google Doc / Slides / Sheet straight in Drive — nothing is
 *  uploaded, so there are no bytes and no size to report. */
export async function createGoogleFile(
  kind: GoogleFileKind,
  name: string,
  parentFolderId?: string,
): Promise<CreatedGoogleFile> {
  const body: UploadResponse = await postToScript({
    action: 'createGoogleFile',
    kind,
    name,
    parentFolderId,
  })
  if (!body.success || !body.fileId || !body.url) {
    throw new Error(body.error || `Could not create "${name}"`)
  }
  return {
    fileId: body.fileId,
    fileName: body.fileName ?? name,
    url: body.url,
    mimeType: body.mimeType ?? '',
  }
}

/** Moves an already-uploaded image between the stage folders — the Drive half
 *  of marking a post complete. The file keeps its id and url. */
export async function moveFileToStage(fileId: string, stage: DriveStage): Promise<void> {
  const body: UploadResponse = await postToScript({ action: 'moveToStage', fileId, stage })
  if (!body.success) throw new Error(body.error || 'Could not move the file in Google Drive')
}

type DriveItemType = 'file' | 'folder'

export async function renameDriveItem(itemType: DriveItemType, id: string, name: string) {
  const body: UploadResponse = await postToScript({ action: 'rename', itemType, id, name })
  if (!body.success) throw new Error(body.error || `Could not rename "${name}"`)
}

export async function moveDriveItem(itemType: DriveItemType, id: string, newParentId: string) {
  const body: UploadResponse = await postToScript({ action: 'move', itemType, id, newParentId })
  if (!body.success) throw new Error(body.error || 'Could not move item')
}

export async function trashDriveItem(itemType: DriveItemType, id: string) {
  const body: UploadResponse = await postToScript({ action: 'trash', itemType, id })
  if (!body.success) throw new Error(body.error || 'Could not delete item')
}
