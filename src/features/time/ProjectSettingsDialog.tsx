import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, FolderPlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
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
  useCompanies,
  useCreateCompany,
  useCreateProject,
  useDeleteCompany,
  useDeleteProject,
  useProjects,
  useUpdateCompany,
  useUpdateProject,
  useWorkItems,
} from '@/hooks/useTimeTracker'
import { formatHoursMinutes } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { Company, Project } from '@/types'
import { ColorPicker, SWATCHES } from './ColorPicker'
import type { Palette } from './colors'
import type { TimeEntryView } from './useTimeData'

interface ProjectSettingsDialogProps {
  open: boolean
  onClose: () => void
  palette: Palette
  /** Used to say how much tracked time a delete would take with it. */
  rows: TimeEntryView[]
  createdBy: string
}

type Pending =
  | { kind: 'company'; company: Company; seconds: number; projects: number }
  | { kind: 'project'; project: Project; seconds: number; workItems: number }

/**
 * Manage the companies and projects the tracker groups by — rename them,
 * recolour them, add new ones.
 *
 * Deleting is deliberately loud: a company cascades to its projects, their work
 * items and every time entry underneath, so the confirmation states exactly how
 * many hours would go with it.
 */
export function ProjectSettingsDialog({
  open,
  onClose,
  palette,
  rows,
  createdBy,
}: ProjectSettingsDialogProps) {
  const { t } = useTranslation()
  const { data: companies = [] } = useCompanies()
  const { data: projects = [] } = useProjects()
  const { data: workItems = [] } = useWorkItems()

  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const deleteCompany = useDeleteCompany()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [editing, setEditing] = useState<{ type: 'company' | 'project'; id: string } | null>(null)
  // Swatches are heavy — 13 dots per company and 6 per project turned the
  // dialog into a wall of colour. They now live behind the entity's own dot:
  // click it to recolour, and only one picker is open at a time.
  const [picking, setPicking] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  // Adding happens inline rather than in a nested dialog: a modal inside a
  // modal fights the parent's focus trap and closes it.
  const [creating, setCreating] = useState<
    { kind: 'company' } | { kind: 'project'; companyId: string } | null
  >(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(SWATCHES[0])
  const [pending, setPending] = useState<Pending | null>(null)

  /** Tracked seconds per project and per company, for the delete warnings. */
  const totals = useMemo(() => {
    const byProject = new Map<string, number>()
    const byCompany = new Map<string, number>()
    for (const { entry, work } of rows) {
      const seconds = entry.duration
      const p = work?.project?.id
      const c = work?.company?.id
      if (p) byProject.set(p, (byProject.get(p) ?? 0) + seconds)
      if (c) byCompany.set(c, (byCompany.get(c) ?? 0) + seconds)
    }
    return { byProject, byCompany }
  }, [rows])

  const startRename = (type: 'company' | 'project', id: string, current: string) => {
    setEditing({ type, id })
    setDraftName(current)
  }

  const commitRename = async () => {
    if (!editing) return
    const name = draftName.trim()
    if (!name) return setEditing(null)
    try {
      if (editing.type === 'company') {
        await updateCompany.mutateAsync({ id: editing.id, patch: { name } })
      } else {
        await updateProject.mutateAsync({ id: editing.id, patch: { name } })
      }
      toast.success(t('time.settingsSaved'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setEditing(null)
    }
  }

  const setColor = async (type: 'company' | 'project', id: string, color: string | null) => {
    try {
      if (type === 'company') await updateCompany.mutateAsync({ id, patch: { color } })
      else await updateProject.mutateAsync({ id, patch: { color } })
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const openCreate = (next: { kind: 'company' } | { kind: 'project'; companyId: string }) => {
    setCreating(next)
    setNewName('')
    setNewColor(SWATCHES[0])
  }

  const handleCreate = async () => {
    if (!creating) return
    const name = newName.trim()
    if (!name) return
    try {
      if (creating.kind === 'company') {
        await createCompany.mutateAsync({ name, color: newColor, createdBy })
      } else {
        await createProject.mutateAsync({
          companyId: creating.companyId,
          name,
          color: newColor,
          createdBy,
        })
      }
      setCreating(null)
      setNewName('')
    } catch {
      toast.error(creating.kind === 'company' ? t('time.companyExists') : t('time.projectExists'))
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    try {
      if (pending.kind === 'company') await deleteCompany.mutateAsync(pending.company.id)
      else await deleteProject.mutateAsync(pending.project.id)
      toast.success(t('time.deleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPending(null)
    }
  }

  const busy =
    updateCompany.isPending ||
    updateProject.isPending ||
    deleteCompany.isPending ||
    deleteProject.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b p-5">
            <DialogTitle>{t('time.projectSettings')}</DialogTitle>
            <DialogDescription>{t('time.projectSettingsBody')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {companies.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('time.noCompanies')}
              </p>
            )}

            {companies.map((company) => {
              const own = projects.filter((p) => p.companyId === company.id)
              const isEditing = editing?.type === 'company' && editing.id === company.id
              return (
                <section key={company.id} className="rounded-lg border">
                  <header className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
                    <button
                      type="button"
                      onClick={() => setPicking(picking === company.id ? null : company.id)}
                      aria-expanded={picking === company.id}
                      aria-label={t('time.companyColor', { name: company.name })}
                      title={t('time.changeColor')}
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-transparent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <span
                        className="size-3.5 rounded-full"
                        style={{ background: palette.company(company.id) }}
                      />
                    </button>
                    {isEditing ? (
                      <InlineName
                        value={draftName}
                        onChange={setDraftName}
                        onCommit={commitRename}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <span
                        className="truncate font-semibold"
                        style={{ color: palette.company(company.id) }}
                      >
                        {company.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatHoursMinutes(totals.byCompany.get(company.id) ?? 0)}
                    </span>

                    <div className="ms-auto flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startRename('company', company.id, company.name)}
                        aria-label={t('time.rename')}
                        title={t('time.rename')}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          setPending({
                            kind: 'company',
                            company,
                            seconds: totals.byCompany.get(company.id) ?? 0,
                            projects: own.length,
                          })
                        }
                        aria-label={t('time.delete')}
                        title={t('time.delete')}
                        className="text-destructive hover:text-destructive [&_svg]:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    {picking === company.id && (
                      <div className="w-full pt-1">
                        <ColorPicker
                          value={company.color}
                          fallback={palette.company(company.id)}
                          onChange={(color) => {
                            setColor('company', company.id, color)
                            setPicking(null)
                          }}
                          onClear={() => {
                            setColor('company', company.id, null)
                            setPicking(null)
                          }}
                          label={t('time.companyColor', { name: company.name })}
                        />
                      </div>
                    )}
                  </header>

                  <ul className="divide-y">
                    {own.map((project) => {
                      const editingThis = editing?.type === 'project' && editing.id === project.id
                      const items = workItems.filter((w) => w.projectId === project.id).length
                      return (
                        <li key={project.id} className="flex flex-wrap items-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => setPicking(picking === project.id ? null : project.id)}
                            aria-expanded={picking === project.id}
                            aria-label={t('time.projectColor', { name: project.name })}
                            title={t('time.changeColor')}
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-transparent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          >
                            <span
                              className="size-2.5 rounded-full"
                              style={{ background: palette.project(project.id) }}
                            />
                          </button>
                          {editingThis ? (
                            <InlineName
                              value={draftName}
                              onChange={setDraftName}
                              onCommit={commitRename}
                              onCancel={() => setEditing(null)}
                            />
                          ) : (
                            <span
                              className="truncate text-sm font-medium"
                              style={{ color: palette.project(project.id) }}
                            >
                              {project.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t('time.workItemCount', { count: items })} ·{' '}
                            {formatHoursMinutes(totals.byProject.get(project.id) ?? 0)}
                          </span>

                          <div className="ms-auto flex items-center gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => startRename('project', project.id, project.name)}
                              aria-label={t('time.rename')}
                              title={t('time.rename')}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() =>
                                setPending({
                                  kind: 'project',
                                  project,
                                  seconds: totals.byProject.get(project.id) ?? 0,
                                  workItems: items,
                                })
                              }
                              aria-label={t('time.delete')}
                              title={t('time.delete')}
                              className="text-destructive hover:text-destructive [&_svg]:text-destructive"
                            >
                              <Trash2 />
                            </Button>
                          </div>

                          {picking === project.id && (
                            <div className="w-full ps-8 pt-1">
                              {/* Only shades of the parent company's hue — the
                                  family rule is enforced by the control, not by
                                  asking people to remember it. */}
                              <ColorPicker
                                value={project.color}
                                fallback={palette.project(project.id)}
                                swatches={palette.shadesFor(company.id)}
                                onChange={(color) => {
                                  setColor('project', project.id, color)
                                  setPicking(null)
                                }}
                                onClear={() => {
                                  setColor('project', project.id, null)
                                  setPicking(null)
                                }}
                                label={t('time.projectColor', { name: project.name })}
                              />
                            </div>
                          )}
                        </li>
                      )
                    })}

                    <li className="p-2">
                      {creating?.kind === 'project' && creating.companyId === company.id ? (
                        <InlineCreate
                          name={newName}
                          color={newColor}
                          onName={setNewName}
                          onColor={setNewColor}
                          onSubmit={handleCreate}
                          onCancel={() => setCreating(null)}
                          placeholder={t('time.projectPlaceholder')}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openCreate({ kind: 'project', companyId: company.id })}
                        >
                          <FolderPlus />
                          {t('time.addProject')}
                        </Button>
                      )}
                    </li>
                  </ul>
                </section>
              )
            })}

            {creating?.kind === 'company' && (
              <div className="rounded-lg border p-3">
                <InlineCreate
                  name={newName}
                  color={newColor}
                  onName={setNewName}
                  onColor={setNewColor}
                  onSubmit={handleCreate}
                  onCancel={() => setCreating(null)}
                  placeholder={t('time.companyPlaceholder')}
                />
              </div>
            )}
          </div>

          <DialogFooter className="border-t p-4">
            <Button variant="outline" size="sm" onClick={() => openCreate({ kind: 'company' })}>
              <Plus />
              {t('time.addCompany')}
            </Button>
            <Button size="sm" onClick={onClose} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pending)} onOpenChange={(next) => !next && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === 'company'
                ? t('time.deleteCompanyTitle', { name: pending.company.name })
                : t('time.deleteProjectTitle', { name: pending?.project.name ?? '' })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pending?.kind === 'company'
              ? t('time.deleteCompanyBody', {
                  projects: pending.projects,
                  time: formatHoursMinutes(pending.seconds),
                })
              : t('time.deleteProjectBody', {
                  items: pending?.workItems ?? 0,
                  time: formatHoursMinutes(pending?.seconds ?? 0),
                })}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('editor.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {t('time.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function InlineCreate({
  name,
  color,
  onName,
  onColor,
  onSubmit,
  onCancel,
  placeholder,
}: {
  name: string
  color: string
  onName: (v: string) => void
  onColor: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  placeholder: string
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder={placeholder}
          className="h-8 max-w-64 text-sm"
        />
        <Button size="sm" onClick={onSubmit} disabled={!name.trim()}>
          {t('time.create')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('editor.cancel')}
        </Button>
      </div>
      <ColorPicker value={color} onChange={onColor} label={t('time.color')} />
    </div>
  )
}

function InlineName({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <span className={cn('flex min-w-0 flex-1 items-center gap-1')}>
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit()
          if (e.key === 'Escape') onCancel()
        }}
        className="h-8 max-w-56 text-sm"
      />
      <Button size="icon-sm" variant="ghost" onClick={onCommit} aria-label={t('editor.save')}>
        <Check />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onCancel} aria-label={t('editor.cancel')}>
        <X />
      </Button>
    </span>
  )
}
