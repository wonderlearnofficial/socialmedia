import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Mail, MoreVertical, Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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
import { EmptyState } from '@/components/shared/EmptyState'
import { TeamMemberEditor } from '@/features/team/TeamMemberEditor'
import { usePostsQuery } from '@/hooks/usePosts'
import { useDeleteTeamMember, useTeamMembers } from '@/hooks/useTeamMembers'
import { toMonthKey } from '@/lib/dates'
import { postsForMonth } from '@/lib/filtering'
import { useAppSelector } from '@/store/hooks'
import type { TeamMember } from '@/types'

export function TeamPage() {
  const { t } = useTranslation()
  const { data: posts = [] } = usePostsQuery()
  const dateISO = useAppSelector((s) => s.view.dateISO)
  const { data: team = [] } = useTeamMembers()
  const monthPosts = postsForMonth(posts, toMonthKey(new Date(dateISO)))

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TeamMember | null>(null)
  const remove = useDeleteTeamMember()

  const openAdd = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = (member: TeamMember) => {
    setEditing(member)
    setEditorOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await remove.mutateAsync(pendingDelete.id)
      toast.success(t('team.deleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPendingDelete(null)
    }
  }

  // Posts keep an assignee's name even after they leave the roster, so say so
  // before a delete that would leave this month's assignments pointing nowhere.
  const pendingDeleteAssigned = pendingDelete
    ? monthPosts.filter((p) => p.assignee === pendingDelete.name).length
    : 0

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title={t('team.title')}
          subtitle={t('team.subtitle')}
          actions={
            <Button size="sm" onClick={openAdd}>
              <UserPlus />
              {t('team.addMember')}
            </Button>
          }
        />

        {team.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('team.emptyTitle')}
            body={t('team.emptyBody')}
            action={
              <Button size="sm" onClick={openAdd}>
                <UserPlus />
                {t('team.addMember')}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {team.map((member) => {
              const assigned = monthPosts.filter((p) => p.assignee === member.name).length
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Avatar>
                      <AvatarFallback>
                        {member.name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                        <Mail className="size-3 shrink-0" />
                        {member.email}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {t('team.assigned', { count: assigned })}
                        </span>
                      </div>
                    </div>
                    <MemberMenu
                      onEdit={() => openEdit(member)}
                      onDelete={() => setPendingDelete(member)}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <TeamMemberEditor open={editorOpen} member={editing} onClose={() => setEditorOpen(false)} />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('team.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('team.deleteConfirmBody', { name: pendingDelete?.name })}
            {pendingDeleteAssigned > 0 &&
              ` ${t('team.deleteConfirmAssigned', { count: pendingDeleteAssigned })}`}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('editor.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={remove.isPending}>
              {t('team.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="-me-1 -mt-1 shrink-0"
          aria-label={t('team.moreActions')}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          {t('team.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive [&_svg]:text-destructive"
        >
          <Trash2 />
          {t('team.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
