import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { signInWithPin } from '@/lib/signIn'
import { supabase } from '@/services/supabaseClient'

// Dev-only convenience: with VITE_DEV_LOGIN_PIN set in .env.local (never
// committed — same rule as every other real credential in this app), local
// `npm run dev` sessions skip retyping the PIN on every reload. import.meta.env.DEV
// is statically false in production builds, so this whole branch is dead-code
// eliminated from what actually ships — the login gate is unchanged there.
async function devAutoSignIn() {
  if (!import.meta.env.DEV) return
  const devPin = import.meta.env.VITE_DEV_LOGIN_PIN
  if (!devPin) return
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  await signInWithPin(devPin)
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    devAutoSignIn().then(() =>
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      }),
    )
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const displayName =
    (session?.user.user_metadata as { name?: string } | undefined)?.name ??
    session?.user.email ??
    ''

  return { session, loading, displayName, isAuthenticated: Boolean(session) }
}
