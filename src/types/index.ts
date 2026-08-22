export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'x',
  'linkedin',
] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const WORKSPACES = ['wonderlearn', 'dr_wael'] as const
export type WorkspaceId = (typeof WORKSPACES)[number]

// The four states the design workflow actually moves through. `review` is
// where every new post starts; `waiting_to_post` means the design is done and
// its image has been moved to the Done folder; `posted` is marked by hand
// after publishing, since this app never publishes anything itself.
export const POST_STATUSES = ['review', 'changes_required', 'waiting_to_post', 'posted'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

// Google-native documents the Files browser can create. Drive makes these
// without any file being uploaded, so they have no bytes and no size.
export const GOOGLE_FILE_KINDS = ['doc', 'slides', 'sheets'] as const
export type GoogleFileKind = (typeof GOOGLE_FILE_KINDS)[number]

// Drive keeps post images in two stage folders under the shared root:
// everything lands in Review, and completing a post moves it to Done.
export const DRIVE_STAGES = ['review', 'done'] as const
export type DriveStage = (typeof DRIVE_STAGES)[number]

export const CONTENT_TYPES = ['image', 'video', 'carousel', 'reel', 'story', 'text'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export type FeedbackRole = 'owner' | 'manager' | 'system'
export type FeedbackKind = 'comment' | 'status_change'

export interface Feedback {
  id: string
  author: string
  role: FeedbackRole
  kind: FeedbackKind
  message: string
  status?: PostStatus
  createdAt: string
}

export interface FeedbackInput {
  author: string
  role: FeedbackRole
  kind: FeedbackKind
  message: string
  status?: PostStatus
}

export interface Post {
  id: string
  workspace: WorkspaceId
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
  /** Drive file id of the uploaded image — the handle used to move that file
   *  from Review to Done when the post is completed. */
  driveFileId?: string
  /** Which stage folder the image currently sits in. Kept alongside `status`
   *  rather than derived from it, so a Drive move that fails is visible. */
  driveStage?: DriveStage
  createdBy?: string
  /** Who marked the post complete and when — both cleared if it goes back
   *  to review or has changes requested. */
  reviewedBy?: string
  completedAt?: string
  feedback: Feedback[]
  createdAt: string
  updatedAt: string
}

export type PostInput = Omit<Post, 'id' | 'feedback' | 'createdAt' | 'updatedAt'>

export interface ShareLink {
  id: string
  workspace: WorkspaceId
  /** yyyy-MM anchor of the shared month */
  month: string
  createdAt: string
}

export const TEAM_ROLES = [
  'Super Admin',
  'Founder',
  'Social Media Manager',
  'Art Director',
  'Graphic Designer',
  'Instructional Designer',
  'Archive Master',
  'Accountant',
] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export interface TeamMember {
  id: string
  workspace: WorkspaceId
  name: string
  role: string
  email: string
  avatarUrl?: string
  focus?: SocialPlatform[]
  lastActive?: string
}

export type TeamMemberInput = Omit<TeamMember, 'id'>

// Named DriveFolder/DriveFile to avoid clashing with the DOM's File.
export interface DriveFolder {
  id: string
  workspace: WorkspaceId
  name: string
  driveFolderId: string
  parentId: string | null
  createdBy: string
  createdAt: string
}

export type FolderInput = Omit<DriveFolder, 'id' | 'createdAt'>

export interface DriveFile {
  id: string
  workspace: WorkspaceId
  name: string
  type: string
  size: number
  driveUrl: string
  driveFileId: string
  folderId: string | null
  postId: string | null
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export type FileRecordInput = Omit<DriveFile, 'id' | 'createdAt' | 'updatedAt'>

// ---------------------------------------------------------------------------
// Time Tracker
//
// companies → projects → work_items → time_entries. A Work Item is the unit of
// work; company and project only provide context. Two work items in the same
// project are entirely independent, so nothing here is ever keyed by
// company+project.
// ---------------------------------------------------------------------------

export const WORK_ITEM_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'completed'] as const
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number]

/** `running` and `completed` are set by the timer; `manual` marks an entry
 *  typed in by hand, `edited` one that was changed after the fact. */
export const TIME_ENTRY_STATUSES = ['running', 'completed', 'manual', 'edited'] as const
export type TimeEntryStatus = (typeof TIME_ENTRY_STATUSES)[number]

export interface Company {
  id: string
  name: string
  /** Chosen hex colour, or null to keep the one derived from the name. */
  color: string | null
  createdBy: string
  createdAt: string
}

export type CompanyInput = Omit<Company, 'id' | 'createdAt'>

export interface Project {
  id: string
  companyId: string
  name: string
  /** Chosen hex colour, or null to keep the one derived from the name. */
  color: string | null
  createdBy: string
  createdAt: string
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt'>

export interface WorkItem {
  id: string
  /** Immutable human-facing handle, e.g. "WI-000182". Assigned by Postgres at
   *  insert and never regenerated — renaming or re-parenting keeps it. */
  code: string
  projectId: string
  name: string
  description: string
  status: WorkItemStatus
  /** Optional link to a file in the Files module — work often exists before
   *  any file does. */
  fileId: string | null
  postId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type WorkItemInput = Omit<WorkItem, 'id' | 'code' | 'createdAt' | 'updatedAt'>

export interface TimeEntry {
  id: string
  /** Display name of whoever tracked the time — same attribution-by-name
   *  convention posts use for `assignee`/`createdBy`. */
  userName: string
  workItemId: string
  description: string
  startTime: string
  endTime: string | null
  /** Seconds. 0 while running; the live figure is derived from `startTime`. */
  duration: number
  /** yyyy-MM-dd of the local day the entry belongs to. */
  date: string
  status: TimeEntryStatus
  createdAt: string
  updatedAt: string
}

export type TimeEntryInput = Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>
