import { AlertTriangle, CalendarClock, CheckCircle2, Clock, FolderKanban, Hourglass, Info, OctagonAlert, Table2, BarChart3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as TT from '@radix-ui/react-tooltip'
import { DISTRICTS } from '@/lib/config'
import { computeKpis } from '@/lib/kpi'
import { useMe, useStore, useUserName } from '@/lib/store'
import { ageLabel, cx, daysBetween, fmtDate, fmtINR, fmtKw, fmtShortDate, isAdmin, relDays, taskBuckets, todayISO, visibleLeads, visibleProjects, visibleTasks } from '@/lib/utils'
import { FleetString, MiniString } from '@/components/StageString'
import { Chip, EmptyState, Panel, Person, Select, Segmented, TaskStatus } from '@/components/ui'
import { TaskDialog } from '@/components/dialogs/ProjectDialogs'

const PERIODS = [
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
]

function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Definition({ children }) {
  return (
    <TT.Provider delayDuration={150}>
      <TT.Root>
        <TT.Trigger asChild>
          <button className="text-ink-3 hover:text-ink" aria-label="How this is counted"><Info size={14} /></button>
        </TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={6} className="z-50 max-w-[260px] rounded-[8px] bg-ink px-3 py-2 text-[0.8125rem] leading-snug text-white">
            {children}
            <TT.Arrow className="fill-ink" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  )
}

function Ledger({ items }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
      {items.map((it) => (
        <Link key={it.label} to={it.to || '#'} className="group block bg-surface px-5 py-4 hover:bg-[#f7f9f8]">
          <div className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2">
            {it.label}
            <span onClick={(e) => e.preventDefault()}><Definition>{it.def}</Definition></span>
          </div>
          <p className="mt-1.5 text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-ink">{it.value}</p>
          <p className="mt-1.5 truncate text-[0.8125rem] text-ink-3">{it.sub}</p>
        </Link>
      ))}
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[0.8125rem] shadow-[0_8px_24px_-8px_rgb(23_32_51/0.25)]">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="size-2.5 rounded-[2px]" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

const SERIES = { leads: '#2a78d6', won: '#eb6834' }

function MonthlyChart({ k }) {
  const [view, setView] = useState('chart')
  return (
    <Panel
      title="Leads and wins by month"
      description={`${k.yearLabel}, ${k.basis === 'fy' ? 'April to March financial year' : 'calendar year'}. Leads by created date, wins by approved Won date.`}
      action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: 'chart', label: <BarChart3 size={15} aria-label="Chart" /> }, { value: 'table', label: <Table2 size={15} aria-label="Table" /> }]} />}
    >
      <div className="mb-3 flex gap-4 text-[0.8125rem] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px]" style={{ background: SERIES.leads }} />New leads</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px]" style={{ background: SERIES.won }} />Sales won</span>
      </div>
      {view === 'chart' ? (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={k.months} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#c3c2b7' }} tick={{ fill: '#737d90', fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#737d90', fontSize: 12 }} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgb(23 32 51 / 0.05)' }} />
              <Bar dataKey="leads" name="New leads" fill={SERIES.leads} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="won" name="Sales won" fill={SERIES.won} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="scroll-x">
          <table className="data-table">
            <thead><tr><th>Month</th><th className="!text-right">New leads</th><th className="!text-right">Sales won</th></tr></thead>
            <tbody>{k.months.map((m) => <tr key={m.key}><td>{m.label} {m.key.slice(0, 4)}</td><td className="text-right">{m.leads}</td><td className="text-right">{m.won}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function LossReasons({ k }) {
  const rows = Object.entries(k.lossByReason).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <Panel title="Approved losses by reason" description="Counted by admin decision date. Pending requests are excluded.">
      {rows.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No approved losses in this period" />
      ) : (
        <ul className="space-y-3">
          {rows.map(([reason, n]) => (
            <li key={reason}>
              <div className="mb-1 flex justify-between text-sm"><span className="text-ink-2">{reason}</span><span className="font-semibold tabular-nums">{n}</span></div>
              <div className="h-2 rounded-full bg-sunken"><div className="h-2 rounded-full bg-[#2a78d6]" style={{ width: `${(n / max) * 100}%` }} title={`${reason}: ${n}`} /></div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AdminDashboard() {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const nav = useNavigate()
  const [f, setF] = useState({ period: 'thisYear', type: '', scheme: '', owner: '', district: '' })
  const set = (key) => (e) => setF((x) => ({ ...x, [key]: e.target ? e.target.value : e }))
  const k = useMemo(() => computeKpis(state, f), [state, f])
  const stages = state.config.stages
  const pending = state.approvals.filter((a) => a.status === 'pending')
  const updateSettings = useStore((s) => s.updateSettings)

  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-sm text-ink-3">{fmtDate(todayISO())}</p>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.015em] sm:text-[2rem]">{greeting()}, {me.name.split(' ')[0]}</h1>
        <p className="text-ink-2">
          {k.taskBuckets.overdue.length} overdue tasks, {k.stalled.length} stalled sales and {pending.length} approvals waiting across the company.
        </p>
      </div>

      <div className="scroll-x -mx-4 mb-5 flex items-center gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0" role="group" aria-label="Dashboard filters">
        <Select className="!w-auto" value={f.period} onChange={set('period')} options={PERIODS} aria-label="Period" />
        <Segmented size="sm" value={state.config.settings.fyBasis} onChange={(v) => updateSettings({ fyBasis: v }, `Dashboard year basis set to ${v === 'fy' ? 'financial' : 'calendar'} year.`)} options={[{ value: 'fy', label: 'Financial year' }, { value: 'cy', label: 'Calendar year' }]} />
        <Select className="!w-auto" value={f.type} onChange={set('type')} placeholder="All project types" options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]} aria-label="Project type" />
        <Select className="!w-auto" value={f.scheme} onChange={set('scheme')} placeholder="All schemes" options={state.config.schemes.map((s) => ({ value: s.key, label: s.name }))} aria-label="Scheme" />
        <Select className="!w-auto" value={f.owner} onChange={set('owner')} placeholder="All owners" options={state.users.map((u) => ({ value: u.id, label: u.name }))} aria-label="Owner" />
        <Select className="!w-auto" value={f.district} onChange={set('district')} placeholder="All districts" options={Object.keys(DISTRICTS)} aria-label="District" />
        {(f.type || f.scheme || f.owner || f.district) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setF({ period: f.period, type: '', scheme: '', owner: '', district: '' })}>Clear filters</button>
        )}
      </div>

      <section className="panel mb-5 px-3 pb-3 pt-4 sm:px-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2">
          <h2 className="panel-title">Where every record is right now</h2>
          <p className="text-[0.8125rem] text-ink-3">Open leads and active projects by stage. Select a stage to open the list.</p>
        </div>
        <FleetString
          stages={stages}
          counts={k.counts}
          stalled={k.stalledByStage}
          onSelect={(key) => nav(['lead', 'sales'].includes(key) ? `/leads?stage=${key}` : `/projects?stage=${key}`)}
        />
      </section>

      <div className="mb-5">
        <Ledger
          items={[
            { label: 'New leads', value: k.newLeads.length, sub: `${k.newLeads.filter((l) => l.source === 'Referral').length} from referrals`, def: 'Leads counted by created date in the selected period.', to: '/leads' },
            { label: 'Sales won', value: k.won.length, sub: `${fmtKw(k.wonKw)}, ${fmtINR(k.wonValue)}`, def: 'Projects counted by approved Won date. Capacity and value where entered.', to: '/projects' },
            { label: 'Losses', value: k.lossApprovals.length, sub: `${state.approvals.filter((a) => a.type === 'loss' && a.status === 'pending').length} awaiting approval`, def: 'Approved losses counted by admin decision date. Pending or rejected requests are not counted.', to: '/leads?status=lost' },
            { label: 'Installations', value: k.installs.length, sub: `${fmtKw(k.installs.reduce((a, p) => a + p.capacityKw, 0))} installed`, def: 'Projects counted by actual installation-completion date.', to: '/projects?stage=installation' },
            { label: 'Commissioned', value: k.commissioned.length, sub: `${fmtKw(k.commissioned.reduce((a, p) => a + p.capacityKw, 0))} live`, def: 'Projects counted by actual commissioning date.', to: '/projects?stage=om' },
            { label: 'Conversion', value: `${k.conversion}%`, sub: `${k.cohortWon} of ${k.cohort.length} leads created in period`, def: 'Won leads divided by all leads created in the selected period (the cohort).' },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <MonthlyChart k={k} />
        <LossReasons k={k} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel
          title={`Sales stalled more than ${state.config.settings.staleDays} days`}
          description="Open sales records with no stage or substage movement."
          action={<Chip tone={k.stalled.length ? 'warn' : 'good'} icon={k.stalled.length ? AlertTriangle : CheckCircle2}>{k.stalled.length}</Chip>}
          bodyClass="pb-2"
        >
          {k.stalled.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing stalled">Every open sales record moved in the last {state.config.settings.staleDays} days.</EmptyState>
          ) : (
            <div className="scroll-x">
              <table className="data-table">
                <thead><tr><th>Lead</th><th>Owner</th><th>Last update</th><th className="!text-right">Idle</th></tr></thead>
                <tbody>
                  {k.stalled.map((l) => (
                    <tr key={l.id} className="row-link" onClick={() => nav(`/leads/${l.id}`)}>
                      <td><Link to={`/leads/${l.id}`} className="font-semibold text-ink hover:text-cell">{l.businessName || l.contact}</Link><p className="text-[0.8125rem] text-ink-3">{l.substage}</p></td>
                      <td><Person userId={l.owner} size={22} /></td>
                      <td className="text-ink-2">{fmtShortDate(l.lastMovedAt)}</td>
                      <td className="text-right font-semibold text-warn">{daysBetween(l.lastMovedAt)} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Task health by person" description="Open tasks by assignee. Select a number to see the tasks." bodyClass="pb-2">
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr><th>Person</th><th className="!text-right">Overdue</th><th className="!text-right">Today</th><th className="!text-right">7 days</th><th className="!text-right">Blocked</th><th className="!text-right">Waiting</th></tr></thead>
              <tbody>
                {k.byPerson.map((r) => (
                  <tr key={r.user.id}>
                    <td><Person userId={r.user.id} size={22} /></td>
                    {['overdue', 'today', 'soon', 'blocked', 'waiting'].map((key) => (
                      <td key={key} className="text-right">
                        {r[key] ? (
                          <Link to={`/tasks?assignee=${r.user.id}&queue=${key}`} className={cx('font-semibold hover:underline', key === 'overdue' ? 'text-bad' : key === 'blocked' ? 'text-bad' : 'text-ink')}>{r[key]}</Link>
                        ) : <span className="text-ink-3">0</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Documentation and portal" description="Open projects using a scheme portal.">
          <ul className="space-y-2.5 text-sm">
            {['Not started', 'Submitted', 'Query raised', 'Approved', 'Rejected'].map((s) => (
              <li key={s} className="flex items-center justify-between">
                <span className="text-ink-2">{s}</span>
                <span className="font-semibold tabular-nums">{k.portal[s] || 0}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {k.queries.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/projects/${p.id}/documentation`} className="flex items-start gap-2 text-sm hover:text-cell">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn" />
                <span><span className="font-semibold">{p.client}</span> has an open query, {ageLabel(p.stageEnteredAt)} in stage</span>
              </Link>
            ))}
            {k.missingDocs.length > 0 && <p className="text-[0.8125rem] text-ink-3">{k.missingDocs.length} projects still have missing customer documents.</p>}
          </div>
        </Panel>

        <Panel title="Loan status" description={`${k.loanPending} pending. Not applicable is excluded from pending.`}>
          <ul className="space-y-2.5 text-sm">
            {['Not started', 'Submitted', 'Pending', 'Approved', 'Disbursed', 'Rejected', 'Not applicable'].map((s) => (
              <li key={s} className={cx('flex items-center justify-between', s === 'Not applicable' && 'border-t border-line pt-2.5 text-ink-3')}>
                <span className={s === 'Not applicable' ? '' : 'text-ink-2'}>{s}</span>
                <span className="font-semibold tabular-nums">{k.loan[s] || 0}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Stage ageing" description="Days since each project entered its current stage." bodyClass="px-5 pb-2">
          <table className="data-table">
            <thead><tr><th className="!px-0">Stage</th><th className="!text-right">Median</th><th className="!pr-0 !text-right">Longest</th></tr></thead>
            <tbody>
              {k.ageing.filter((a) => a.count).map((a) => (
                <tr key={a.key}>
                  <td className="!px-0">{stages.find((s) => s.key === a.key)?.short} <span className="text-ink-3">({a.count})</span></td>
                  <td className="text-right">{a.median}d</td>
                  <td className="!pr-0 text-right"><Link to={`/projects/${a.longest.p.id}`} className={cx('font-semibold hover:underline', a.longest.days > 21 ? 'text-warn' : 'text-ink')} title={a.longest.p.client}>{a.longest.days}d</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel className="mt-5" title="Waiting for your decision" action={<Link to="/approvals" className="btn btn-secondary btn-sm">Open approvals</Link>} bodyClass="px-5 pb-2">
        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No approvals waiting" />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((a) => {
              const rec = a.entity === 'lead' ? state.leads.find((l) => l.id === a.entityId) : state.projects.find((p) => p.id === a.entityId)
              return (
                <li key={a.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <Chip tone="sun" className="self-start">{{ won: 'Won', loss: 'Loss', reopen: 'Reopen', installation_reassign: 'Installation owner', owner_reassign: 'Owner change' }[a.type]}</Chip>
                  <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{rec?.businessName || rec?.client || rec?.contact}</span> <span className="text-ink-3">requested by {name(a.requestedBy)}, {relDays(a.requestedAt.slice(0, 10)).toLowerCase()}</span></span>
                  <Link to={`/approvals?id=${a.id}`} className="text-sm font-semibold text-cell hover:underline">Review</Link>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}

function UserDashboard() {
  const state = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [edit, setEdit] = useState(null)
  const myTasks = visibleTasks(state, me).filter((t) => t.assignee === me.id)
  const b = taskBuckets(myTasks)
  const projects = visibleProjects(state, me)
  const leads = visibleLeads(state, me).filter((l) => ['open', 'won-pending', 'loss-pending'].includes(l.status) && !l.projectId)
  const dueLeads = leads.filter((l) => l.nextActionDate && l.nextActionDate <= todayISO()).sort((a, b2) => (a.nextActionDate < b2.nextActionDate ? -1 : 1))
  const stale = state.config.settings.staleDays
  const myRequests = state.approvals.filter((a) => a.requestedBy === me.id).slice(0, 4)
  const queue = [...b.overdue, ...b.today, ...b.soon].sort((x, y) => (x.due < y.due ? -1 : 1)).slice(0, 7)
  const parentName = (t) => (t.projectId ? state.projects.find((p) => p.id === t.projectId)?.client : state.leads.find((l) => l.id === t.leadId)?.contact)

  const tiles = [
    { key: 'overdue', label: 'Overdue', n: b.overdue.length, icon: OctagonAlert, tone: 'text-bad' },
    { key: 'today', label: 'Due today', n: b.today.length, icon: CalendarClock, tone: 'text-sun-ink' },
    { key: 'soon', label: 'Next 7 days', n: b.soon.length, icon: Clock, tone: 'text-cell' },
    { key: 'waiting', label: 'Waiting on others', n: b.waiting.length, icon: Hourglass, tone: 'text-wait' },
    { key: 'blocked', label: 'Blocked', n: b.blocked.length, icon: OctagonAlert, tone: 'text-bad' },
  ]

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-ink-3">{fmtDate(todayISO())}</p>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.015em] sm:text-[2rem]">{greeting()}, {me.name.split(' ')[0]}</h1>
        <p className="mt-1 text-ink-2">
          {b.overdue.length + b.today.length === 0 ? 'Nothing is overdue or due today.' : `${b.overdue.length + b.today.length} tasks need you today.`} You own {leads.filter((l) => l.owner === me.id).length} open leads and {projects.filter((p) => p.owner === me.id).length} projects.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.key} to={`/tasks?queue=${t.key}`} className="panel flex items-center gap-3 px-4 py-3 hover:border-line-strong">
            <t.icon size={20} className={t.n ? t.tone : 'text-ink-3'} />
            <span>
              <span className="block text-[1.375rem] font-bold leading-none">{t.n}</span>
              <span className="text-[0.8125rem] text-ink-3">{t.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Your next tasks" action={<Link to="/tasks" className="btn btn-secondary btn-sm">All tasks</Link>} bodyClass="px-5 pb-2">
          {queue.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="You are clear for the week">New tasks assigned to you will appear here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((t) => (
                <li key={t.id}>
                  <button className="flex w-full items-start gap-3 py-3 text-left" onClick={() => setEdit(t)}>
                    <span className={cx('mt-1 h-9 w-1 shrink-0 rounded-full', t.due < todayISO() ? 'bg-bad' : t.due === todayISO() ? 'bg-sun' : 'bg-line-strong')} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{t.title}</span>
                      <span className="block truncate text-[0.8125rem] text-ink-3">{parentName(t)}, {state.config.stages.find((s) => s.key === t.stage)?.short}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cx('text-[0.8125rem] font-semibold', t.due < todayISO() ? 'text-bad' : 'text-ink-2')}>{relDays(t.due)}</span>
                      <TaskStatus status={t.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Leads needing a next action" action={<Link to="/leads" className="btn btn-secondary btn-sm">Your leads</Link>} bodyClass="px-5 pb-2">
          {dueLeads.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No follow-ups due">Leads with a next-action date of today or earlier show here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {dueLeads.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link to={`/leads/${l.id}`} className="flex items-start gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{l.businessName || l.contact}</span>
                      <span className="block truncate text-[0.8125rem] text-ink-3">{l.nextAction}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cx('text-[0.8125rem] font-semibold', l.nextActionDate < todayISO() ? 'text-bad' : 'text-sun-ink')}>{relDays(l.nextActionDate)}</span>
                      {daysBetween(l.lastMovedAt) > stale && <Chip tone="warn" icon={AlertTriangle}>Stalled</Chip>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-5" title="Projects you are on" description="Projects you own, install, or have tasks on." action={<Link to="/projects" className="btn btn-secondary btn-sm">All projects</Link>} bodyClass="pb-2">
        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects yet">Projects appear here once a lead you own is won, or someone assigns you a task.</EmptyState>
        ) : (
          <div className="scroll-x">
            <table className="data-table">
              <thead><tr><th>Project</th><th>Stage</th><th>Your role</th><th className="!text-right">In stage</th></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="row-link" onClick={() => nav(`/projects/${p.id}`)}>
                    <td><p className="font-semibold">{p.client}</p><p className="text-[0.8125rem] text-ink-3">{p.id}, {fmtKw(p.capacityKw)}</p></td>
                    <td><div className="flex flex-col gap-1"><MiniString stages={state.config.stages.slice(2)} current={p.stage} substage={p.substage} blocked={!!p.blocked} /><span className="text-[0.8125rem] text-ink-2">{p.substage}</span></div></td>
                    <td className="text-ink-2">{p.owner === me.id ? 'Owner' : p.installationOwner === me.id ? 'Installation owner' : 'Task assignee'}</td>
                    <td className="text-right text-ink-2">{ageLabel(p.stageEnteredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {myRequests.length > 0 && (
        <Panel className="mt-5" title="Your requests" action={<Link to="/approvals" className="btn btn-secondary btn-sm">Approvals</Link>} bodyClass="px-5 pb-2">
          <ul className="divide-y divide-line">
            {myRequests.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">{{ won: 'Won', loss: 'Loss', reopen: 'Reopen', installation_reassign: 'Installation owner change', owner_reassign: 'Owner change' }[a.type]} for {a.entityId}</span>
                <Chip tone={a.status === 'pending' ? 'sun' : a.status === 'approved' ? 'good' : 'bad'}>{a.status === 'pending' ? 'Pending' : a.status === 'approved' ? 'Approved' : 'Rejected'}</Chip>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {edit && <TaskDialog open onOpenChange={(v) => !v && setEdit(null)} task={edit} />}
    </>
  )
}

export default function Dashboard() {
  const me = useMe()
  return isAdmin(me) ? <AdminDashboard /> : <UserDashboard />
}
