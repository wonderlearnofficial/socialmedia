import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
  UserRound,
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ContentLinkCard } from '@/features/media/ContentLinkCard'
import { MediaPreview } from '@/features/media/MediaPreview'
import { FeedbackForm } from '@/features/review/FeedbackForm'
import { ReviewPanel } from '@/features/review/ReviewPanel'
import { SocialPreview } from '@/features/posts/SocialPreview'
import { useAddFeedback, useDeletePost, useDuplicatePost, useUpdatePost } from '@/hooks/usePosts'
import { moveFileToStage, uploadFile } from '@/services/upload'
import { useFiles } from '@/hooks/useFiles'
import { useSession } from '@/hooks/useSession'
import { formatBytes } from '@/lib/format'
import { PLATFORM_META, STATUS_META } from '@/lib/constants'
import { formatDateFull, formatTime, formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/utils'
import {
  POST_STATUSES,
  type DriveStage,
  type Post,
  type PostStatus,
  type SocialPlatform,
} from '@/types'

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
  const [changesOpen, setChangesOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform | null>(null)

  const addFeedback = useAddFeedback()
  const duplicate = useDuplicatePost()
  const remove = useDeletePost()
  const update = useUpdatePost()
  const { displayName } = useSession()
  const { data: allFiles = [] } = useFiles(post?.workspace ?? 'wonderlearn')
  const attachedFiles = allFiles.filter((f) => f.postId === post?.id)

  // Reset transient UI whenever a different post is opened.
  useEffect(() => {
    setChangesOpen(false)
    setConfirmDelete(false)
    setPreviewPlatform(null)
  }, [post?.id])

  if (!post) return null

  const activePreview = previewPlatform ?? post.platforms[0] ?? 'instagram'
  const author = reviewer?.name ?? displayName
  const role = reviewer?.role ?? 'manager'

  const isComplete = post.status === 'waiting_to_post' || post.status === 'posted'

  /**
   * Marking complete is two systems agreeing: the image moves from Review to
   * Done in Drive, and the post becomes Waiting to Post. Drive goes first —
   * if the move fails, nothing else happens, so the status never claims a
   * handoff that didn't actually occur.
   */
  const complete = async () => {
    let driveStage: DriveStage | undefined
    if (post.driveFileId && post.driveStage !== 'done') {
      setCompleting(true)
      try {
        await moveFileToStage(post.driveFileId, 'done')
        driveStage = 'done'
      } catch {
        toast.error(t('post.moveFailed'))
        return
      } finally {
        setCompleting(false)
      }
    }
    await addFeedback.mutateAsync({
      id: post.id,
      input: { author, role, kind: 'status_change', status: 'waiting_to_post', message: '' },
      driveStage,
    })
    toast.success(t('post.completedToast'))
  }

  const requestChanges = async (message: string) => {
    await addFeedback.mutateAsync({
      id: post.id,
      input: { author, role, kind: 'status_change', status: 'changes_required', message },
    })
    setChangesOpen(false)
    toast.success(t('post.changesToast'))
  }

  const comment = async (message: string) => {
    await addFeedback.mutateAsync({
      id: post.id,
      input: { author, role, kind: 'comment', message },
    })
  }

  const setStatus = async (status: PostStatus) => {
    await addFeedback.mutateAsync({
      id: post.id,
      input: {
        author,
        role: 'manager',
        kind: 'status_change',
        status,
        message: '',
      },
    })
    toast.success(t('review.statusEvent', { status: t(STATUS_META[status].labelKey) }))
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(post.caption)
      toast.success(t('post.captionCopied'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const handleMediaUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploadingMedia(true)
    try {
      const result = await uploadFile(file, { stage: 'review' })
      await update.mutateAsync({
        id: post.id,
        patch: {
          contentUrl: result.url,
          contentFileName: result.fileName,
          driveFileId: result.fileId,
        },
      })
      toast.success(t('editor.uploadDone'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setUploadingMedia(false)
    }
  }

  const sharePost = async () => {
    // Deep-link into whichever calendar the viewer is on (dashboard or share page).
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
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent className="gap-0 p-0" aria-describedby={undefined}>
          {/* Header */}
          <header className="shrink-0 border-b p-5 pe-14">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-muted-foreground">
              {post.platforms.map((p, i) => (
                <span key={p} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <PlatformIcon platform={p} brand className="size-3.5" />
                  {PLATFORM_META[p].label}
                </span>
              ))}
            </div>

            <SheetTitle className="mt-2.5 text-lg font-semibold leading-snug tracking-tight">
              {post.title}
            </SheetTitle>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <StatusBadge status={post.status} />
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDateFull(post.date, i18n.language)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatTime(post.time, i18n.language)}
              </span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {!readOnly && onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(post.id)}>
                  <Pencil />
                  {t('post.edit')}
                </Button>
              )}
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await duplicate.mutateAsync(post.id)
                    toast.success(t('post.duplicated'))
                  }}
                  disabled={duplicate.isPending}
                >
                  <Copy />
                  {t('post.duplicate')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={sharePost}>
                <Share2 />
                {t('post.share')}
              </Button>

              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={t('post.more')}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t('post.setStatus')}</DropdownMenuLabel>
                    {POST_STATUSES.map((status) => (
                      <DropdownMenuItem key={status} onSelect={() => setStatus(status)}>
                        <span className={cn('size-1.5 rounded-full', STATUS_META[status].dot)} />
                        {t(STATUS_META[status].labelKey)}
                        {post.status === status && <Check className="ms-auto size-3.5" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setConfirmDelete(true)}
                      className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                    >
                      <Trash2 />
                      {t('post.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Tabs defaultValue="details" className="flex min-h-full flex-col">
              <div className="px-5 pt-4">
                <TabsList>
                  <TabsTrigger value="details">{t('post.detailsTab')}</TabsTrigger>
                  <TabsTrigger value="preview">{t('post.previewTab')}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="mt-0 space-y-5 p-5">
                <MediaPreview
                  post={post}
                  aspect="auto"
                  onUpload={readOnly ? undefined : handleMediaUpload}
                  uploading={uploadingMedia}
                />

                {post.contentUrl && (
                  <ContentLinkCard url={post.contentUrl} fileName={post.contentFileName} />
                )}

                {attachedFiles.length > 0 && (
                  <Field label={t('post.attachedFiles')}>
                    <ul className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <li key={file.id}>
                          <a
                            href={file.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/60"
                          >
                            <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatBytes(file.size)}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Field>
                )}

                <Field
                  label={t('post.caption')}
                  action={
                    post.caption && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={copyCaption}
                      >
                        <Copy className="size-3" />
                        {t('post.copyCaption')}
                      </Button>
                    )
                  }
                >
                  <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
                    {post.caption || t('post.noCaption')}
                  </p>
                </Field>

                <Field label={t('post.description')}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {post.description || t('post.noDescription')}
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Meta label={t('post.topic')}>{post.topic || '—'}</Meta>
                  <Meta label={t('post.contentTypeLabel')}>
                    <ContentTypeBadge type={post.contentType} />
                  </Meta>
                  <Meta label={t('post.date')}>{formatDateFull(post.date, i18n.language)}</Meta>
                  <Meta label={t('post.time')}>{formatTime(post.time, i18n.language)}</Meta>
                  <Meta label={t('post.statusLabel')}>
                    <StatusBadge status={post.status} />
                  </Meta>
                  {post.reviewedBy && <Meta label={t('post.completedBy')}>{post.reviewedBy}</Meta>}
                  {post.completedAt && (
                    <Meta label={t('post.completedAt')}>
                      {formatTimestamp(post.completedAt, i18n.language)}
                    </Meta>
                  )}
                  {!readOnly && post.assignee && (
                    <Meta label={t('post.assignee')}>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5 text-muted-foreground" />
                        {post.assignee}
                      </span>
                    </Meta>
                  )}
                </div>

                <Separator />

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
              </TabsContent>

              <TabsContent value="preview" className="mt-0 space-y-4 p-5">
                {post.platforms.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.platforms.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreviewPlatform(p)}
                        className={cn(
                          'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                          activePreview === p
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent',
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
                <SocialPreview post={post} platform={activePreview} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Review actions pinned to the bottom */}
          <footer className="shrink-0 border-t bg-card p-4">
            {changesOpen ? (
              <FeedbackForm
                onSubmit={requestChanges}
                onCancel={() => setChangesOpen(false)}
                pending={addFeedback.isPending}
              />
            ) : (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={complete}
                  disabled={addFeedback.isPending || completing || isComplete}
                >
                  <CheckCircle2 />
                  {isComplete ? t('post.completed') : t('post.markComplete')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setChangesOpen(true)}
                  disabled={addFeedback.isPending}
                >
                  <RotateCcw />
                  {t('post.requestChanges')}
                </Button>
              </div>
            )}
          </footer>
        </SheetContent>
      </Sheet>

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
    <section className="space-y-1.5">
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
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
