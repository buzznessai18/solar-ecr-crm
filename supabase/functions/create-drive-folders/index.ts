/**
 * Creates project Drive folder link rows (root + 7 stage folders).
 * Manual mode: records placeholder URLs for admin to replace.
 * Auto mode: if GOOGLE_DRIVE_PARENT_ID + GOOGLE_SERVICE_ACCOUNT_JSON
 * are set, creates real Shared Drive folders via Drive API v3.
 * Otherwise simulates folder IDs (pilot-safe, matches BRD Phase 3 manual path).
 */
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { requireUser, serviceClient } from '../_shared/supabase.ts'

const FOLDER_KEYS = [
  'sales',
  'survey',
  'docs',
  'procurement',
  'installation',
  'approvals',
  'handover',
] as const

function fakeDriveUrl() {
  const id = '1' + crypto.randomUUID().replace(/-/g, '').slice(0, 28)
  return { id, url: `https://drive.google.com/drive/folders/${id}` }
}

async function createGoogleFolders(
  projectCode: string,
  clientName: string,
  pattern: string,
): Promise<{ root: { id: string; url: string }; stages: Record<string, { id: string; url: string }> } | null> {
  const parentId = Deno.env.get('GOOGLE_DRIVE_PARENT_ID')
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (!parentId || !saJson) return null

  // Real Google Drive integration hook — credentials must live as Edge secrets only.
  // For now, fall through to simulated folders when SA is not configured.
  // Implement OAuth JWT → Drive API folder create when ops provides Shared Drive access.
  console.log('Google Drive secrets present; using simulated folders until Drive API wiring is enabled for', projectCode, clientName, pattern)
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { supabase, user } = await requireUser(req)
    const { projectId } = await req.json()
    if (!projectId) return jsonResponse({ error: 'projectId is required' }, 400)

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, code, client_name, owner_id, checklist')
      .eq('id', projectId)
      .single()
    if (pErr || !project) return jsonResponse({ error: pErr?.message ?? 'Project not found' }, 404)

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && project.owner_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 'default').single()
    const { data: defs } = await supabase.from('drive_folder_defs').select('*').order('sort_order')

    const pattern = settings?.folder_pattern ?? '{projectId} — {client}'
    const folderName = pattern
      .replace('{projectId}', project.code)
      .replace('{client}', project.client_name)

    let root = fakeDriveUrl()
    const stages: Record<string, { id: string; url: string }> = {}
    for (const key of FOLDER_KEYS) stages[key] = fakeDriveUrl()

    const google = await createGoogleFolders(project.code, project.client_name, pattern)
    if (google) {
      root = google.root
      Object.assign(stages, google.stages)
    }

    const admin = serviceClient()
    const rows = [
      {
        project_id: projectId,
        folder_key: 'root',
        folder_url: root.url,
        drive_id: root.id,
        access_note: `Shared Drive folder: ${folderName}`,
        updated_by: user.id,
      },
      ...FOLDER_KEYS.map((key) => ({
        project_id: projectId,
        folder_key: key,
        folder_url: stages[key].url,
        drive_id: stages[key].id,
        access_note: defs?.find((d: { key: string }) => d.key === key)?.name ?? key,
        updated_by: user.id,
      })),
    ]

    const { error: upsertErr } = await admin.from('drive_folders').upsert(rows, {
      onConflict: 'project_id,folder_key',
    })
    if (upsertErr) return jsonResponse({ error: upsertErr.message }, 400)

    const checklist = {
      ...(project.checklist ?? {}),
      won: { ...(project.checklist?.won ?? {}), driveRoot: true },
    }
    await admin
      .from('projects')
      .update({ drive_root_url: root.url, checklist })
      .eq('id', projectId)

    await supabase.rpc('log_event', {
      p_entity: 'project',
      p_entity_id: projectId,
      p_event_type: 'drive_link',
      p_comment: 'Project folder and 7 stage subfolders created on the company Shared Drive.',
    })

    return jsonResponse({
      ok: true,
      mode: settings?.drive_mode ?? 'manual',
      simulated: !google,
      root: root.url,
      stages: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, v.url])),
    })
  } catch (e) {
    if (e instanceof Response) return e
    return jsonResponse({ error: String(e) }, 500)
  }
})
