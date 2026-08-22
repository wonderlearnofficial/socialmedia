import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { MemberProfileDrawer } from '@/features/team/MemberProfileDrawer'
import { getRoleIcon } from '@/features/team/roleDescriptions'
import { TeamMemberEditor } from '@/features/team/TeamMemberEditor'
import { useTeamActivity } from '@/features/team/useTeamActivity'
import { usePermissions } from '@/hooks/usePermissions'
import { useDeleteTeamMember, useTeamMembers } from '@/hooks/useTeamMembers'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types'

export function TeamPage() {
  const { t, i18n } = useTranslation()
  const { data: team = [], isLoading, isError, refetch } = useTeamMembers()
  const remove = useDeleteTeamMember()
  const { getMemberStatus } = useTeamActivity()
  const { canManageTeam } = usePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [profileMember, setProfileMember] = useState<TeamMember | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TeamMember | null>(null)

  const openAdd = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = (member: TeamMember) => {
    setEditing(member)
    setEditorOpen(true)
  }

  const openProfile = (member: TeamMember) => {
    setProfileMember(member)
  }

  const openDelete = (member: TeamMember) => {
    setPendingDelete(member)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await remove.mutateAsync(pendingDelete.id)
      toast.success(t('team.deleted', 'Team member removed'))
      if (profileMember?.id === pendingDelete.id) {
        setProfileMember(null)
      }
    } catch {
      toast.error(t('common.errorTitle', 'Something went wrong'))
    } finally {
      setPendingDelete(null)
    }
  }

  // Filter team members by search query
  const filteredTeam = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return team
    return team.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q),
    )
  }, [team, searchQuery])

  const activeCount = useMemo(() => {
    return team.filter((m) => getMemberStatus(m).isOnline).length
  }, [team, getMemberStatus])

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page Header */}
        <PageHeader
          title={t('team.title', 'Team')}
          subtitle={t('team.subtitle', 'Everyone working on this workspace')}
          actions={
            canManageTeam ? (
              <Button
                onClick={openAdd}
                size="sm"
                className="gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              >
                <Plus className="size-4" />
                <span>{t('team.addMember', 'Add member')}</span>
              </Button>
            ) : undefined
          }
        />

        {/* Search & Team Summary Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('team.searchPlaceholder', 'Search team members…')}
              className="h-9 rounded-xl border-white/[0.08] bg-[#101317] ps-9 text-xs text-white placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-neutral-300">
              {team.length}{' '}
              {team.length === 1
                ? t('team.memberSingular', 'member')
                : t('team.memberPlural', 'members')}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              {activeCount} {t('team.activeNow', 'active now')}
            </span>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0E1115] p-1">
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex h-16 animate-pulse items-center justify-between rounded-xl bg-white/[0.02] px-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-white/[0.06]" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-white/[0.06]" />
                      <div className="h-2.5 w-44 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                  <div className="h-3 w-24 rounded bg-white/[0.06]" />
                  <div className="h-3 w-16 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0E1115] py-16 text-center">
            <p className="text-sm font-medium text-neutral-300">
              {t('team.loadError', "Couldn't load team members.")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 rounded-lg border-white/[0.1] text-xs"
            >
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : team.length === 0 ? (
          /* Empty Team State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0E1115]/50 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.02] text-muted-foreground">
              <Users className="size-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              {t('team.emptyTitle', 'No team members yet')}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {t(
                'team.emptyBody',
                'Add the people working on this workspace to assign posts and manage roles.',
              )}
            </p>
            {canManageTeam && (
              <Button
                onClick={openAdd}
                size="sm"
                className="mt-5 gap-2 rounded-xl bg-primary font-medium text-primary-foreground shadow-xs"
              >
                <UserPlus className="size-4" />
                <span>{t('team.addMember', 'Add member')}</span>
              </Button>
            )}
          </div>
        ) : filteredTeam.length === 0 ? (
          /* Search Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0E1115] py-14 text-center">
            <Search className="size-6 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-white">
              {t('team.noSearchResults', 'No members match your search')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('team.noSearchResultsDesc', 'Try searching by a different name, email, or role.')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-primary hover:text-primary/90"
            >
              {t('common.clearSearch', 'Clear search')}
            </Button>
          </div>
        ) : (
          /* Team Table / List */
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            {/* Desktop Table Header */}
            <div className="hidden grid-cols-12 items-center border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
              <div className="col-span-5">{t('team.columnMember', 'Member')}</div>
              <div className="col-span-4">{t('team.columnRole', 'Role')}</div>
              <div className="col-span-2">{t('team.columnStatus', 'Status')}</div>
              <div className="col-span-1 text-end">{t('team.columnActions', 'Actions')}</div>
            </div>

            {/* Member Rows */}
            <div className="divide-y divide-border">
              {filteredTeam.map((member) => {
                const initials = member.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()

                const status = getMemberStatus(member)
                const RoleIcon = getRoleIcon(member.role)

                return (
                  <div
                    key={member.id}
                    onClick={() => openProfile(member)}
                    className="group relative flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-accent/40 sm:grid sm:h-[68px] sm:grid-cols-12 sm:items-center sm:gap-0 sm:px-5 sm:py-0"
                  >
                    {/* Member Column */}
                    <div className="flex min-w-0 items-center gap-3.5 sm:col-span-5">
                      <Avatar className="size-9 shrink-0 rounded-xl border border-border bg-muted">
                        {member.avatarUrl && (
                          <AvatarImage
                            src={member.avatarUrl}
                            alt={member.name}
                            className="rounded-xl object-cover"
                          />
                        )}
                        <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors sm:text-sm">
                          {member.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    {/* Role Column */}
                    <div className="flex items-center justify-between sm:col-span-4 sm:justify-start">
                      <span className="text-[11px] text-muted-foreground sm:hidden">
                        {t('team.columnRole', 'Role')}:
                      </span>
                      <div className="inline-flex min-w-0 items-center gap-2">
                        <div className="grid size-6 shrink-0 place-items-center rounded-lg border border-border bg-accent/40 text-primary">
                          <RoleIcon className="size-3.5" />
                        </div>
                        <span className="truncate text-xs font-medium text-foreground">
                          {member.role || 'Member'}
                        </span>
                      </div>
                    </div>

                    {/* Status / Activity Column */}
                    <div className="flex items-center justify-between sm:col-span-2 sm:justify-start">
                      <span className="text-[11px] text-muted-foreground sm:hidden">
                        {t('team.columnStatus', 'Status')}:
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs',
                          status.isOnline
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            status.isOnline
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                              : 'bg-neutral-400 dark:bg-neutral-600',
                          )}
                        />
                        <span className="truncate">{status.label}</span>
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div
                      className="flex items-center justify-end sm:col-span-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label={t('team.moreActions', 'More actions')}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl"
                        >
                          <DropdownMenuItem
                            onClick={() => openProfile(member)}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <User className="size-3.5" />
                            <span>{t('team.viewProfile', 'View profile')}</span>
                          </DropdownMenuItem>
                          {canManageTeam && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openEdit(member)}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                <Pencil className="size-3.5" />
                                <span>{t('team.edit', 'Edit member')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-border" />
                              <DropdownMenuItem
                                onClick={() => openDelete(member)}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                              >
                                <Trash2 className="size-3.5" />
                                <span>{t('team.delete', 'Remove member')}</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Member Details Drawer */}
      <MemberProfileDrawer
        open={Boolean(profileMember)}
        member={profileMember}
        onClose={() => setProfileMember(null)}
        onEdit={(m) => {
          setProfileMember(null)
          openEdit(m)
        }}
        onDelete={(m) => {
          setProfileMember(null)
          openDelete(m)
        }}
      />

      {/* Add / Edit Member Modal */}
      <TeamMemberEditor open={editorOpen} member={editing} onClose={() => setEditorOpen(false)} />

      {/* Remove Member Confirmation Dialog */}
      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t('team.deleteConfirmTitle', 'Remove {{name}} from the team?', {
                name: pendingDelete?.name,
              })}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {t(
                'team.deleteConfirmBodyDesc',
                'This will remove their team access. Historical posts, comments, and file records will remain associated with their name.',
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              className="rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {t('editor.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              {t('team.delete', 'Remove member')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
