import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { TEAM } from '@/data/team'
import { usePostsQuery } from '@/hooks/usePosts'
import { toMonthKey } from '@/lib/dates'
import { postsForMonth } from '@/lib/filtering'
import { useAppSelector } from '@/store/hooks'

export function TeamPage() {
  const { t } = useTranslation()
  const { data: posts = [] } = usePostsQuery()
  const dateISO = useAppSelector((s) => s.view.dateISO)
  const monthPosts = postsForMonth(posts, toMonthKey(new Date(dateISO)))

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} />

        <div className="grid gap-3 sm:grid-cols-2">
          {TEAM.map((member) => {
            const assigned = monthPosts.filter((p) => p.assignee === member.name).length
            const isClient = member.focus.length === 0
            return (
              <Card key={member.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Avatar>
                    <AvatarFallback className={isClient ? 'bg-primary/15 text-primary' : ''}>
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
                      {isClient && (
                        <Badge variant="muted" className="shrink-0">
                          {t('team.client')}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                    <p className="mt-1.5 inline-flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      {member.email}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      {member.focus.length > 0 && (
                        <span className="flex items-center gap-1">
                          {member.focus.map((p) => (
                            <PlatformIcon key={p} platform={p} brand className="size-3.5" />
                          ))}
                        </span>
                      )}
                      {!isClient && (
                        <span className="text-[11px] text-muted-foreground">
                          {t('team.assigned', { count: assigned })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
