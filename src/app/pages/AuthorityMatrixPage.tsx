import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Archive,
  Calendar,
  CheckCircle2,
  Crown,
  DollarSign,
  GraduationCap,
  Lock,
  Megaphone,
  Palette,
  PenTool,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type AccessLevel = 'yes' | 'no'

export interface PageFunctionality {
  id: string
  name: string
  description: string
  permissions: Record<string, AccessLevel>
}

const ROLE_ICONS: Record<string, typeof Crown> = {
  super_admin: ShieldAlert,
  founder: Crown,
  smm: Megaphone,
  art_director: Palette,
  graphic_designer: PenTool,
  instructional_designer: GraduationCap,
  archive_king: Archive,
  accountant: DollarSign,
}

const ROLES = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  { id: 'founder', label: 'Founder', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  {
    id: 'smm',
    label: 'Social Media Manager',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'art_director',
    label: 'Art Director',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    id: 'graphic_designer',
    label: 'Graphic Designer',
    badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  {
    id: 'instructional_designer',
    label: 'Instructional Designer',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  {
    id: 'archive_king',
    label: 'Archive Master',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'accountant',
    label: 'Accountant',
    badge: 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
  },
] as const

const DEFAULT_CALENDAR_FUNCTIONS: PageFunctionality[] = [
  {
    id: 'cal_create',
    name: '➕ Add & Schedule New Post',
    description:
      'Can open post creation modal, assign publication date/time, choose platforms, and attach Drive media.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'yes',
      graphic_designer: 'no',
      instructional_designer: 'no',
      archive_king: 'no',
      accountant: 'no',
    },
  },
  {
    id: 'cal_edit',
    name: '✏️ Edit Post & Reschedule',
    description:
      'Can edit captions, topics, hashtags, reschedule dates, and drag-and-drop posts in calendar.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'yes',
      graphic_designer: 'no',
      instructional_designer: 'no',
      archive_king: 'no',
      accountant: 'no',
    },
  },
  {
    id: 'cal_delete',
    name: '🗑️ Delete Post',
    description: 'Can permanently delete post records from the organization and calendar schedule.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'no',
      graphic_designer: 'no',
      instructional_designer: 'no',
      archive_king: 'no',
      accountant: 'no',
    },
  },
  {
    id: 'cal_request_changes',
    name: '🔄 Request Changes & Notes',
    description:
      'Can change post status to "Changes Required", write revision comments, and request updates.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'yes',
      graphic_designer: 'no',
      instructional_designer: 'no',
      archive_king: 'no',
      accountant: 'no',
    },
  },
  {
    id: 'cal_mark_done',
    name: '✅ Mark as Done / Approve',
    description:
      'Can approve post and trigger moving media assets in Google Drive from Review to Done folder.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'yes',
      graphic_designer: 'no',
      instructional_designer: 'no',
      archive_king: 'no',
      accountant: 'no',
    },
  },
  {
    id: 'cal_upload_media',
    name: '📤 Upload / Replace Deliverables',
    description:
      'Can upload high-res images, video reels, carousels, or documents directly to Drive review.',
    permissions: {
      super_admin: 'yes',
      founder: 'yes',
      smm: 'yes',
      art_director: 'yes',
      graphic_designer: 'yes',
      instructional_designer: 'yes',
      archive_king: 'yes',
      accountant: 'no',
    },
  },
]

const STORAGE_KEY = 'wl_calendar_authority_matrix_v1'

export function AuthorityMatrixPage() {
  const navigate = useNavigate()
  const { isSuperAdmin } = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [functions, setFunctions] = useState<PageFunctionality[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CALENDAR_FUNCTIONS
  })

  // Save to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(functions))
    } catch {
      // ignore
    }
  }, [functions])

  // 1-Click direct toggle between 'yes' and 'no'
  const handleTogglePermission = (funcId: string, roleId: string, currentLevel: AccessLevel) => {
    const nextLevel: AccessLevel = currentLevel === 'yes' ? 'no' : 'yes'

    setFunctions((prev) =>
      prev.map((fn) => {
        if (fn.id !== funcId) return fn
        return {
          ...fn,
          permissions: {
            ...fn.permissions,
            [roleId]: nextLevel,
          },
        }
      }),
    )

    toast.success(`Permission set to ${nextLevel === 'yes' ? 'YES' : 'NO'} (Auto-saved)`)
  }

  const handleResetDefaults = () => {
    setFunctions(DEFAULT_CALENDAR_FUNCTIONS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    toast.success('Calendar matrix reset to defaults')
  }

  const displayedFunctions = functions.filter((f) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
  })

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-8 text-center border-white/[0.08] bg-[#0E1217] shadow-2xl rounded-2xl space-y-5">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Lock className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Super Admin Authorization Required
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Authority Matrix is restricted. Only authorized Super Administrators can view and
              customize organizational access policies.
            </p>
          </div>
          <Button
            onClick={() => navigate('/home')}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-4 sm:p-5 lg:p-6 space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Social Media Calendar & Posts Authority Matrix
              </h1>
              <p className="text-xs text-muted-foreground">
                Operational Yes/No permissions matrix. Click any cell to toggle.
              </p>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs font-semibold rounded-xl border-white/[0.08] hover:bg-white/[0.06] gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Reset Defaults
            </Button>
          </div>
        }
      />

      {/* Filter & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-card p-4 shadow-xs">
        {/* Search */}
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calendar action..."
            className="ps-9 h-9 text-xs rounded-xl bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        {/* Binary Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground text-[11px] font-medium me-1">
            Legend (Click cell to toggle):
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Yes (Allowed)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border border-white/[0.08] bg-white/[0.02] text-neutral-500">
            <XCircle className="size-3.5" />
            No (Blocked)
          </span>
        </div>
      </div>

      {/* THE FOCUSED CALENDAR MATRIX */}
      <Card className="overflow-hidden border-white/[0.08] bg-card shadow-sm">
        {/* Group Header Banner */}
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Social Media Calendar & Posts
                <span className="font-mono text-[10px] text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  / & /posts
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Scheduling, post creation, review workflow, media replacements, and approvals.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs bg-white/[0.02]">
            {displayedFunctions.length} actions
          </Badge>
        </div>

        {/* Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0E1217] text-muted-foreground font-semibold">
                <th className="p-3.5 ps-5 text-start w-72 min-w-[240px]">Capability / Action</th>
                {ROLES.map((r) => {
                  const RoleIcon = ROLE_ICONS[r.id] || ShieldAlert
                  return (
                    <th key={r.id} className="p-3 text-center min-w-[145px]">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border text-center whitespace-nowrap shadow-xs',
                          r.badge,
                        )}
                      >
                        <RoleIcon className="size-3.5 shrink-0" />
                        <span>{r.label}</span>
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {displayedFunctions.map((fn, fIdx) => (
                <tr key={fn.id} className="hover:bg-white/[0.015] transition-colors">
                  {/* Function Info Column */}
                  <td className="p-3.5 ps-5 align-middle border-e border-white/[0.04] bg-white/[0.005]">
                    <div className="flex items-start gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-white/[0.05] text-[10px] font-bold text-neutral-400 font-mono mt-0.5">
                        {fIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs">{fn.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {fn.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 1-Click Binary Toggle Cell */}
                  {ROLES.map((role) => {
                    const currentLevel: AccessLevel =
                      fn.permissions[role.id] === 'yes' ? 'yes' : 'no'
                    const isYes = currentLevel === 'yes'

                    return (
                      <td
                        key={role.id}
                        className="p-2.5 text-center align-middle border-e border-white/[0.02] last:border-e-0"
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(fn.id, role.id, currentLevel)}
                          title={`Click to toggle ${role.label} to ${isYes ? 'No' : 'Yes'}`}
                          className={cn(
                            'w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary/40',
                            isYes
                              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-[1.03]'
                              : 'text-neutral-500 border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:text-neutral-300 hover:scale-[1.03]',
                          )}
                        >
                          {isYes ? (
                            <>
                              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                              <span>Yes</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3.5 text-neutral-500 shrink-0" />
                              <span>No</span>
                            </>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
