export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'x',
  'linkedin',
] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const POST_STATUSES = [
  'draft',
  'in_review',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
] as const
export type PostStatus = (typeof POST_STATUSES)[number]

export const CONTENT_TYPES = ['image', 'video', 'carousel', 'reel', 'story', 'text'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export type FeedbackRole = 'owner' | 'manager' | 'system'

export interface Feedback {
  id: string
  author: string
  role: FeedbackRole
  kind: 'comment' | 'status_change'
  message: string
  status?: PostStatus
  createdAt: string
}

export interface Post {
  id: string
  title: string
  description: string
  topic: string
  caption: string
  /** yyyy-MM-dd */
  date: string
  /** HH:mm (24h) */
  time: string
  platforms: SocialPlatform[]
  contentType: ContentType
  contentUrl?: string
  contentFileName?: string
  mediaPreview?: string
  status: PostStatus
  assignee?: string
  feedback: Feedback[]
  createdAt: string
  updatedAt: string
}

export type PostInput = Omit<Post, 'id' | 'feedback' | 'createdAt' | 'updatedAt'>

export interface ShareLink {
  id: string
  /** yyyy-MM anchor of the shared month */
  month: string
  createdAt: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  email: string
  focus: SocialPlatform[]
}
