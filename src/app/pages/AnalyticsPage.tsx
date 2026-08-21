import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { usePostsQuery } from '@/hooks/usePosts'
import { CONTENT_TYPE_META, PLATFORM_META, STATUS_META } from '@/lib/constants'
import { formatMonthTitle, toMonthKey } from '@/lib/dates'
import { countByStatus, postsForMonth } from '@/lib/filtering'
import { useAppSelector } from '@/store/hooks'
import { CONTENT_TYPES, POST_STATUSES, SOCIAL_PLATFORMS } from '@/types'

export function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { data: posts = [] } = usePostsQuery()
  const dateISO = useAppSelector((s) => s.view.dateISO)
  const date = useMemo(() => new Date(dateISO), [dateISO])
  const monthPosts = useMemo(() => postsForMonth(posts, toMonthKey(date)), [posts, date])

  const counts = countByStatus(monthPosts)
  // "Done designing" — everything past review, whether or not it's published yet.
  const completionRate = monthPosts.length
    ? Math.round(((counts.waiting_to_post + counts.posted) / monthPosts.length) * 100)
    : 0

  const byPlatform = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    name: PLATFORM_META[platform].label,
    value: monthPosts.filter((p) => p.platforms.includes(platform)).length,
  }))

  // Slice colours come from the status palette so the chart agrees with the
  // badges everywhere else in the app (green = waiting to post, rose = changes, …).
  const byStatus = POST_STATUSES.filter((s) => counts[s] > 0).map((status) => ({
    name: t(STATUS_META[status].labelKey),
    value: counts[status],
    fill: STATUS_META[status].chart,
  }))

  const byType = CONTENT_TYPES.map((type) => ({
    name: t(CONTENT_TYPE_META[type].labelKey),
    value: monthPosts.filter((p) => p.contentType === type).length,
  })).filter((d) => d.value > 0)

  const tooltipStyle = {
    background: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-popover-foreground)',
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          title={t('analytics.title')}
          subtitle={t('analytics.subtitle', { month: formatMonthTitle(date, i18n.language) })}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t('analytics.totalPosts')} value={monthPosts.length} />
          <Stat label={t('analytics.awaiting')} value={counts.review} />
          <Stat label={t('analytics.completionRate')} value={`${completionRate}%`} />
          <Stat label={t('analytics.needsChanges')} value={counts.changes_required} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.byPlatform')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {byPlatform.map((row) => {
                const pct = monthPosts.length ? (row.value / monthPosts.length) * 100 : 0
                return (
                  <div key={row.platform} className="flex items-center gap-3">
                    <PlatformIcon platform={row.platform} brand className="size-4" />
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{row.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-end text-xs font-medium tabular-nums">
                      {row.value}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.byStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {byStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {byStatus.map((entry) => (
                  <span key={entry.name} className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="size-2 rounded-full" style={{ background: entry.fill }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('analytics.byType')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byType} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-muted)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
