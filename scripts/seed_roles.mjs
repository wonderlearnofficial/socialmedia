import { createClient } from '@supabase/supabase-js'

const url = 'https://sltwwdpwmbfnygzntxpg.supabase.co'
const anonKey = 'sb_publishable_ZIcno2fRSo5Js3AcvB_4ww_Osa7g5w3'
const supabase = createClient(url, anonKey)

const PIN_PASSWORD_PREFIX = 'wl-pin-'
const pinToPassword = (pin) => `${PIN_PASSWORD_PREFIX}${pin}`

const ROLES_SEED = [
  {
    name: 'Dr. Wael Elmayyah',
    role: 'Founder',
    email: 'admin@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['linkedin', 'x', 'youtube'],
  },
  {
    name: 'Super Admin',
    role: 'Super Admin',
    email: 'superadmin@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['instagram', 'facebook', 'linkedin', 'tiktok', 'x', 'youtube'],
  },
  {
    name: 'Omar Farouk',
    role: 'Social Media Manager',
    email: 'omar.smm@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['instagram', 'facebook', 'tiktok', 'x'],
  },
  {
    name: 'Layla Hassan',
    role: 'Art Director',
    email: 'layla.art@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['instagram', 'linkedin', 'youtube'],
  },
  {
    name: 'Mazen Designer',
    role: 'Graphic Designer',
    email: 'user@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['instagram', 'facebook', 'tiktok'],
  },
  {
    name: 'Hana Curriculum',
    role: 'Instructional Designer',
    email: 'hana.id@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['youtube', 'linkedin'],
  },
  {
    name: 'Tarek Storage',
    role: 'Archive Master',
    email: 'tarek.archive@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['youtube', 'instagram'],
  },
  {
    name: 'Samir Finance',
    role: 'Accountant',
    email: 'samir.finance@internal.wonderlearn.app',
    workspace: 'wonderlearn',
    focus: ['linkedin'],
  },
]

async function seed() {
  const loginRes = await supabase.auth.signInWithPassword({
    email: 'admin@internal.wonderlearn.app',
    password: pinToPassword('00000'),
  })
  if (loginRes.error) {
    console.error('Sign-in error:', loginRes.error)
    return
  }
  console.log('Signed in successfully with admin PIN.')

  const { data: existing, error: listErr } = await supabase
    .from('team_members')
    .select('*')

  if (listErr) {
    console.error('List error:', listErr)
    return
  }

  console.log('Existing members before seed:', existing.map(m => `${m.name} (${m.role})`))

  for (const item of ROLES_SEED) {
    const found = existing.find(e => e.email === item.email || e.role === item.role)
    if (found) {
      console.log(`Updating ${found.name} -> role: ${item.role}`)
      const res = await supabase
        .from('team_members')
        .update({ role: item.role, name: item.name })
        .eq('id', found.id)
      if (res.error) console.error('Update error:', res.error)
    } else {
      console.log(`Inserting new role member: ${item.name} (${item.role})`)
      const res = await supabase
        .from('team_members')
        .insert(item)
      if (res.error) console.error('Insert error:', res.error)
    }
  }

  const { data: finalTeam } = await supabase.from('team_members').select('*')
  console.log('\n--- Final Team Roster in Supabase ---')
  console.table(finalTeam.map(t => ({ name: t.name, role: t.role, email: t.email })))
}

seed()
