import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    const { type, entity, entityId, payload } = await req.json()
    if (!type || !entity || !entityId) {
      return jsonResponse({ error: 'type, entity, entityId are required' }, 400)
    }
    const { data, error } = await supabase.rpc('submit_approval', {
      p_type: type,
      p_entity: entity,
      p_entity_id: entityId,
      p_payload: payload ?? {},
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true, approval: data })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
