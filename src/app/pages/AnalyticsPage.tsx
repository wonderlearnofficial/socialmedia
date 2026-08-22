import { useMemo, useState } from 'react'
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
import { BrandMark } from '@/components/shared/Brand'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePostsQuery } from '@/hooks/usePosts'
import { CONTENT_TYPE_META, PLATFORM_META, STATUS_META } from '@/lib/constants'
import { formatMonthTitle, toMonthKey } from '@/lib/dates'
import { countByStatus, postsForMonth } from '@/lib/filtering'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import { CONTENT_TYPES, POST_STATUSES, SOCIAL_PLATFORMS, type SocialPlatform } from '@/types'

export function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all')

  // Dedicated specifically to WonderLearn Social Media
  const { data: posts = [] } = usePostsQuery('wonderlearn')
  const dateISO = useAppSelector((s) => s.view.dateISO)
  const date = useMemo(() => new Date(dateISO), [dateISO])
  const allMonthPosts = useMemo(() => postsForMonth(posts, toMonthKey(date)), [posts, date])

  // Filter posts based on selected platform filter
  const monthPosts = useMemo(() => {
    if (selectedPlatform === 'all') return allMonthPosts
    return allMonthPosts.filter((p) => p.platforms.includes(selectedPlatform))
  }, [allMonthPosts, selectedPlatform])

  const counts = countByStatus(monthPosts)
  // "Done designing" — everything past review, whether or not it's published yet.
  const completionRate = monthPosts.length
    ? Math.round(((counts.waiting_to_post + counts.posted) / monthPosts.length) * 100)
    : 0

  const byPlatform = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    name: PLATFORM_META[platform].label,
    value: allMonthPosts.filter((p) => p.platforms.includes(platform)).length,
  }))

  // Slice colours come from the status palette so the chart agrees with the badges
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
        {/* Page Header */}
        <PageHeader
          title={t('analytics.title', 'Analytics')}
          subtitle={`WonderLearn Social Media — ${formatMonthTitle(date, i18n.language)}`}
        />

        {/* Active WonderLearn Social Media Channel Banner & Filter */}
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Active Channel Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/40">
                  {selectedPlatform !== 'all' ? (
                    <PlatformIcon platform={selectedPlatform} brand className="size-5" />
                  ) : (
                    <BrandMark className="size-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">WonderLearn</span>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] font-semibold text-primary"
                    >
                      Social Media
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPlatform === 'all'
                      ? t('analytics.allPlatforms', 'All Channels')
                      : `${PLATFORM_META[selectedPlatform].label} Channel`}
                    {' • '}
                    <span className="font-semibold text-foreground">{monthPosts.length} posts</span>
                  </p>
                </div>
              </div>

              {/* Social Media Channel Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('all')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                    selectedPlatform === 'all'
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span>{t('analytics.allPlatforms', 'All Channels')}</span>
                  <span className="text-[10px] opacity-80">({allMonthPosts.length})</span>
                </button>

                {SOCIAL_PLATFORMS.map((platform) => {
                  const count = allMonthPosts.filter((p) => p.platforms.includes(platform)).length
                  const isSelected = selectedPlatform === platform
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setSelectedPlatform(platform)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <PlatformIcon platform={platform} brand className="size-3.5" />
                      <span>{PLATFORM_META[platform].label}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t('analytics.totalPosts')} value={monthPosts.length} />
          <Stat label={t('analytics.awaiting')} value={counts.review} />
          <Stat label={t('analytics.completionRate')} value={`${completionRate}%`} />
          <Stat label={t('analytics.needsChanges')} value={counts.changes_required} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Posts by Platform */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.byPlatform')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {byPlatform.map((row) => {
                const pct = allMonthPosts.length ? (row.value / allMonthPosts.length) * 100 : 0
                const isCurrent = selectedPlatform === row.platform
                return (
                  <button
                    key={row.platform}
                    type="button"
                    onClick={() => setSelectedPlatform(isCurrent ? 'all' : row.platform)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-1 text-start transition-colors',
                      isCurrent && 'bg-primary/10',
                    )}
                  >
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
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.byStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              {byStatus.length > 0 ? (
                <>
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
                      <span
                        key={entry.name}
                        className="inline-flex items-center gap-1.5 text-[11px]"
                      >
                        <span className="size-2 rounded-full" style={{ background: entry.fill }} />
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                  No posts in this selection
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Mix */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('analytics.byType')}</CardTitle>
            </CardHeader>
            <CardContent>
              {byType.length > 0 ? (
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
              ) : (
                <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                  No content types in this selection
                </div>
              )}
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
