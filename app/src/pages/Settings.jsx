import { ChevronDown, ChevronUp, Lock, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PROJECT_STAGE_KEYS, TEAMS, WON_CONDITIONS } from '@/lib/config'
import { useMe, useStore } from '@/lib/store'
import { cx, isAdmin, uid } from '@/lib/utils'
import { Avatar, Callout, Checkbox, Chip, Field, Input, KV, Modal, PageHeader, Panel, Segmented, Select } from '@/components/ui'

const SECTIONS = [
  ['profile', 'Your profile', false],
  ['users', 'Users and roles', true],
  ['workflow', 'Stages and checklists', true],
  ['schemes', 'Schemes', true],
  ['sales', 'Sales rules', true],
  ['drive', 'Google Drive', true],
  ['dashboard', 'Dashboard', true],
]

function Profile() {
  const me = useMe()
  return (
    <Panel title="Your profile" description="Managed by your admin. Contact them to change your role or team.">
      <div className="mb-5 flex items-center gap-4">
        <Avatar userId={me.id} size={56} />
        <div>
          <p className="text-lg font-semibold">{me.name}</p>
          <p className="text-ink-3">{me.title}</p>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <KV label="Email">{me.email}</KV>
        <KV label="Phone">{me.phone}</KV>
        <KV label="Role">{me.role === 'admin' ? 'Admin' : 'User'}</KV>
        <KV label="Team">{me.team}</KV>
      </dl>
      <p className="mt-5 text-[0.8125rem] text-ink-3">Times are shown in India Standard Time.</p>
    </Panel>
  )
}

function UserDialog({ user, open, onOpenChange }) {
  const saveUser = useStore((s) => s.saveUser)
  const [f, setF] = useState(user || { id: 'u-' + uid(), name: '', email: '', phone: '', role: 'user', team: 'Sales', title: '', active: true })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const ok = f.name.trim() && /@/.test(f.email) && f.title.trim()
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={user ? 'Edit user' : 'Add user'} description="Users sign in with their company Google account."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { saveUser(f); toast.success(user ? 'User updated' : 'User added'); onOpenChange(false) }}>{user ? 'Save user' : 'Add user'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required><Input value={f.name} onChange={set('name')} /></Field>
        <Field label="Job title" required><Input value={f.title} onChange={set('title')} /></Field>
        <Field label="Company email" required><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Role"><Select value={f.role} onChange={set('role')} options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} /></Field>
        <Field label="Team"><Select value={f.team} onChange={set('team')} options={TEAMS} /></Field>
      </div>
    </Modal>
  )
}

function Users() {
  const users = useStore((s) => s.users)
  const me = useMe()
  const setActive = useStore((s) => s.setUserActive)
  const [edit, setEdit] = useState(null)
  return (
    <Panel title="Users and roles" description="Admins see every record. Users see only records and tasks assigned to them." action={<button className="btn btn-primary btn-sm" onClick={() => setEdit('new')}><UserPlus size={15} /> Add user</button>} bodyClass="px-5 pb-2">
      <ul className="divide-y divide-line">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar userId={u.id} size={34} />
              <div className="min-w-0">
                <p className={cx('font-semibold', !u.active && 'text-ink-3')}>{u.name}</p>
                <p className="truncate text-[0.8125rem] text-ink-3">{u.email}, {u.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={u.role === 'admin' ? 'sun' : 'neutral'}>{u.role === 'admin' ? 'Admin' : u.team}</Chip>
              {!u.active && <Chip tone="bad">Disabled</Chip>}
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}>Edit</button>
              {u.id !== me.id && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setActive(u.id, !u.active); toast.success(u.active ? `${u.name} disabled` : `${u.name} enabled`) }}>{u.active ? 'Disable' : 'Enable'}</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="py-3 text-[0.8125rem] text-ink-3">Disabled users keep their history. Reassign their open records from the lead or project page.</p>
      {edit && <UserDialog user={edit === 'new' ? null : edit} open onOpenChange={(v) => !v && setEdit(null)} />}
    </Panel>
  )
}

function Workflow() {
  const config = useStore((s) => s.config)
  const setChecklist = useStore((s) => s.setChecklist)
  const setSubstages = useStore((s) => s.setSubstages)
  const [stage, setStage] = useState('survey')
  const [newItem, setNewItem] = useState('')
  const [newSub, setNewSub] = useState('')
  const st = config.stages.find((s) => s.key === stage)
  const items = config.checklists[stage] || []

  const moveSub = (i, d) => {
    const subs = [...st.substages]
    const [x] = subs.splice(i, 1)
    subs.splice(i + d, 0, x)
    setSubstages(stage, subs, `Reordered substages of ${st.name}.`)
  }

  return (
    <div className="grid gap-5">
      <Field label="Stage" className="max-w-[360px]">
        <Select value={stage} onChange={(e) => setStage(e.target.value)} options={config.stages.map((s) => ({ value: s.key, label: s.name }))} />
      </Field>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Substages" description="Milestones within the stage, in order.">
          <ol className="mb-4 divide-y divide-line rounded-[10px] border border-line">
            {st.substages.map((s, i) => (
              <li key={s} className="flex items-center gap-2 px-3 py-2">
                <span className="w-5 text-[0.8125rem] font-semibold tabular-nums text-ink-3">{i + 1}</span>
                <span className="flex-1 text-sm">{s}</span>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => moveSub(i, -1)} aria-label={`Move ${s} up`}><ChevronUp size={16} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === st.substages.length - 1} onClick={() => moveSub(i, 1)} aria-label={`Move ${s} down`}><ChevronDown size={16} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={st.substages.length <= 1} onClick={() => setSubstages(stage, st.substages.filter((x) => x !== s), `Removed substage "${s}" from ${st.name}.`)} aria-label={`Remove ${s}`}><Trash2 size={15} /></button>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="New substage" aria-label="New substage" />
            <button className="btn btn-secondary" disabled={!newSub.trim() || st.substages.includes(newSub.trim())} onClick={() => { setSubstages(stage, [...st.substages, newSub.trim()], `Added substage "${newSub.trim()}" to ${st.name}.`); setNewSub('') }}><Plus size={16} /> Add</button>
          </div>
        </Panel>

        <Panel title="Gate checklist" description="Required items must be done before a project leaves this stage. Admin overrides are logged.">
          {!PROJECT_STAGE_KEYS.includes(stage) ? (
            <p className="text-sm text-ink-3">Lead and sales stages use the Won condition instead of a checklist. Set it under Sales rules.</p>
          ) : (
            <>
              <ul className="mb-4 divide-y divide-line rounded-[10px] border border-line">
                {items.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">No checklist items.</li>}
                {items.map((it) => (
                  <li key={it.key} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1 text-sm">
                      {it.label}
                      {(it.schemes || it.types) && <span className="block text-[0.75rem] text-ink-3">Only for {it.types ? it.types.join(', ') : 'scheme-backed'} projects</span>}
                    </span>
                    <Checkbox checked={it.required} onChange={(v) => setChecklist(stage, items.map((x) => (x.key === it.key ? { ...x, required: v } : x)), `"${it.label}" set to ${v ? 'required' : 'optional'}.`)} label="Required" />
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setChecklist(stage, items.filter((x) => x.key !== it.key), `Removed checklist item "${it.label}" from ${st.name}.`)} aria-label={`Remove ${it.label}`}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="New checklist item" aria-label="New checklist item" />
                <button className="btn btn-secondary" disabled={!newItem.trim()} onClick={() => { setChecklist(stage, [...items, { key: 'c-' + uid(), label: newItem.trim(), required: true }], `Added checklist item "${newItem.trim()}" to ${st.name}.`); setNewItem('') }}><Plus size={16} /> Add</button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Schemes() {
  const schemes = useStore((s) => s.config.schemes)
  const setActive = useStore((s) => s.setSchemeActive)
  return (
    <Panel title="Schemes and portals" description="Disabled schemes cannot be chosen for new projects. Validate portal steps with operations and GEDA before enabling." bodyClass="px-5 pb-2">
      <ul className="divide-y divide-line">
        {schemes.map((s) => (
          <li key={s.key} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-[0.8125rem] text-ink-3">{s.portal || 'No portal'}; {s.types.join(' and ')}; {s.subsidy ? 'subsidy tracked' : 'no subsidy'}</p>
              {s.note && !s.active && <p className="mt-1 text-[0.8125rem] text-warn">{s.note}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Chip tone={s.active ? 'good' : 'neutral'}>{s.active ? 'Enabled' : 'Disabled'}</Chip>
              {s.key !== 'none' && <button className="btn btn-secondary btn-sm" onClick={() => { setActive(s.key, !s.active); toast.success(`${s.name} ${s.active ? 'disabled' : 'enabled'}`) }}>{s.active ? 'Disable' : 'Enable'}</button>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function SalesRules() {
  const settings = useStore((s) => s.config.settings)
  const reasons = useStore((s) => s.config.lossReasons)
  const update = useStore((s) => s.updateSettings)
  const setReasons = useStore((s) => s.setLossReasons)
  const [stale, setStale] = useState(settings.staleDays)
  const [r, setR] = useState('')
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Won condition" description="What a user must show before a lead can be approved as won.">
        <div className="grid gap-3">
          {WON_CONDITIONS.map((c) => (
            <label key={c.key} className={cx('flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3', settings.wonCondition === c.key ? 'border-cell bg-cell-soft' : 'border-line hover:border-line-strong')}>
              <input type="radio" name="won" className="accent-[#1e4fd8]" checked={settings.wonCondition === c.key} onChange={() => { update({ wonCondition: c.key }, `Won condition set to "${c.label}".`); toast.success('Won condition updated') }} />
              <span className="text-sm font-medium">{c.label}</span>
            </label>
          ))}
        </div>
      </Panel>
      <Panel title="Stalled sales alert" description="Flags open sales records with no stage or substage movement.">
        <div className="flex items-end gap-2">
          <Field label="Days without movement" className="w-[180px]"><Input type="number" min="1" value={stale} onChange={(e) => setStale(e.target.value)} /></Field>
          <button className="btn btn-secondary" disabled={Number(stale) === settings.staleDays || Number(stale) < 1} onClick={() => { update({ staleDays: Number(stale) }, `Stalled sales threshold set to ${stale} days.`); toast.success('Threshold saved') }}>Save</button>
        </div>
      </Panel>
      <Panel title="Loss reasons" description="Categories a user picks when requesting a loss." className="xl:col-span-2">
        <ul className="mb-4 flex flex-wrap gap-2">
          {reasons.map((x) => (
            <li key={x} className="flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1 text-sm">
              {x}
              <button className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-sunken hover:text-bad" onClick={() => setReasons(reasons.filter((y) => y !== x), `Removed loss reason "${x}".`)} aria-label={`Remove ${x}`}><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
        <div className="flex max-w-[480px] gap-2">
          <Input value={r} onChange={(e) => setR(e.target.value)} placeholder="New loss reason" aria-label="New loss reason" />
          <button className="btn btn-secondary" disabled={!r.trim() || reasons.includes(r.trim())} onClick={() => { setReasons([...reasons, r.trim()], `Added loss reason "${r.trim()}".`); setR('') }}><Plus size={16} /> Add</button>
        </div>
      </Panel>
    </div>
  )
}

function DriveSettings() {
  const settings = useStore((s) => s.config.settings)
  const update = useStore((s) => s.updateSettings)
  return (
    <div className="grid gap-5">
      <Panel title="Folder creation" description="Manual links suit the pilot. Automatic creation needs the approved backend Drive integration.">
        <Segmented value={settings.driveMode} onChange={(v) => { update({ driveMode: v }, `Drive folder creation set to ${v}.`); toast.success('Drive setting saved') }} options={[{ value: 'manual', label: 'Manual links' }, { value: 'auto', label: 'Automatic folders' }]} />
        {settings.driveMode === 'auto' && (
          <div className="mt-4"><Callout tone="cell" icon={Lock} title="Simulated in this demo">A backend service creates folders on the Shared Drive and saves their IDs. Google credentials never reach the browser.</Callout></div>
        )}
      </Panel>
      <Panel title="Folder naming" description="Use the stable project ID plus a short client or site label, never the client name alone.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <KV label="Pattern">{settings.folderPattern}</KV>
          <KV label="Example">ECR-P-2026-016 Goa Spice</KV>
        </dl>
        <p className="mt-4 text-sm text-ink-2">Stage subfolders: 01 Sales, 02 Survey and Design, 03 Documentation and Finance, 04 Procurement and Fabrication, 05 Installation, 06 Approvals and Scheme, 07 Handover and O&amp;M.</p>
      </Panel>
      <Panel title="Access policy">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>Use the company-managed Shared Drive with named users or groups.</li>
          <li>Do not use public “anyone with the link” sharing for customer folders.</li>
          <li>Keep identity and bank documents in restricted subfolders, not on dashboards.</li>
        </ul>
      </Panel>
    </div>
  )
}

function DashboardSettings() {
  const settings = useStore((s) => s.config.settings)
  const update = useStore((s) => s.updateSettings)
  return (
    <Panel title="Dashboard" description="Annual business reporting defaults to the Indian financial year (April to March).">
      <div className="grid gap-5">
        <Field label="Year basis">
          <div><Segmented value={settings.fyBasis} onChange={(v) => { update({ fyBasis: v }, `Dashboard year basis set to ${v === 'fy' ? 'financial' : 'calendar'} year.`); toast.success('Saved') }} options={[{ value: 'fy', label: 'Financial year' }, { value: 'cy', label: 'Calendar year' }]} /></div>
        </Field>
        <p className="text-sm text-ink-2">Due-soon queue covers the next {settings.dueSoonDays} days. Email and WhatsApp reminders come in a later release, after the escalation policy is approved.</p>
      </div>
    </Panel>
  )
}

export default function Settings() {
  const { tab = 'profile' } = useParams()
  const me = useMe()
  const admin = isAdmin(me)
  const sections = SECTIONS.filter(([, , adminOnly]) => admin || !adminOnly)
  const active = sections.find(([k]) => k === tab) ? tab : 'profile'
  const body = { profile: <Profile />, users: <Users />, workflow: <Workflow />, schemes: <Schemes />, sales: <SalesRules />, drive: <DriveSettings />, dashboard: <DashboardSettings /> }[active]

  return (
    <>
      <PageHeader title="Settings" description={admin ? 'Configure people, workflow, schemes and rules. Every change is recorded in the activity log.' : 'Your account details.'} />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="scroll-x -mx-4 px-4 lg:mx-0 lg:px-0" aria-label="Settings sections">
          <ul className="flex gap-1 lg:flex-col">
            {sections.map(([k, label]) => (
              <li key={k}>
                <NavLink to={k === 'profile' ? '/settings' : `/settings/${k}`} end
                  className={() => cx('block whitespace-nowrap rounded-[8px] px-3 py-2 text-sm font-medium', active === k ? 'bg-cell-soft text-cell-deep' : 'text-ink-2 hover:bg-sunken')}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">{body}</div>
      </div>
    </>
  )
}
