import { describe, expect, it } from 'vitest'
import {
  buildPostFileName,
  detectMedia,
  driveFilePreviewUrl,
  driveThumbnailUrl,
  fileNameFromUrl,
  googleDriveFileId,
} from './media'

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

describe('driveFilePreviewUrl', () => {
  // Everything that isn't an image — PDFs, video, Docs, Slides, Sheets — is
  // shown through this embed rather than the thumbnail endpoint.
  it('builds the embeddable Drive viewer URL for any file id', () => {
    expect(driveFilePreviewUrl('1AbCdEfGhIjKlM')).toBe(
      'https://drive.google.com/file/d/1AbCdEfGhIjKlM/preview',
    )
  })
})

describe('buildPostFileName', () => {
  it('formats filename with post title preserving existing extension', () => {
    expect(buildPostFileName('TEst', 'image.png')).toBe('TEst.png')
    expect(buildPostFileName('Summer Promo 2026', 'upload-1234.jpg')).toBe('Summer Promo 2026.jpg')
  })

  it('does not duplicate extension if post title already contains it', () => {
    expect(buildPostFileName('TEst.png', 'image.png')).toBe('TEst.png')
    expect(buildPostFileName('video.mp4', 'raw.mp4')).toBe('video.mp4')
  })

  it('extracts extension from url if existingFileName is not provided', () => {
    expect(
      buildPostFileName('Product Feature', null, 'https://example.com/assets/banner.webp'),
    ).toBe('Product Feature.webp')
  })

  it('infers extension based on content type when no extension exists', () => {
    expect(buildPostFileName('Brand Reel', null, null, 'reel')).toBe('Brand Reel.mp4')
    expect(buildPostFileName('Graphic Post', null, null, 'image')).toBe('Graphic Post.png')
  })

  it('sanitizes invalid path characters from post title', () => {
    expect(buildPostFileName('New/Post:Special?Title*', 'graphic.png')).toBe(
      'New-Post-Special-Title-.png',
    )
  })
})
