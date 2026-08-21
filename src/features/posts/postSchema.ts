import { z } from 'zod'
import { CONTENT_TYPES, DRIVE_STAGES, POST_STATUSES, SOCIAL_PLATFORMS } from '@/types'

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), { message: 'editor.urlInvalid' })
  .optional()

export const postSchema = z.object({
  title: z.string().trim().min(1, 'editor.titleRequired'),
  description: z.string().trim().default(''),
  topic: z.string().trim().default(''),
  caption: z.string().default(''),
  date: z.string().min(1, 'editor.dateRequired'),
  time: z.string().min(1, 'editor.timeRequired'),
  platforms: z.array(z.enum(SOCIAL_PLATFORMS)).min(1, 'editor.platformsRequired'),
  contentType: z.enum(CONTENT_TYPES),
  status: z.enum(POST_STATUSES),
  assignee: z.string().trim().optional(),
  contentUrl: optionalUrl,
  contentFileName: z.string().trim().optional(),
  mediaPreview: optionalUrl,
  // Not editable by hand — set by UploadField so the post knows which Drive
  // file to move when it's completed.
  driveFileId: z.string().trim().optional(),
  driveStage: z.enum(DRIVE_STAGES).optional(),
})

export type PostFormValues = z.input<typeof postSchema>
export type PostFormOutput = z.output<typeof postSchema>
