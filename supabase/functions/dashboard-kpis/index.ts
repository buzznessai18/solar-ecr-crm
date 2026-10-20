import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    let from: string | null = null
    let to: string | null = null
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      from = body.from ?? null
      to = body.to ?? null
    } else {
      const url = new URL(req.url)
      from = url.searchParams.get('from')
      to = url.searchParams.get('to')
    }
    const { data, error } = await supabase.rpc('dashboard_kpis', {
      p_from: from,
      p_to: to,
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true, kpis: data })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
