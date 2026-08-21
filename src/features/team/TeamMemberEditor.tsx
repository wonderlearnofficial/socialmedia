import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { FormRow } from '@/components/shared/FormRow'
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
import { useCreateTeamMember, useUpdateTeamMember } from '@/hooks/useTeamMembers'
import type { TeamMember } from '@/types'
import { memberSchema, type MemberFormValues } from './memberSchema'

interface TeamMemberEditorProps {
  open: boolean
  /** null/undefined = adding someone new. */
  member?: TeamMember | null
  onClose: () => void
}

const emptyValues: MemberFormValues = { name: '', role: '', email: '' }

export function TeamMemberEditor({ open, member, onClose }: TeamMemberEditorProps) {
  const { t } = useTranslation()
  const create = useCreateTeamMember()
  const update = useUpdateTeamMember()
  const isEdit = Boolean(member)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    reset(member ? { name: member.name, role: member.role, email: member.email } : emptyValues)
  }, [open, member, reset])

  const onSubmit = handleSubmit(async (raw) => {
    const values = memberSchema.parse(raw)
    try {
      if (member) {
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
      } else {
        await create.mutateAsync({ ...values, workspace: 'wonderlearn' })
        toast.success(t('team.created'))
      }
      onClose()
    } catch {
      toast.error(t('common.errorTitle'))
    }
  })

  const err = (key: keyof MemberFormValues) => {
    const message = errors[key]?.message
    return message ? t(message) : undefined
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

        <form onSubmit={onSubmit} className="space-y-5">
          <FormRow label={t('team.nameLabel')} error={err('name')} htmlFor="member-name">
            <Input
              id="member-name"
              {...register('name')}
              placeholder={t('team.namePlaceholder')}
              aria-invalid={Boolean(errors.name)}
              autoFocus
            />
          </FormRow>

          <FormRow label={t('team.roleLabel')} error={err('role')} htmlFor="member-role">
            <Input
              id="member-role"
              {...register('role')}
              placeholder={t('team.rolePlaceholder')}
              aria-invalid={Boolean(errors.role)}
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

          <DialogFooter>
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
    </Dialog>
  )
}
