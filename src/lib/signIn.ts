import { ADMIN_EMAIL, USER_EMAIL, pinToPassword } from '@/lib/constants'
import { supabase } from '@/services/supabaseClient'

/** Tries both fixed accounts against one PIN; returns whether either matched. */
export async function signInWithPin(pin: string): Promise<boolean> {
  const password = pinToPassword(pin)
  const admin = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
  if (!admin.error) return true
  const user = await supabase.auth.signInWithPassword({ email: USER_EMAIL, password })
  return !user.error
}
