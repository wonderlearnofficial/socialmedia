import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, LockKeyhole } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_EMAIL, USER_EMAIL } from '@/lib/constants'
import { supabase } from '@/services/supabaseClient'

/**
 * The manager dashboard requires a key; the public review page (/share/:id)
 * never does — that split is deliberate, not an oversight. One input, no
 * visible "admin vs user" choice: whichever of the two fixed accounts the
 * key matches decides the signed-in identity.
 */
export function LoginPage() {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const admin = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: key })
      if (!admin.error) return
      const user = await supabase.auth.signInWithPassword({ email: USER_EMAIL, password: key })
      if (user.error) setError(t('login.invalid'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" />
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-card p-5">
          <Label htmlFor="login-key">{t('login.keyLabel')}</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-key"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t('login.keyPlaceholder')}
              className="ps-9"
              aria-invalid={Boolean(error)}
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || !key}>
            {pending && <Loader2 className="animate-spin" />}
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
