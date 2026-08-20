import { describe, expect, it } from 'vitest'
import { detectMedia, driveThumbnailUrl, fileNameFromUrl, googleDriveFileId } from './media'

describe('googleDriveFileId', () => {
  it('reads the id from a /file/d/ share URL', () => {
    expect(
      googleDriveFileId('https://drive.google.com/file/d/1AbCdEfGhIjKlM/view?usp=sharing'),
    ).toBe('1AbCdEfGhIjKlM')
  })

  it('reads the id from an open?id= URL', () => {
    expect(googleDriveFileId('https://drive.google.com/open?id=1AbCdEfGhIjKlM')).toBe(
      '1AbCdEfGhIjKlM',
    )
  })

  it('returns null when there is no id', () => {
    expect(googleDriveFileId('https://drive.google.com/drive/my-drive')).toBeNull()
  })
})

describe('detectMedia', () => {
  it('detects Google Drive and derives a thumbnail', () => {
    const media = detectMedia('https://drive.google.com/file/d/1AbCdEfGhIjKlM/view')
    expect(media.provider).toBe('google-drive')
    expect(media.label).toBe('Google Drive')
    expect(media.previewUrl).toBe(driveThumbnailUrl('1AbCdEfGhIjKlM'))
  })

  it('leaves Drive folder links without a preview rather than guessing', () => {
    const media = detectMedia('https://drive.google.com/drive/folders/abc')
    expect(media.provider).toBe('google-drive')
    expect(media.previewUrl).toBeUndefined()
  })

  it.each([
    ['https://www.dropbox.com/s/abc/file.png?dl=0', 'dropbox'],
    ['https://1drv.ms/i/s!Abc', 'onedrive'],
    ['https://www.figma.com/design/abc/board', 'figma'],
    ['https://www.canva.com/design/abc/view', 'canva'],
  ] as const)('classifies %s as %s', (url, provider) => {
    expect(detectMedia(url).provider).toBe(provider)
  })

  it('treats direct image URLs as previewable images', () => {
    const media = detectMedia('https://cdn.example.com/photo.jpg')
    expect(media.kind).toBe('image')
    expect(media.previewUrl).toBe('https://cdn.example.com/photo.jpg')
  })

  it('treats direct video URLs as previewable video', () => {
    expect(detectMedia('https://cdn.example.com/clip.mp4').kind).toBe('video')
  })

  it('falls back to a plain link for anything unrecognised', () => {
    expect(detectMedia('not a url').provider).toBe('link')
    expect(detectMedia('https://example.com/page').provider).toBe('link')
  })

  it('rewrites dropbox preview links to a raw asset', () => {
    expect(detectMedia('https://www.dropbox.com/s/abc/file.png?dl=0').previewUrl).toContain('raw=1')
  })
})

describe('fileNameFromUrl', () => {
  it('extracts a file name when the path has an extension', () => {
    expect(fileNameFromUrl('https://cdn.example.com/media/back-to-school.jpg')).toBe(
      'back-to-school.jpg',
    )
  })

  it('returns null for extension-less paths', () => {
    expect(fileNameFromUrl('https://example.com/some/page')).toBeNull()
  })
})
