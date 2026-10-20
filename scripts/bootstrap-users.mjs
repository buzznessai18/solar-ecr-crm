/**
 * Creates demo Auth users + profile metadata for Ecorays.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/bootstrap-users.mjs
 */
import { createClient } from '../app/node_modules/@supabase/supabase-js/dist/module/index.js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_PASSWORD || 'EcoraysDemo!2026'

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'rhea.naik@ecorays.in', full_name: 'Rhea Naik', role: 'admin', team: 'Management', title: 'Operations head', phone: '98220 41190' },
  { email: 'aditya.kamat@ecorays.in', full_name: 'Aditya Kamat', role: 'user', team: 'Sales', title: 'Sales executive', phone: '98231 22014' },
  { email: 'sneha.desai@ecorays.in', full_name: 'Sneha Desai', role: 'user', team: 'Sales', title: 'Commercial sales lead', phone: '99232 80455' },
  { email: 'pradeep.gaonkar@ecorays.in', full_name: 'Pradeep Gaonkar', role: 'user', team: 'Survey and design', title: 'Site surveyor', phone: '97640 11872' },
  { email: 'kavita.shetty@ecorays.in', full_name: 'Kavita Shetty', role: 'user', team: 'Documentation', title: 'Documentation and finance', phone: '98504 63320' },
  { email: 'joel.fernandes@ecorays.in', full_name: 'Joel Fernandes', role: 'user', team: 'Installation', title: 'Installation lead', phone: '98810 09341' },
  { email: 'manoj.parab@ecorays.in', full_name: 'Manoj Parab', role: 'user', team: 'Installation', title: 'Installation technician', phone: '90110 77452' },
  { email: 'tanvi.borkar@ecorays.in', full_name: 'Tanvi Borkar', role: 'user', team: 'Sales', title: 'Sales executive', phone: '93725 18806', active: false },
]

for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: u.full_name,
      role: u.role,
      team: u.team,
      title: u.title,
      phone: u.phone,
    },
  })
  if (error) {
    if (String(error.message).toLowerCase().includes('already')) {
      console.log('exists:', u.email)
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      const existing = listed?.users?.find((x) => x.email === u.email)
      if (existing) {
        await admin.from('profiles').upsert({
          id: existing.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          team: u.team,
          title: u.title,
          phone: u.phone,
          active: u.active !== false,
        })
      }
      continue
    }
    console.error('fail:', u.email, error.message)
    continue
  }
  if (u.active === false && data.user) {
    await admin.from('profiles').update({ active: false }).eq('id', data.user.id)
  }
  console.log('created:', u.email, data.user?.id)
}

console.log('\nDemo password for all users:', password)
console.log('Sign in via Supabase Auth email/password, then use the JWT against Edge Functions / PostgREST.')
