import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    const { approvalId, approve, comment } = await req.json()
    if (!approvalId || typeof approve !== 'boolean') {
      return jsonResponse({ error: 'approvalId and approve are required' }, 400)
    }
    const { data, error } = await supabase.rpc('decide_approval', {
      p_approval_id: approvalId,
      p_approve: approve,
      p_comment: comment ?? '',
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true, result: data })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
