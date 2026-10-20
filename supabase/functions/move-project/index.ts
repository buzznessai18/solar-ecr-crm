import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase } = await requireUser(req)
    const { projectId, stage, substage, comment, overrideReason } = await req.json()
    if (!projectId || !stage || !substage || !comment) {
      return jsonResponse({ error: 'projectId, stage, substage, comment are required' }, 400)
    }
    const { data, error } = await supabase.rpc('move_project_stage', {
      p_project_id: projectId,
      p_stage: stage,
      p_substage: substage,
      p_comment: comment,
      p_override_reason: overrideReason ?? null,
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true, project: data })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
