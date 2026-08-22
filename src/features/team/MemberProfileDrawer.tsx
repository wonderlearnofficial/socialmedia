import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Camera, Loader2, Mail, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { usePermissions } from '@/hooks/usePermissions'
import { useCreateTeamMember, useUpdateTeamMember } from '@/hooks/useTeamMembers'
import { uploadAvatarBlob, type ProcessedAvatar } from '@/lib/avatarImage'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types'
import { AvatarCropDialog } from './AvatarCropDialog'
import { getRoleIcon } from './roleDescriptions'
import { useTeamActivity } from './useTeamActivity'

interface MemberProfileDrawerProps {
  open: boolean
  member: TeamMember | null
  onClose: () => void
  onEdit: (member: TeamMember) => void
  onDelete?: (member: TeamMember) => void
}

/**
 * Clean & Minimal Team Member Profile Drawer:
 * Shows avatar, name, role, last active, workspace, and clean action buttons.
 */
export function MemberProfileDrawer({
  open,
  member,
  onClose,
  onEdit,
  onDelete,
}: MemberProfileDrawerProps) {
  const { t } = useTranslation()
  const { canManageTeam } = usePermissions()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const create = useCreateTeamMember()
  const update = useUpdateTeamMember()
  const { getMemberStatus } = useTeamActivity()

  if (!member) return null

  const status = getMemberStatus(member)
  const RoleIcon = getRoleIcon(member.role)

  const handleCropped = async (processed: ProcessedAvatar) => {
    setCropFile(null)
    setUploading(true)
    try {
      const avatarUrl = await uploadAvatarBlob(processed, member.id)
      if (member.id === 'current-user') {
        await create.mutateAsync({
          name: member.name,
          role: member.role,
          email: member.email,
          avatarUrl,
          workspace: member.workspace || 'wonderlearn',
        })
      } else {
        await update.mutateAsync({ id: member.id, patch: { avatarUrl } })
      }
      toast.success(t('team.avatarUpdated', 'Photo updated successfully'))
    } catch {
      toast.error(t('common.errorTitle', 'Failed to upload image'))
    } finally {
      setUploading(false)
    }
  }

  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        className="flex w-full flex-col border-s border-border bg-card p-0 text-card-foreground sm:max-w-md"
        aria-describedby={undefined}
      >
        {/* Profile Header */}
        <div className="border-b border-border bg-muted/30 p-6 text-start">
          <div className="flex items-start gap-4">
            {/* The avatar is the control: click it to replace the photo if authorized. */}
            <button
              type="button"
              onClick={() => canManageTeam && fileInputRef.current?.click()}
              disabled={uploading || !canManageTeam}
              aria-label={member.avatarUrl ? t('team.changePhoto') : t('team.uploadPhoto')}
              title={
                canManageTeam
                  ? member.avatarUrl
                    ? t('team.changePhoto')
                    : t('team.uploadPhoto')
                  : undefined
              }
              className={cn(
                'group relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                canManageTeam ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <Avatar className="size-12 rounded-xl border border-border bg-muted">
                {member.avatarUrl && (
                  <AvatarImage
                    src={member.avatarUrl}
                    alt={member.name}
                    className="rounded-xl object-cover"
                  />
                )}
                <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {canManageTeam && (
                <span
                  className={cn(
                    'absolute inset-0 grid place-items-center rounded-xl bg-black/60 text-white transition-opacity',
                    uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setCropFile(file)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            />

            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-bold text-foreground">
                {member.name}
              </SheetTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RoleIcon className="size-3 text-primary shrink-0" />
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {member.role || 'Member'}
                </p>
              </div>

              {/* Status Line */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    status.isOnline ? 'bg-emerald-400' : 'bg-neutral-400 dark:bg-neutral-600',
                  )}
                />
                <span
                  className={
                    status.isOnline
                      ? 'text-emerald-500 dark:text-emerald-400 font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Email Address Link */}
          {member.email && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${member.email}`}
                className="truncate transition-colors hover:text-primary hover:underline"
              >
                {member.email}
              </a>
            </div>
          )}
        </div>

        {/* Basic Information Details */}
        <div className="flex-1 space-y-5 p-6">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('team.columnRole')}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="grid size-6 shrink-0 place-items-center rounded-md border border-border bg-accent/40 text-primary">
                <RoleIcon className="size-3.5" />
              </div>
              <p className="text-sm font-medium text-foreground">{member.role || 'Member'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('team.workspace')}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t(`team.workspaceName.${member.workspace}`)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('team.lastActive')}
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  status.isOnline ? 'bg-emerald-400' : 'bg-neutral-400 dark:bg-neutral-600',
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  status.isOnline ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground',
                )}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        {canManageTeam && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border bg-muted/30 p-4">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(member)}
                className="rounded-xl text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="me-1.5 size-3.5" />
                {t('team.delete')}
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => onEdit(member)}
              className="gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Pencil className="size-3.5" />
              {t('team.edit')}
            </Button>
          </div>
        )}
      </SheetContent>

      <AvatarCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={handleCropped}
      />
    </Sheet>
  )
}
