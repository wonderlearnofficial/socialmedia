import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCompanies,
  useCreateCompany,
  useCreateProject,
  useCreateWorkItem,
  useProjects,
  useWorkItems,
} from '@/hooks/useTimeTracker'
import type { WorkItem } from '@/types'
import { NameSuggestInput, type NameSuggestion } from './NameSuggestInput'
import { SelectOrCreate } from './SelectOrCreate'

interface CreateWorkItemDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (item: WorkItem) => void
  createdBy: string
  /** Prefilled from whatever was typed into the search that found nothing. */
  defaultName?: string
}

/**
 * Everything needed to start tracking, in one dialog: the work item, and the
 * project and company it belongs to — each of which can be picked or created
 * inline. Nobody has to go set up a company somewhere else first.
 */
export function CreateWorkItemDialog({
  open,
  onClose,
  onCreated,
  createdBy,
  defaultName = '',
}: CreateWorkItemDialogProps) {
  const { t } = useTranslation()
  const { data: companies = [] } = useCompanies()
  const { data: projects = [] } = useProjects()
  const { data: workItems = [] } = useWorkItems()

  const createCompany = useCreateCompany()
  const createProject = useCreateProject()
  const createWorkItem = useCreateWorkItem()

  const [name, setName] = useState(defaultName)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(defaultName)
    setCompanyId(null)
    setProjectId(null)
    setDescription('')
  }, [open, defaultName])

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])

  // "Existing company — 4 projects" beats a bare name: it's the signal that
  // stops someone creating a second Jisraa.
  const companyOptions = useMemo(
    () =>
      companies.map((c) => {
        const count = projects.filter((p) => p.companyId === c.id).length
        return { id: c.id, label: c.name, hint: t('time.projectCount', { count }) }
      }),
    [companies, projects, t],
  )

  // Projects aren't gated behind picking a company — choosing one fills the
  // company in for you. Narrowed once a company is chosen.
  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => !companyId || p.companyId === companyId)
        .map((p) => {
          const count = workItems.filter((w) => w.projectId === p.id).length
          return {
            id: p.id,
            label: p.name,
            hint: `${companyById.get(p.companyId)?.name ?? '—'} · ${t('time.workItemCount', {
              count,
            })}`,
          }
        }),
    [projects, companyId, companyById, workItems, t],
  )

  // Names already in use anywhere, so a recurring piece of work ("Flyer",
  // "Instagram Post") gets typed the same way every time instead of spawning
  // a near-duplicate that differs by a typo.
  const nameSuggestions = useMemo<NameSuggestion[]>(() => {
    const seen = new Map<string, NameSuggestion>()
    for (const item of workItems) {
      const key = item.name.toLowerCase()
      if (seen.has(key)) continue
      const project = projects.find((p) => p.id === item.projectId)
      const company = project ? companies.find((c) => c.id === project.companyId) : undefined
      seen.set(key, {
        name: item.name,
        hint: [company?.name, project?.name].filter(Boolean).join(' · '),
      })
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [workItems, projects, companies])

  const handleCreateCompany = async (name: string, color: string) => {
    try {
      const company = await createCompany.mutateAsync({ name, color, createdBy })
      setCompanyId(company.id)
      return company.id
    } catch {
      toast.error(t('time.companyExists'))
      return null
    }
  }

  // No colour argument: a project's colour is derived from its company's hue,
  // so offering a free choice here would only let someone break the family.
  const handleCreateProject = async (name: string) => {
    // A project needs a company; fall back to the one already selected, or the
    // only one that exists, rather than dead-ending.
    const targetCompanyId = companyId ?? companies[0]?.id
    if (!targetCompanyId) {
      toast.error(t('time.pickCompanyFirst'))
      return null
    }
    try {
      const project = await createProject.mutateAsync({
        companyId: targetCompanyId,
        name,
        color: null,
        createdBy,
      })
      setCompanyId(targetCompanyId)
      return project.id
    } catch {
      toast.error(t('time.projectExists'))
      return null
    }
  }

  const handleSelectProject = (id: string | null) => {
    setProjectId(id)
    if (!id) return
    const project = projects.find((p) => p.id === id)
    if (project) setCompanyId(project.companyId)
  }

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || !projectId) return

    // One work item per name per project — that's what keeps everyone's hours
    // on a piece of work landing on the same row. If it already exists, use it
    // rather than making a second one.
    const existing = workItems.find(
      (w) => w.projectId === projectId && w.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) {
      toast.success(t('time.usingExistingWorkItem', { code: existing.code }))
      onCreated(existing)
      return
    }

    setPending(true)
    try {
      const item = await createWorkItem.mutateAsync({
        projectId,
        name: trimmed,
        description: description.trim(),
        status: 'in_progress',
        fileId: null,
        postId: null,
        createdBy,
      })
      toast.success(t('time.workItemCreated', { code: item.code }))
      onCreated(item)
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('time.createWorkItemTitle')}</DialogTitle>
          <DialogDescription>{t('time.createWorkItemBody')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wi-name">{t('time.workItemName')}</Label>
            <NameSuggestInput
              id="wi-name"
              value={name}
              onChange={setName}
              suggestions={nameSuggestions}
              placeholder={t('time.workItemNamePlaceholder')}
              onSubmit={() => {
                if (name.trim() && projectId) void submit()
              }}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-project">{t('time.project')}</Label>
            <SelectOrCreate
              id="wi-project"
              value={projectId}
              options={projectOptions}
              onSelect={handleSelectProject}
              onCreate={handleCreateProject}
              placeholder={t('time.projectPlaceholder')}
              createLabel={(value) => t('time.createProjectNamed', { name: value })}
              emptyLabel={t('time.noProjects')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-company">{t('time.company')}</Label>
            <SelectOrCreate
              id="wi-company"
              value={companyId}
              options={companyOptions}
              onSelect={(next) => {
                setCompanyId(next)
                // A project from the old company would now be a mismatch.
                const project = projects.find((p) => p.id === projectId)
                if (project && project.companyId !== next) setProjectId(null)
              }}
              onCreate={handleCreateCompany}
              withColor
              placeholder={t('time.companyPlaceholder')}
              createLabel={(value) => t('time.createCompanyNamed', { name: value })}
              emptyLabel={t('time.noCompanies')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-description">{t('time.descriptionOptional')}</Label>
            <Textarea
              id="wi-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('time.workItemDescriptionPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim() || !projectId}>
            {pending && <Loader2 className="animate-spin" />}
            {t('time.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
