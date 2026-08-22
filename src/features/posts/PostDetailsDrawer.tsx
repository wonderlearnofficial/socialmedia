import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Folder,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { ContentLinkCard } from '@/features/media/ContentLinkCard'
import { FeedbackForm } from '@/features/review/FeedbackForm'
import { ReviewPanel } from '@/features/review/ReviewPanel'
import { SocialPreview } from '@/features/posts/SocialPreview'
import { useAddFeedback, useDeletePost, useUpdatePost } from '@/hooks/usePosts'
import { moveFileToStage } from '@/services/upload'
import { useFiles } from '@/hooks/useFiles'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { formatBytes } from '@/lib/format'
import { PLATFORM_META, STATUS_META, WORKSPACE_META } from '@/lib/constants'
import { formatDateFull, formatTime, formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { POST_STATUSES, type Post, type PostStatus, type SocialPlatform } from '@/types'

interface PostDetailsDrawerProps {
  post: Post | null
  open: boolean
  onClose: () => void
  onEdit?: (id: string) => void
  /** Owner review mode: mark complete / request changes, no authoring tools. */
  reviewer?: { name: string; role: 'owner' | 'manager' } | null
  readOnly?: boolean
}

export function PostDetailsDrawer({
  post,
  open,
  onClose,
  onEdit,
  reviewer,
  readOnly = false,
}: PostDetailsDrawerProps) {
  const { t, i18n } = useTranslation()
  const { displayName } = useSession()
  const { canEditPost, canDeletePost, canRequestChanges, canMarkAsDone } = usePermissions()
  const update = useUpdatePost()
  const remove = useDeletePost()
  const addFeedback = useAddFeedback()
  const { data: allFiles = [] } = useFiles(post?.workspace)

  const [changesOpen, setChangesOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('facebook')
  const [completing, setCompleting] = useState(false)

  // Auto-select Facebook if present on the post, otherwise the first attached platform
  useEffect(() => {
    if (post?.platforms?.length) {
      if (post.platforms.includes('facebook')) {
        setPreviewPlatform('facebook')
      } else {
        setPreviewPlatform(post.platforms[0])
      }
    }
  }, [post?.id, post?.platforms])

  if (!post) return null

  const isComplete = post.status === 'waiting_to_post' || post.status === 'posted'
  const activePreview = post.platforms.includes(previewPlatform)
    ? previewPlatform
    : post.platforms.includes('facebook')
      ? 'facebook'
      : (post.platforms[0] ?? 'facebook')

  const attachedFiles = allFiles.filter((f) => f.postId === post.id)

  const setStatus = async (status: PostStatus) => {
    try {
      await update.mutateAsync({ id: post.id, patch: { status } })
      toast.success(t('post.statusUpdated'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const comment = async (commentText: string) => {
    const author = reviewer?.name || displayName || 'Team Member'
    try {
      await addFeedback.mutateAsync({
        id: post.id,
        input: {
          author,
          role: reviewer?.role || 'manager',
          kind: 'comment',
          message: commentText,
        },
      })
      toast.success(t('review.commentAdded'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const requestChanges = async (commentText: string) => {
    const author = reviewer?.name || displayName || 'Dr. Wael Elmayyah'
    try {
      await addFeedback.mutateAsync({
        id: post.id,
        input: {
          author,
          role: reviewer?.role || 'owner',
          kind: 'status_change',
          message: commentText,
          status: 'changes_required',
        },
      })
      await update.mutateAsync({
        id: post.id,
        patch: { status: 'changes_required' },
      })
      setChangesOpen(false)
      toast.success(t('review.changesRequested'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const complete = async () => {
    const reviewerName = reviewer?.name || displayName || 'Dr. Wael Elmayyah'
    setCompleting(true)
    try {
      if (post.driveFileId) {
        try {
          await moveFileToStage(post.driveFileId, 'done', {
            folderName: post.topic?.trim() || undefined,
            category: WORKSPACE_META[post.workspace]?.driveCategory || 'Social Media',
          })
        } catch {
          // If Drive move fails, proceed with DB update
        }
      }

      await update.mutateAsync({
        id: post.id,
        patch: {
          status: 'waiting_to_post',
          reviewedBy: reviewerName,
          completedAt: new Date().toISOString(),
          driveStage: 'done',
        },
      })

      await addFeedback.mutateAsync({
        id: post.id,
        input: {
          author: reviewerName,
          role: reviewer?.role || 'owner',
          kind: 'status_change',
          message: t('review.autoApprovedComment'),
          status: 'waiting_to_post',
        },
      })

      toast.success(t('review.approved'))
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setCompleting(false)
    }
  }

  const copyCaption = async () => {
    if (!post.caption) return
    try {
      await navigator.clipboard.writeText(post.caption)
      toast.success(t('post.captionCopied'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const sharePost = async () => {
    const url = `${window.location.origin}${window.location.pathname}?post=${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('share.copied'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          className="flex max-h-[92vh] w-[95vw] max-w-5xl xl:max-w-6xl flex-col gap-0 overflow-hidden p-0 border-white/[0.08] bg-[#0E1217]"
          aria-describedby={undefined}
        >
          {/* Header Bar */}
          <header className="shrink-0 border-b border-white/[0.08] bg-[#12161D] px-6 py-3.5 pe-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Title + Minimal Platform Icons + 1-Click Status Selector */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <DialogTitle className="truncate text-lg font-bold text-white tracking-tight">
                  {post.title}
                </DialogTitle>

                {/* Minimal platform icons beside the title */}
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                  {post.platforms.map((p) => {
                    const meta = PLATFORM_META[p]
                    return (
                      <span
                        key={p}
                        title={meta.label}
                        className="flex size-5 items-center justify-center rounded transition-opacity hover:opacity-80"
                      >
                        <PlatformIcon platform={p} brand className="size-3.5" />
                      </span>
                    )
                  })}
                </div>

                {/* 1-Click Interactive Status Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={readOnly || (!canEditPost && !canMarkAsDone)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-neutral-200 transition-all hover:bg-white/[0.1] hover:border-white/[0.25] focus:outline-none cursor-pointer',
                        (readOnly || (!canEditPost && !canMarkAsDone)) &&
                          'opacity-60 cursor-not-allowed hover:border-white/[0.12]',
                      )}
                      title={t('post.setStatus', 'Click to change status')}
                    >
                      <span className={cn('size-2 rounded-full', STATUS_META[post.status].dot)} />
                      <span>{t(STATUS_META[post.status].labelKey)}</span>
                      {canEditPost || canMarkAsDone ? (
                        <ChevronDown className="size-3 text-neutral-400" />
                      ) : null}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-48 bg-[#161B22] border-white/[0.1]"
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t('post.setStatus', 'Change Status')}
                    </DropdownMenuLabel>
                    {POST_STATUSES.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onSelect={() => setStatus(status)}
                        className="gap-2 text-xs py-2 cursor-pointer focus:bg-white/[0.08]"
                      >
                        <span className={cn('size-2 rounded-full', STATUS_META[status].dot)} />
                        <span className="flex-1 font-medium">
                          {t(STATUS_META[status].labelKey)}
                        </span>
                        {post.status === status && (
                          <Check className="ms-auto size-3.5 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right: Actions (Edit, Share, Delete) */}
              <div className="flex items-center gap-2 shrink-0">
                {!readOnly && canEditPost && onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(post.id)}
                    className="h-8 rounded-xl border-white/[0.1] bg-white/[0.04] text-xs font-medium text-neutral-200 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Pencil className="size-3.5" />
                    {t('post.edit')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sharePost}
                  className="h-8 rounded-xl border-white/[0.1] bg-white/[0.04] text-xs font-medium text-neutral-200 hover:bg-white/[0.08] hover:text-white"
                >
                  <Share2 className="size-3.5" />
                  {t('post.share')}
                </Button>

                {!readOnly && canDeletePost && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    className="h-8 rounded-xl border-red-500/20 bg-red-500/10 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors"
                    title={t('post.delete')}
                  >
                    <Trash2 className="size-3.5" />
                    {t('post.delete')}
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Unified Body without tabs */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Social Media Preview & Switcher */}
              <div className="space-y-4 lg:col-span-6 flex flex-col items-center">
                {/* Platform Switcher Pills */}
                {post.platforms.length > 1 && (
                  <div className="flex flex-wrap gap-2 w-full justify-center pb-1">
                    {post.platforms.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreviewPlatform(p)}
                        className={cn(
                          'inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all cursor-pointer',
                          activePreview === p
                            ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,159,226,0.3)]'
                            : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-white',
                        )}
                      >
                        <PlatformIcon
                          platform={p}
                          brand={activePreview !== p}
                          className="size-3.5"
                        />
                        {PLATFORM_META[p].label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Social Media In-Feed Card */}
                <div className="w-full flex justify-center py-1">
                  <SocialPreview post={post} platform={activePreview} />
                </div>

                {/* Drive Location & Attached files beneath social preview */}
                {post.contentUrl && (
                  <div className="w-full space-y-2.5 pt-2">
                    <ContentLinkCard url={post.contentUrl} fileName={post.contentFileName} />
                    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                      <Folder className="size-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">
                        {t('files.driveLocation', 'Drive Location')}:
                      </span>
                      <span className="truncate font-mono text-[11px] text-neutral-300">
                        {post.status === 'waiting_to_post' || post.status === 'posted'
                          ? 'Done'
                          : 'Review'}{' '}
                        / {WORKSPACE_META[post.workspace]?.driveCategory || 'Social Media'}
                        {post.topic?.trim() ? ` / ${post.topic.trim()}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {attachedFiles.length > 0 && (
                  <div className="w-full">
                    <Field label={t('post.attachedFiles')}>
                      <ul className="space-y-1.5">
                        {attachedFiles.map((file) => (
                          <li key={file.id}>
                            <a
                              href={file.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                              <Paperclip className="size-3.5 shrink-0 text-primary" />
                              <span className="min-w-0 flex-1 truncate font-medium text-neutral-200">
                                {file.name}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {formatBytes(file.size)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </Field>
                  </div>
                )}
              </div>

              {/* Right Column: Caption, Metadata, Comments & Review Thread */}
              <div className="space-y-4 lg:col-span-6">
                <Field
                  label={t('editor.captionLabel', 'Caption')}
                  action={
                    post.caption && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-white"
                        onClick={copyCaption}
                      >
                        <Copy className="size-3" />
                        {t('post.copyCaption')}
                      </Button>
                    )
                  }
                >
                  <p className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-sm leading-relaxed text-neutral-200">
                    {post.caption || t('post.noCaption')}
                  </p>
                </Field>

                {post.description && (
                  <Field label={t('editor.descriptionLabel', 'Comments / Notes')}>
                    <p className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <Meta label={t('post.contentTypeLabel')}>
                    <ContentTypeBadge type={post.contentType} />
                  </Meta>
                  <Meta label={t('post.statusLabel')}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={readOnly}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-neutral-200 transition-all hover:bg-white/[0.08] hover:border-white/[0.2] focus:outline-none cursor-pointer"
                          title={t('post.setStatus', 'Click to change status')}
                        >
                          <span
                            className={cn('size-2 rounded-full', STATUS_META[post.status].dot)}
                          />
                          <span>{t(STATUS_META[post.status].labelKey)}</span>
                          <ChevronDown className="size-3 text-neutral-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 bg-[#161B22] border-white/[0.1]"
                      >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {t('post.setStatus', 'Change Status')}
                        </DropdownMenuLabel>
                        {POST_STATUSES.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onSelect={() => setStatus(status)}
                            className="gap-2 text-xs py-2 cursor-pointer focus:bg-white/[0.08]"
                          >
                            <span className={cn('size-2 rounded-full', STATUS_META[status].dot)} />
                            <span className="flex-1 font-medium">
                              {t(STATUS_META[status].labelKey)}
                            </span>
                            {post.status === status && (
                              <Check className="ms-auto size-3.5 text-primary" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Meta>
                  <Meta label={t('post.date')}>{formatDateFull(post.date, i18n.language)}</Meta>
                  <Meta label={t('post.time')}>{formatTime(post.time, i18n.language)}</Meta>
                  {post.reviewedBy && <Meta label={t('post.completedBy')}>{post.reviewedBy}</Meta>}
                  {post.completedAt && (
                    <Meta label={t('post.completedAt')}>
                      {formatTimestamp(post.completedAt, i18n.language)}
                    </Meta>
                  )}
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Review thread */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('review.title')}
                  </h3>
                  <ReviewPanel feedback={post.feedback} />
                  {!changesOpen && (
                    <FeedbackForm
                      variant="comment"
                      autoFocus={false}
                      onSubmit={comment}
                      pending={addFeedback.isPending}
                    />
                  )}
                </section>
              </div>
            </div>
          </div>

          {/* Review actions pinned to the bottom */}
          {!readOnly && (canMarkAsDone || canRequestChanges) && (
            <footer className="shrink-0 border-t border-white/[0.08] bg-[#12161D] p-4">
              {changesOpen ? (
                <FeedbackForm
                  onSubmit={requestChanges}
                  onCancel={() => setChangesOpen(false)}
                  pending={addFeedback.isPending}
                />
              ) : (
                <div className="flex gap-3">
                  {canMarkAsDone && (
                    <Button
                      className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#009FE2] to-cyan-500 text-white font-semibold shadow-[0_0_20px_rgba(0,159,226,0.3)] hover:opacity-95"
                      onClick={complete}
                      disabled={addFeedback.isPending || completing || isComplete}
                    >
                      <CheckCircle2 className="size-4" />
                      {isComplete ? t('post.completed') : t('post.markComplete')}
                    </Button>
                  )}
                  {canRequestChanges && (
                    <Button
                      variant="outline"
                      className="flex-1 h-10 rounded-xl border-white/[0.1] bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setChangesOpen(true)}
                      disabled={addFeedback.isPending}
                    >
                      <RotateCcw className="size-4" />
                      {t('post.requestChanges')}
                    </Button>
                  )}
                </div>
              )}
            </footer>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('post.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('post.deleteConfirmBody', { title: post.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('post.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync(post.id)
                setConfirmDelete(false)
                onClose()
                toast.success(t('post.deleted'))
              }}
            >
              <Trash2 />
              {t('post.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-xs">{children}</div>
    </div>
  )
}
