import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { FormRow } from '@/components/shared/FormRow'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTeamMember, useUpdateTeamMember } from '@/hooks/useTeamMembers'
import { uploadAvatarBlob, type ProcessedAvatar } from '@/lib/avatarImage'
import { TEAM_ROLES, type TeamMember } from '@/types'
import { AvatarCropDialog } from './AvatarCropDialog'
import { memberSchema, type MemberFormValues } from './memberSchema'
import { getRoleDescription, getRoleIcon, ROLE_DESCRIPTIONS } from './roleDescriptions'

interface TeamMemberEditorProps {
  open: boolean
  /** null/undefined = adding someone new. */
  member?: TeamMember | null
  onClose: () => void
}

const emptyValues: MemberFormValues = { name: '', role: 'Member', email: '', avatarUrl: '' }

export function TeamMemberEditor({ open, member, onClose }: TeamMemberEditorProps) {
  const { t } = useTranslation()
  const create = useCreateTeamMember()
  const update = useUpdateTeamMember()
  const isEdit = Boolean(member)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)

  // PIN generation for new members
  const [generatedPin, setGeneratedPin] = useState(() =>
    Math.floor(10000 + Math.random() * 90000).toString(),
  )
  const [createdSuccessPin, setCreatedSuccessPin] = useState<{
    name: string
    email: string
    pin: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: emptyValues,
  })

  const watchedName = watch('name')
  const watchedAvatarUrl = watch('avatarUrl')

  useEffect(() => {
    if (!open) {
      setCreatedSuccessPin(null)
      setCopied(false)
      return
    }
    if (member) {
      reset({
        name: member.name,
        role: member.role || 'Member',
        email: member.email,
        avatarUrl: member.avatarUrl || '',
      })
    } else {
      reset(emptyValues)
      setGeneratedPin(Math.floor(10000 + Math.random() * 90000).toString())
      setCreatedSuccessPin(null)
      setCopied(false)
    }
  }, [open, member, reset])

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCropFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropped = async (processed: ProcessedAvatar) => {
    setCropFile(null)
    try {
      setAvatarUploading(true)
      const avatarUrl = await uploadAvatarBlob(processed, member?.id)
      setValue('avatarUrl', avatarUrl, { shouldDirty: true, shouldValidate: true })
      toast.success(t('team.photoUploaded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTitle'))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setValue('avatarUrl', '', { shouldDirty: true, shouldValidate: true })
  }

  const initials = (watchedName || member?.name || 'M')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopied(true)
    toast.success(t('team.pinCopied', 'PIN copied to clipboard'))
    setTimeout(() => setCopied(false), 2500)
  }

  const onSubmit = handleSubmit(async (raw) => {
    const values = memberSchema.parse(raw)
    try {
      if (member && member.id !== 'current-user') {
        const renamedFrom = values.name !== member.name ? member.name : null
        await update.mutateAsync({
          id: member.id,
          patch: values,
          reassign: renamedFrom ? { from: renamedFrom, to: values.name } : undefined,
        })
        toast.success(
          renamedFrom
            ? t('team.savedRenamed', { from: renamedFrom, to: values.name })
            : t('team.saved'),
        )
        onClose()
      } else {
        await create.mutateAsync({ ...values, workspace: member?.workspace || 'wonderlearn' })
        setCreatedSuccessPin({
          name: values.name,
          email: values.email,
          pin: generatedPin,
        })
        toast.success(`Team member added! PIN: ${generatedPin}`, { duration: 6000 })
      }
    } catch {
      toast.error(t('common.errorTitle'))
    }
  })

  const err = (key: keyof MemberFormValues) => {
    const message = errors[key]?.message
    return message ? t(message) : undefined
  }

  const currentRole = member?.role
  const roleOptions =
    currentRole && !(TEAM_ROLES as readonly string[]).includes(currentRole)
      ? [currentRole, ...TEAM_ROLES]
      : TEAM_ROLES

  // If a member was just created, show the PIN notification modal
  if (createdSuccessPin) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setCreatedSuccessPin(null)
            onClose()
          }
        }}
      >
        <DialogContent className="max-w-md text-center sm:text-start">
          <DialogHeader>
            <div className="mx-auto sm:mx-0 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-lg">
              {t('team.memberCreatedTitle', 'Team Member Added')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('team.memberCreatedSubtitle', { name: createdSuccessPin.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" />
                  {t('team.generatedPin', 'Generated Login PIN')}
                </span>
                <span className="text-[11px] text-muted-foreground">{createdSuccessPin.email}</span>
              </div>

              {/* Big PIN Display */}
              <div className="flex items-center justify-center gap-2 py-1">
                {createdSuccessPin.pin.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-background font-mono text-xl font-bold text-primary shadow-sm"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPin(createdSuccessPin.pin)}
                  className="gap-2 text-xs font-semibold"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? t('common.copied', 'Copied!') : t('team.copyPin', 'Copy PIN')}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t('team.sharePinInstruction', { name: createdSuccessPin.name })}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setCreatedSuccessPin(null)
                onClose()
              }}
            >
              {t('team.done', 'Done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pe-10">
          <DialogTitle>{isEdit ? t('team.editTitle') : t('team.createTitle')}</DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? member?.name : t('team.createSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Profile Picture Upload Section */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <Avatar className="size-14 shrink-0 rounded-2xl border border-white/[0.1] bg-[#161B22]">
              {watchedAvatarUrl ? (
                <AvatarImage
                  src={watchedAvatarUrl}
                  alt={watchedName}
                  className="rounded-2xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-primary/10 text-base font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium text-white">{t('team.photoLabel')}</p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarUploading || isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 rounded-lg border-white/[0.1] bg-white/[0.04] text-xs font-medium text-neutral-200 hover:bg-white/[0.08] hover:text-white"
                >
                  {avatarUploading ? (
                    <Loader2 className="me-1.5 size-3 animate-spin" />
                  ) : (
                    <Camera className="me-1.5 size-3" />
                  )}
                  {watchedAvatarUrl ? t('team.changePhoto') : t('team.uploadPhoto')}
                </Button>
                {watchedAvatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="h-7 rounded-lg px-2 text-xs text-neutral-400 hover:bg-red-500/10 hover:text-red-400"
                    title={t('team.removePhoto')}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <FormRow label={t('team.nameLabel')} error={err('name')} htmlFor="member-name">
            <Input
              id="member-name"
              {...register('name')}
              placeholder={t('team.namePlaceholder')}
              aria-invalid={Boolean(errors.name)}
              autoFocus
            />
          </FormRow>

          <FormRow label={t('team.roleLabel')} error={err('role')}>
            <Controller
              control={control}
              name="role"
              render={({ field }) => {
                const currentVal = field.value || 'Member'
                const roleInfo = ROLE_DESCRIPTIONS[currentVal]
                const CurrentRoleIcon = getRoleIcon(currentVal)

                return (
                  <div className="space-y-1.5">
                    <Select value={currentVal} onValueChange={field.onChange}>
                      <SelectTrigger id="member-role" aria-invalid={Boolean(errors.role)}>
                        <SelectValue placeholder={t('team.rolePlaceholder')}>
                          <div className="flex items-center gap-2 text-start">
                            <CurrentRoleIcon className="size-3.5 shrink-0 text-primary" />
                            <span className="truncate">{currentVal}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => {
                          const desc = ROLE_DESCRIPTIONS[role]?.description
                          const RoleIcon = getRoleIcon(role)
                          return (
                            <SelectItem key={role} value={role} className="py-2.5">
                              <div className="flex items-start gap-2.5 text-start">
                                <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-primary">
                                  <RoleIcon className="size-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-xs text-foreground">
                                    {role}
                                  </span>
                                  {desc && (
                                    <span className="text-[10px] text-muted-foreground leading-snug">
                                      {desc}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {roleInfo && (
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        {roleInfo.description}
                      </p>
                    )}
                  </div>
                )
              }}
            />
          </FormRow>

          <FormRow label={t('team.emailLabel')} error={err('email')} htmlFor="member-email">
            <Input
              id="member-email"
              type="email"
              {...register('email')}
              placeholder={t('team.emailPlaceholder')}
              aria-invalid={Boolean(errors.email)}
            />
          </FormRow>

          {/* Generated PIN Preview for new members */}
          {!isEdit && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {t('team.generatedPin', 'Generated Login PIN')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setGeneratedPin(Math.floor(10000 + Math.random() * 90000).toString())
                  }
                  className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="size-2.5" />
                  {t('team.regeneratePin', 'Regenerate')}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 font-mono text-sm font-bold tracking-widest text-primary bg-background px-2.5 py-1 rounded-lg border border-border">
                  {generatedPin.split('').map((digit, i) => (
                    <span
                      key={i}
                      className="size-5 grid place-items-center bg-primary/10 rounded text-xs"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground flex-1 leading-tight">
                  {t(
                    'team.generatedPinHint',
                    'A 5-digit PIN generated for this member to sign in.',
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              {t('editor.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? t('editor.save') : t('team.addMember')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AvatarCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={handleCropped}
      />
    </Dialog>
  )
}
