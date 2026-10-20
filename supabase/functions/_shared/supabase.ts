import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(req: Request) {
  const supabase = userClient(req)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return { supabase, user: data.user }
}
