import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PinField, pinProblem, PIN_LENGTH } from '@/features/settings/PinField'
import { AvatarCropDialog } from '@/features/team/AvatarCropDialog'
import { getRoleIcon } from '@/features/team/roleDescriptions'
import { useTeamActivity } from '@/features/team/useTeamActivity'
import { useSession } from '@/hooks/useSession'
import { useCreateTeamMember, useTeamMembers, useUpdateTeamMember } from '@/hooks/useTeamMembers'
import { uploadAvatarBlob, type ProcessedAvatar } from '@/lib/avatarImage'
import { formatTimestamp } from '@/lib/dates'
import { ADMIN_EMAIL, USER_EMAIL, pinToPassword } from '@/lib/constants'
import { supabase } from '@/services/supabaseClient'
import { cn } from '@/lib/utils'

/** After this many wrong current-PIN attempts, stop trying for a while. */
const MAX_ATTEMPTS = 5

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { displayName, session } = useSession()
  const { data: teamMembers = [] } = useTeamMembers()
  const { getMemberStatus } = useTeamActivity()
  const create = useCreateTeamMember()
  const update = useUpdateTeamMember()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // PIN change runs in two stages: prove who you are, then set the new one.
  const [stage, setStage] = useState<'locked' | 'unlocked'>('locked')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [reveal, setReveal] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const name = displayName || 'Dr. Wael Elmayyah'
  const email = session?.user.email || ''
  const member = teamMembers.find(
    (m) =>
      m.name.toLowerCase() === name.toLowerCase() ||
      (email && m.email.toLowerCase() === email.toLowerCase()),
  )

  const role = member?.role || 'Founder & Lead'
  const avatarUrl = member?.avatarUrl
  const RoleIcon = getRoleIcon(role)
  const status = member ? getMemberStatus(member) : null

  // Both of these are real fields on the Supabase Auth user — no extra table
  // and no guessing.
  const joinedAt = session?.user.created_at
  const lastSignInAt = session?.user.last_sign_in_at

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  // --- photo ----------------------------------------------------------------

  const handleCropped = async (processed: ProcessedAvatar) => {
    setCropFile(null)
    setAvatarUploading(true)
    try {
      const newAvatarUrl = await uploadAvatarBlob(processed, member?.id)
      if (member) {
        await update.mutateAsync({ id: member.id, patch: { avatarUrl: newAvatarUrl } })
      } else {
        await create.mutateAsync({
          name,
          role,
          email,
          avatarUrl: newAvatarUrl,
          workspace: 'wonderlearn',
        })
      }
      toast.success(t('profile.photoUpdated'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!member) return
    try {
      await update.mutateAsync({ id: member.id, patch: { avatarUrl: undefined } })
      toast.success(t('profile.photoRemoved'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  // --- PIN ------------------------------------------------------------------

  const lockedOut = attempts >= MAX_ATTEMPTS
  const weakKey = pinProblem(newPin)
  const mismatch =
    confirmPin.length === PIN_LENGTH && newPin.length === PIN_LENGTH && confirmPin !== newPin
  const sameAsCurrent = newPin.length === PIN_LENGTH && newPin === currentPin
  const canSubmit =
    newPin.length === PIN_LENGTH && confirmPin === newPin && !weakKey && !sameAsCurrent

  /**
   * Re-authenticate before allowing a credential change.
   *
   * Without this, anyone at an unlocked screen could set a new PIN and take
   * the account — the old page called `updateUser` straight from the form.
   * Signing in again with the current PIN is the proof, and it's the same
   * check the login screen makes.
   */
  const verifyCurrentPin = async () => {
    if (lockedOut || !email) return
    setBusy(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pinToPassword(currentPin),
      })
      if (error) {
        const next = attempts + 1
        setAttempts(next)
        setCurrentPin('')
        setAuthError(
          next >= MAX_ATTEMPTS
            ? t('profile.pinLockedOut')
            : t('profile.pinWrong', { count: MAX_ATTEMPTS - next }),
        )
        return
      }
      setStage('unlocked')
      setAttempts(0)
    } catch {
      setAuthError(t('common.errorTitle'))
    } finally {
      setBusy(false)
    }
  }

  const submitNewPin = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pinToPassword(newPin) })
      if (error) throw error
      toast.success(t('profile.pinUpdated'))
      setStage('locked')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setAuthError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.errorTitle')
      setAuthError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const signOutEverywhere = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
      toast.success(t('profile.signedOutEverywhere'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  // Both fixed accounts share one PIN, so a change affects whoever else uses it.
  const isSharedAccount = email === ADMIN_EMAIL || email === USER_EMAIL

  return (
    <div className="h-full overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[880px] space-y-6">
        <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

        {/* ---------------------------------------------------------------
            Identity — the avatar is the control, not decoration.
        --------------------------------------------------------------- */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">{t('profile.identity')}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('profile.identityBody')}</p>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label={avatarUrl ? t('profile.changePhoto') : t('profile.uploadPhoto')}
              className="group relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Avatar className="size-20 rounded-2xl border">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt="" className="rounded-2xl object-cover" />
                )}
                <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute inset-0 grid place-items-center rounded-2xl bg-black/60 text-white transition-opacity',
                  avatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                {avatarUploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Upload className="size-5" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setCropFile(file)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <RoleIcon className="size-3.5 shrink-0 text-primary" />
                {role}
              </p>
              {status && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      status.isOnline ? 'bg-emerald-400' : 'bg-neutral-500',
                    )}
                  />
                  <span className={status.isOnline ? 'text-emerald-400' : 'text-muted-foreground'}>
                    {status.label}
                  </span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Camera />
                  {avatarUrl ? t('profile.changePhoto') : t('profile.uploadPhoto')}
                </Button>
                {avatarUrl && (
                  <Button size="sm" variant="ghost" onClick={handleRemovePhoto}>
                    <Trash2 />
                    {t('profile.removePhoto')}
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('profile.photoLimits')}</p>
            </div>
          </div>

          {/* Joined / last sign-in / last active — all real, none invented. */}
          <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
            <Stat
              icon={<CalendarDays className="size-3.5" />}
              label={t('profile.joined')}
              value={joinedAt ? formatTimestamp(joinedAt, i18n.language) : '—'}
            />
            <Stat
              icon={<LogIn className="size-3.5" />}
              label={t('profile.lastSignIn')}
              value={lastSignInAt ? formatTimestamp(lastSignInAt, i18n.language) : '—'}
            />
            <Stat
              icon={<Clock className="size-3.5" />}
              label={t('profile.lastActive')}
              value={status?.label ?? '—'}
              accent={status?.isOnline}
            />
          </dl>

          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">{t('profile.email')}</Label>
              <p className="text-xs text-muted-foreground">{t('profile.emailHint')}</p>
              <div className="flex items-center gap-2">
                <Input id="profile-email" value={email} disabled />
                <Lock
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-label={t('profile.readOnly')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-role">{t('profile.role')}</Label>
              {/* Roles are admin-assigned; showing why keeps it from reading
                  as a broken field. */}
              <p className="text-xs text-muted-foreground">{t('profile.roleHint')}</p>
              <div className="flex items-center gap-2">
                <Input id="profile-role" value={role} disabled />
                <Lock
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-label={t('profile.readOnly')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Security
        --------------------------------------------------------------- */}
        <section className="rounded-xl border bg-card">
          <div className="p-5">
            <h2 className="text-sm font-semibold">{t('profile.signInPin')}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{t('profile.signInPinBody')}</p>

            {isSharedAccount && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {t('profile.sharedAccountWarning')}
              </p>
            )}

            {stage === 'locked' ? (
              <div className="mt-5 space-y-4">
                <p className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-[13px] text-muted-foreground">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t('profile.confirmFirst')}
                </p>

                <PinField
                  id="current-pin"
                  label={t('profile.currentPin')}
                  hint={t('profile.currentPinHint')}
                  value={currentPin}
                  onChange={setCurrentPin}
                  error={authError ?? undefined}
                  reveal={reveal}
                  disabled={lockedOut || busy}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={verifyCurrentPin}
                    disabled={currentPin.length !== PIN_LENGTH || lockedOut || busy}
                  >
                    {busy && <Loader2 className="animate-spin" />}
                    {t('profile.continue')}
                  </Button>
                  <RevealToggle reveal={reveal} onToggle={() => setReveal((v) => !v)} />
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <p className="flex items-center gap-2 text-[13px] text-emerald-400">
                  <ShieldCheck className="size-4" />
                  {t('profile.identityConfirmed')}
                </p>

                <PinField
                  id="new-pin"
                  label={t('profile.newPin')}
                  hint={t('profile.newPinHint')}
                  value={newPin}
                  onChange={setNewPin}
                  error={
                    weakKey ? t(weakKey) : sameAsCurrent ? t('profile.pinSameAsCurrent') : undefined
                  }
                  reveal={reveal}
                  autoFocus
                />

                <PinField
                  id="confirm-pin"
                  label={t('profile.confirmPin')}
                  hint={t('profile.confirmPinHint')}
                  value={confirmPin}
                  onChange={setConfirmPin}
                  error={mismatch ? t('profile.pinsDontMatch') : undefined}
                  reveal={reveal}
                />

                <p
                  aria-live="polite"
                  className={cn(
                    'text-xs',
                    canSubmit ? 'text-emerald-400' : 'text-muted-foreground',
                  )}
                >
                  {canSubmit
                    ? t('profile.readyToUpdate')
                    : t('profile.digitsEntered', { count: newPin.length, total: PIN_LENGTH })}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={submitNewPin} disabled={!canSubmit || busy}>
                    {busy && <Loader2 className="animate-spin" />}
                    {t('profile.updatePin')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStage('locked')
                      setCurrentPin('')
                      setNewPin('')
                      setConfirmPin('')
                      setAuthError(null)
                    }}
                  >
                    {t('editor.cancel')}
                  </Button>
                  <RevealToggle reveal={reveal} onToggle={() => setReveal((v) => !v)} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
            <p className="text-xs text-muted-foreground">{t('profile.signOutEverywhereBody')}</p>
            <Button variant="outline" size="sm" onClick={signOutEverywhere}>
              <LogOut />
              {t('profile.signOutEverywhere')}
            </Button>
          </div>
        </section>
      </div>

      <AvatarCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={handleCropped}
      />
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={cn('mt-1 truncate text-[13px] font-medium', accent && 'text-emerald-400')}>
        {value}
      </dd>
    </div>
  )
}

function RevealToggle({ reveal, onToggle }: { reveal: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={reveal}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      {reveal ? t('profile.hideDigits') : t('profile.showDigits')}
    </button>
  )
}
