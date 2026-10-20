import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    const { phone, email, consumerNo, address, excludeId } = await req.json()
    if (!phone) return jsonResponse({ error: 'phone is required' }, 400)
    const { data, error } = await supabase.rpc('find_lead_duplicates', {
      p_phone: phone,
      p_email: email ?? null,
      p_consumer_no: consumerNo ?? null,
      p_address: address ?? null,
      p_exclude_id: excludeId ?? null,
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true, duplicates: data ?? [] })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
