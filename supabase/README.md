# Ecorays Supabase backend

Backend for the Solar EPC Tracking BRD (v0.9) on project **Ecorays** (`ipyegvknczkhtfpzttay`).

## What is included

| Area | Location |
|------|----------|
| Schema, enums, tables | `migrations/20261020180000_schema.sql` |
| Auth helpers, RLS, codes | `migrations/20261020180100_helpers_and_rls.sql` |
| Stages / schemes / checklists | `migrations/20261020180200_seed_config.sql` |
| Won convert, approvals, KPIs, merge, gates | `migrations/20261020180300_business_rpcs.sql` |
| Edge Functions | `functions/*` |

### Tables

`profiles`, `leads`, `lead_meetings`, `projects`, `drive_folders`, `service_issues`, `tasks`, `task_comments`, `approvals`, `workflow_events`, plus config: `app_settings`, `schemes`, `workflow_stages`, `workflow_substages`, `checklist_items`, `loss_reasons`, `drive_folder_defs`.

### Edge Functions

| Function | Purpose |
|----------|---------|
| `submit-approval` | Won / loss / reopen / reassign requests |
| `decide-approval` | Admin approve/reject (Won creates project) |
| `move-project` | Stage move with gate checks + override audit |
| `merge-leads` | Admin duplicate merge |
| `duplicate-check` | Phone / email / consumer / address match |
| `dashboard-kpis` | BRD §9 KPI payload |
| `create-drive-folders` | Root + 7 stage folder links (simulated until Google secrets set) |

## Deploy (remote Ecorays project)

1. Create a **new** personal access token (rotate the one shared in chat) at  
   https://supabase.com/dashboard/account/tokens  
2. Copy `.env.example` → `.env` and fill keys from Project Settings → API.  
3. From repo root:

```bash
# Windows PowerShell
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase link --project-ref ipyegvknczkhtfpzttay
npx supabase db push
npx supabase functions deploy
```

4. Bootstrap demo users (needs service role key):

```bash
cd app && npm install @supabase/supabase-js   # if not already present
$env:SUPABASE_URL="https://ipyegvknczkhtfpzttay.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
node ../scripts/bootstrap-users.mjs
```

Default demo password: `EcoraysDemo!2026` (override with `DEMO_PASSWORD`).

## Security notes

- Never commit `sbp_` tokens, service role keys, or DB passwords.
- Rotate any token pasted into chat or terminal history.
- RLS enforces admin vs owner/assignee visibility (BRD §4).
- Hard deletes on leads/projects/audit events are blocked; use archive/merge.
- Google Drive credentials belong only in Edge Function secrets, never in the browser.

## Frontend next step

Point the React app at:

```
VITE_SUPABASE_URL=https://ipyegvknczkhtfpzttay.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

and replace Zustand mock mutations with PostgREST + these Edge Functions.
