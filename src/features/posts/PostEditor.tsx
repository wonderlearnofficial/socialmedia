import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TEAM } from '@/data/team'
import { useCreatePost, useUpdatePost } from '@/hooks/usePosts'
import { CONTENT_TYPE_META, STATUS_META, WORKSPACE_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import { CONTENT_TYPES, POST_STATUSES, type Post, type SocialPlatform } from '@/types'
import { PlatformSelector } from './PlatformSelector'
import { postSchema, type PostFormValues } from './postSchema'

interface PostEditorProps {
  open: boolean
  post?: Post | null
  presetDate?: string | null
  presetTime?: string | null
  onClose: () => void
}

const emptyValues = (
  date: string,
  time: string,
  defaultPlatforms: SocialPlatform[] = [],
): PostFormValues => ({
  title: '',
  description: '',
  topic: '',
  caption: '',
  date,
  time,
  platforms: defaultPlatforms,
  contentType: 'image',
  status: 'draft',
  assignee: '',
  contentUrl: '',
  contentFileName: '',
  mediaPreview: '',
})

export function PostEditor({ open, post, presetDate, presetTime, onClose }: PostEditorProps) {
  const { t } = useTranslation()
  const create = useCreatePost()
  const update = useUpdatePost()
  const isEdit = Boolean(post)
  const activeWorkspace = useAppSelector((s) => s.settings.activeWorkspace)
  const defaultPlatforms = WORKSPACE_META[activeWorkspace].defaultPlatforms

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: emptyValues(presetDate ?? '', presetTime ?? '10:00', defaultPlatforms),
  })

  // Repopulate whenever the target post (or preset day) changes.
  useEffect(() => {
    if (!open) return
    if (post) {
      reset({
        title: post.title,
        description: post.description,
        topic: post.topic,
        caption: post.caption,
        date: post.date,
        time: post.time,
        platforms: post.platforms,
        contentType: post.contentType,
        status: post.status,
        assignee: post.assignee ?? '',
        contentUrl: post.contentUrl ?? '',
        contentFileName: post.contentFileName ?? '',
        mediaPreview: post.mediaPreview ?? '',
      })
    } else {
      reset(
        emptyValues(
          presetDate ?? new Date().toISOString().slice(0, 10),
          presetTime ?? '10:00',
          defaultPlatforms,
        ),
      )
    }
  }, [open, post, presetDate, presetTime, reset, defaultPlatforms])

  const onSubmit = handleSubmit(async (raw) => {
    const values = postSchema.parse(raw)
    const payload = {
      ...values,
      workspace: activeWorkspace,
      assignee: values.assignee || undefined,
      contentUrl: values.contentUrl || undefined,
      contentFileName: values.contentFileName || undefined,
      mediaPreview: values.mediaPreview || undefined,
    }

    try {
      if (post) {
        await update.mutateAsync({ id: post.id, patch: payload })
        toast.success(t('post.saved'))
      } else {
        await create.mutateAsync(payload)
        toast.success(t('post.created'))
      }
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    }
  })

  const err = (key: keyof PostFormValues) => {
    const message = errors[key]?.message
    return message ? t(message) : undefined
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-5 pe-14">
          <DialogTitle>{isEdit ? t('editor.editTitle') : t('editor.createTitle')}</DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? post?.title : t('calendar.subtitle', { month: '' }).trim()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <FormRow label={t('editor.titleLabel')} error={err('title')} htmlFor="post-title">
              <Input
                id="post-title"
                {...register('title')}
                placeholder={t('editor.titlePlaceholder')}
                aria-invalid={Boolean(errors.title)}
              />
            </FormRow>

            <FormRow label={t('editor.descriptionLabel')} htmlFor="post-description">
              <Textarea
                id="post-description"
                {...register('description')}
                placeholder={t('editor.descriptionPlaceholder')}
                rows={3}
              />
            </FormRow>

            <FormRow label={t('editor.captionLabel')} htmlFor="post-caption">
              <Textarea
                id="post-caption"
                {...register('caption')}
                placeholder={t('editor.captionPlaceholder')}
                rows={4}
              />
            </FormRow>

            <FormRow label={t('editor.platformsLabel')} error={err('platforms')}>
              <Controller
                control={control}
                name="platforms"
                render={({ field }) => (
                  <PlatformSelector value={field.value} onChange={field.onChange} />
                )}
              />
            </FormRow>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label={t('editor.dateLabel')} error={err('date')} htmlFor="post-date">
                <Input id="post-date" type="date" {...register('date')} />
              </FormRow>
              <FormRow label={t('editor.timeLabel')} error={err('time')} htmlFor="post-time">
                <Input id="post-time" type="time" {...register('time')} />
              </FormRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label={t('editor.contentTypeLabel')}>
                <Controller
                  control={control}
                  name="contentType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => {
                          const Icon = CONTENT_TYPE_META[type].icon
                          return (
                            <SelectItem key={type} value={type}>
                              <span className="flex items-center gap-2">
                                <Icon className="size-3.5 text-muted-foreground" />
                                {t(CONTENT_TYPE_META[type].labelKey)}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormRow>

              <FormRow label={t('editor.statusLabel')}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn('size-1.5 rounded-full', STATUS_META[status].dot)}
                              />
                              {t(STATUS_META[status].labelKey)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label={t('editor.topicLabel')} htmlFor="post-topic">
                <Input
                  id="post-topic"
                  {...register('topic')}
                  placeholder={t('editor.topicPlaceholder')}
                />
              </FormRow>

              <FormRow label={t('editor.assigneeLabel')}>
                <Controller
                  control={control}
                  name="assignee"
                  render={({ field }) => (
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('editor.assigneePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {TEAM.filter(
                          (m) => m.workspace === activeWorkspace && m.focus.length > 0,
                        ).map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormRow>
            </div>

            <FormRow
              label={t('editor.contentUrlLabel')}
              error={err('contentUrl')}
              hint={t('editor.contentUrlHint')}
              htmlFor="post-url"
            >
              <Input
                id="post-url"
                {...register('contentUrl')}
                placeholder={t('editor.contentUrlPlaceholder')}
                inputMode="url"
              />
            </FormRow>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label={t('editor.fileNameLabel')} htmlFor="post-filename">
                <Input
                  id="post-filename"
                  {...register('contentFileName')}
                  placeholder={t('editor.fileNamePlaceholder')}
                />
              </FormRow>
              <FormRow
                label={t('editor.mediaPreviewLabel')}
                error={err('mediaPreview')}
                htmlFor="post-thumb"
              >
                <Input
                  id="post-thumb"
                  {...register('mediaPreview')}
                  placeholder={t('editor.mediaPreviewPlaceholder')}
                  inputMode="url"
                />
              </FormRow>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t p-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              {t('editor.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? t('editor.save') : t('editor.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormRow({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
