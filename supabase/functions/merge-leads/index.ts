import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    const { sourceId, targetId, reason } = await req.json()
    if (!sourceId || !targetId) {
      return jsonResponse({ error: 'sourceId and targetId are required' }, 400)
    }
    const { error } = await supabase.rpc('merge_leads', {
      p_source_id: sourceId,
      p_target_id: targetId,
      p_reason: reason ?? '',
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
