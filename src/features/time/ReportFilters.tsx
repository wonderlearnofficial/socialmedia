import { useTranslation } from 'react-i18next'
import { FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WORK_ITEM_STATUSES, type Company, type Project } from '@/types'
import { DATE_PRESETS, presetRange, type DatePreset, type ReportFilters } from './reports'
import { SelectOrCreate } from './SelectOrCreate'
import type { WorkItemView } from './useTimeData'

const ANY = '__any__'

interface ReportFiltersBarProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  preset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  users: string[]
  companies: Company[]
  projects: Project[]
  workItems: WorkItemView[]
}

export function ReportFiltersBar({
  filters,
  onChange,
  preset,
  onPresetChange,
  users,
  companies,
  projects,
  workItems,
}: ReportFiltersBarProps) {
  const { t } = useTranslation()

  const set = (patch: Partial<ReportFilters>) => onChange({ ...filters, ...patch })

  const handlePreset = (next: DatePreset) => {
    onPresetChange(next)
    if (next !== 'custom') set({ range: presetRange(next) })
  }

  // Narrowing to a company should narrow the project list with it, otherwise
  // the two filters can be set to a combination that matches nothing.
  const visibleProjects = filters.companyId
    ? projects.filter((p) => p.companyId === filters.companyId)
    : projects

  const visibleWorkItems = workItems.filter((w) => {
    if (filters.companyId && w.company?.id !== filters.companyId) return false
    if (filters.projectId && w.project?.id !== filters.projectId) return false
    return true
  })

  const clear = () => {
    onPresetChange('all')
    onChange({
      range: { from: '', to: '' },
      userName: null,
      companyId: null,
      projectId: null,
      workItemId: null,
      status: null,
    })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="filter-date">{t('time.dateRange')}</Label>
        <Select value={preset} onValueChange={(v) => handlePreset(v as DatePreset)}>
          <SelectTrigger id="filter-date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`time.preset.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === 'custom' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="filter-from">{t('time.from')}</Label>
            <Input
              id="filter-from"
              type="date"
              value={filters.range.from}
              onChange={(e) => set({ range: { ...filters.range, from: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to">{t('time.to')}</Label>
            <Input
              id="filter-to"
              type="date"
              value={filters.range.to}
              onChange={(e) => set({ range: { ...filters.range, to: e.target.value } })}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="filter-user">{t('time.user')}</Label>
        <Select
          value={filters.userName ?? ANY}
          onValueChange={(v) => set({ userName: v === ANY ? null : v })}
        >
          <SelectTrigger id="filter-user">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('time.allUsers')}</SelectItem>
            {users.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-company">{t('time.company')}</Label>
        <Select
          value={filters.companyId ?? ANY}
          onValueChange={(v) =>
            set({ companyId: v === ANY ? null : v, projectId: null, workItemId: null })
          }
        >
          <SelectTrigger id="filter-company">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('time.allCompanies')}</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-project">{t('time.project')}</Label>
        <Select
          value={filters.projectId ?? ANY}
          onValueChange={(v) => set({ projectId: v === ANY ? null : v, workItemId: null })}
        >
          <SelectTrigger id="filter-project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('time.allProjects')}</SelectItem>
            {visibleProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-work-item">{t('time.workItem')}</Label>
        {/* Selection only here — a report filter is no place to create work. */}
        <SelectOrCreate
          id="filter-work-item"
          value={filters.workItemId}
          options={visibleWorkItems.map((w) => ({
            id: w.item.id,
            label: w.item.name,
            hint: w.path,
          }))}
          onSelect={(id) => set({ workItemId: id })}
          placeholder={t('time.allWorkItems')}
          allowClear
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-status">{t('time.status')}</Label>
        <Select
          value={filters.status ?? ANY}
          onValueChange={(v) => set({ status: v === ANY ? null : v })}
        >
          <SelectTrigger id="filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('time.allStatuses')}</SelectItem>
            {WORK_ITEM_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`time.workItemStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button variant="outline" size="sm" onClick={clear}>
          <FilterX />
          {t('time.clearFilters')}
        </Button>
      </div>
    </div>
  )
}
