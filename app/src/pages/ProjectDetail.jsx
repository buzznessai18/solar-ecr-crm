import * as Tabs from '@radix-ui/react-tabs'
import { Archive, ArrowLeft, ArrowRightLeft, CheckCircle2, Circle, ExternalLink, FolderOpen, Lock, MoreHorizontal, Pause, Play, Plus, UserRoundCog, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PROJECT_STAGE_KEYS, STAGE_TO_FOLDER } from '@/lib/config'
import { useMe, useStore, useUserName } from '@/lib/store'
import { ageLabel, canEditProject, canViewProject, checklistFor, cx, fmtDate, fmtINR, fmtKw, gateBlockers, isAdmin, relDays, todayISO } from '@/lib/utils'
import { StageString } from '@/components/StageString'
import { Timeline } from '@/components/Timeline'
import { Callout, Checkbox, Chip, EmptyState, KV, Menu, Meter, Panel, Person, Priority, TaskStatus } from '@/components/ui'
import { ArchiveDialog, BlockDialog, MoveStageDialog, TaskDialog } from '@/components/dialogs/ProjectDialogs'
import { ReassignDialog } from '@/components/dialogs/LeadDialogs'
import { ApprovalsTab, DeliveryTab, DocsTab, DriveTab, SurveyTab } from './project/Sections'
import NotFound, { NoAccess } from './NotFound'

const TABS = [
  ['overview', 'Overview'],
  ['stages', 'Stage tracking'],
  ['tasks', 'Tasks'],
  ['survey', 'Survey and design'],
  ['documentation', 'Documentation'],
  ['installation', 'Installation'],
  ['approvals', 'Approvals and handover'],
  ['drive', 'Drive'],
  ['history', 'History'],
]

function GateChecklist({ project, stageKey, editable }) {
  const state = useStore()
  const toggle = useStore((s) => s.toggleChecklist)
  const items = checklistFor(state.config.checklists, stageKey, project)
  const done = items.filter((i) => project.checklist?.[stageKey]?.[i.key]).length
  if (!items.length) return <p className="text-sm text-ink-3">No gate checklist for this stage.</p>
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <Meter value={done} max={items.length} tone={done === items.length ? 'good' : 'cell'} />
        <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-ink-2">{done}/{items.length}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.key}>
            <Checkbox
              checked={project.checklist?.[stageKey]?.[i.key]}
              disabled={!editable}
              onChange={(v) => toggle(project.id, stageKey, i.key, v)}
              label={<>{i.label}{!i.required && <span className="text-ink-3"> (optional)</span>}</>}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TaskRow({ t, onOpen, showStage }) {
  const name = useUserName()
  const stages = useStore((s) => s.config.stages)
  const overdue = t.status !== 'Completed' && t.due < todayISO()
  return (
    <li>
      <button className="flex w-full items-start gap-3 py-3 text-left" onClick={() => onOpen(t)}>
        {t.status === 'Completed' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-good" /> : <Circle size={18} className="mt-0.5 shrink-0 text-line-strong" />}
        <span className="min-w-0 flex-1">
          <span className={cx('block text-sm font-medium', t.status === 'Completed' && 'text-ink-3 line-through')}>
            {t.title}
            {t.required && t.status !== 'Completed' && <span className="ml-1.5 text-[0.75rem] font-semibold text-cell">Gate</span>}
          </span>
          <span className="block text-[0.8125rem] text-ink-3">
            {name(t.assignee)}{showStage ? `, ${stages.find((s) => s.key === t.stage)?.short}` : ''}, {t.status === 'Completed' ? `done ${fmtDate(t.completedAt)}` : <span className={overdue ? 'font-semibold text-bad' : ''}>{relDays(t.due).toLowerCase()}</span>}
          </span>
          {t.blocker && t.status !== 'Completed' && <span className="mt-0.5 block text-[0.8125rem] text-wait">{t.blocker}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1"><TaskStatus status={t.status} />{t.status !== 'Completed' && <Priority value={t.priority} />}</span>
      </button>
    </li>
  )
}

export default function ProjectDetail() {
  const { id, tab = 'overview' } = useParams()
  const nav = useNavigate()
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const setBlock = useStore((s) => s.setBlock)
  const [dlg, setDlg] = useState(null)
  const [task, setTask] = useState(null)
  const [selStage, setSelStage] = useState(null)
  const close = (v) => !v && setDlg(null)

  const p = state.projects.find((x) => x.id === id)
  if (!p) return <NotFound />
  if (!canViewProject(state, me, p)) return <NoAccess what="project" />

  const admin = isAdmin(me)
  const canEdit = canEditProject(me, p) && !p.archived
  const myTaskStages = new Set(state.tasks.filter((t) => t.projectId === p.id && t.assignee === me.id && t.status !== 'Completed').map((t) => t.stage))
  const canEditStage = (k) => canEdit || myTaskStages.has(k)
  const stages = state.config.stages
  const pStages = stages.filter((s) => PROJECT_STAGE_KEYS.includes(s.key))
  const cur = stages.find((s) => s.key === p.stage)
  const gate = gateBlockers(state, p)
  const tasks = state.tasks.filter((t) => t.projectId === p.id)
  const openTasks = tasks.filter((t) => t.status !== 'Completed')
  const lead = state.leads.find((l) => l.id === p.leadId)
  const events = state.events.filter((e) => (e.entity === 'project' && e.entityId === p.id) || e.parent === p.id || (e.entity === 'lead' && e.entityId === p.leadId))
  const pendingReq = state.approvals.filter((a) => a.entityId === p.id && a.status === 'pending')
  const scheme = state.config.schemes.find((s) => s.key === p.scheme)
  const rootUrl = p.drive.root
  const stageFolder = p.drive.stages[STAGE_TO_FOLDER[p.stage]]
  const viewStage = selStage || p.stage
  const goTab = (t) => nav(`/projects/${p.id}${t === 'overview' ? '' : `/${t}`}`, { replace: true })

  return (
    <>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink"><ArrowLeft size={16} /> Projects</Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Chip tone="outline">{p.type === 'commercial' ? 'Commercial' : 'Residential'}</Chip>
            <Chip tone="cell">{scheme?.name}</Chip>
            {p.blocked && <Chip tone="bad" icon={Pause}>{p.blocked.kind}</Chip>}
            {p.archived && <Chip tone="neutral" icon={Archive}>Archived</Chip>}
            {p.stage === 'om' && p.serviceIssues.some((s) => s.status === 'Open') && <Chip tone="warn" icon={Wrench}>Open service issue</Chip>}
          </div>
          <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.015em] sm:text-[1.875rem]">{p.client}</h1>
          <p className="mt-1 text-ink-2">{p.id}, {fmtKw(p.capacityKw)}, {p.taluka}. Won {fmtDate(p.wonDate)} from <Link to={`/leads/${p.leadId}`} className="font-medium text-cell hover:underline">{p.leadId}</Link></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rootUrl ? (
            <a href={stageFolder || rootUrl} target="_blank" rel="noreferrer" className="btn btn-secondary"><FolderOpen size={16} /> <span className="hidden sm:inline">Open Drive folder</span><span className="sm:hidden">Drive</span></a>
          ) : (
            <button className="btn btn-secondary" onClick={() => goTab('drive')}><FolderOpen size={16} /> Link Drive folder</button>
          )}
          {canEdit && p.stage !== 'om' && <button className="btn btn-primary" onClick={() => setDlg('move')}><ArrowRightLeft size={16} /> Move<span className="hidden sm:inline"> project</span></button>}
          {canEdit && (
            <Menu
              trigger={<button className="btn btn-secondary btn-icon" aria-label="More actions"><MoreHorizontal size={18} /></button>}
              items={[
                { label: 'Add task', icon: Plus, onSelect: () => setDlg('task') },
                p.blocked ? { label: 'Resume project', icon: Play, onSelect: () => { setBlock(p.id, null); toast.success('Project resumed') } } : { label: 'Pause or block', icon: Pause, onSelect: () => setDlg('block') },
                '-',
                { label: admin ? 'Change owner' : 'Request owner change', icon: UserRoundCog, onSelect: () => setDlg('owner') },
                { label: admin ? 'Change installation owner' : 'Request installation owner change', icon: UserRoundCog, onSelect: () => setDlg('inst') },
                admin && '-',
                admin && { label: 'Archive project', icon: Archive, danger: true, onSelect: () => setDlg('archive') },
              ]}
            />
          )}
        </div>
      </div>

      {p.blocked && (
        <div className="mb-4">
          <Callout tone="bad" icon={Pause} title={`${p.blocked.kind}: ${p.blocked.waitingOn}`}
            action={canEdit && <button className="btn btn-secondary btn-sm" onClick={() => { setBlock(p.id, null); toast.success('Project resumed') }}><Play size={14} /> Resume</button>}>
            Next action: {p.blocked.nextAction}. Responsible: {name(p.blocked.party)}. Review on {fmtDate(p.blocked.reviewDate)}{p.blocked.reviewDate < todayISO() ? ' (overdue)' : ''}.
          </Callout>
        </div>
      )}
      {pendingReq.map((a) => (
        <div key={a.id} className="mb-4">
          <Callout tone="warn" title={`${{ installation_reassign: 'Installation owner change', owner_reassign: 'Owner change', loss: 'Loss review' }[a.type]} waiting for admin approval`}
            action={admin && <Link to={`/approvals?id=${a.id}`} className="btn btn-secondary btn-sm">Review</Link>}>
            {a.payload.from && <>From {name(a.payload.from)} to {name(a.payload.to)}. </>}Requested by {name(a.requestedBy)} on {fmtDate(a.requestedAt)}. Nothing changes until it is approved.
          </Callout>
        </div>
      ))}
      {!canEdit && !p.archived && (
        <div className="mb-4">
          <Callout tone="cell" icon={Lock} title="You can update your tasks on this project">
            Only {name(p.owner)} (owner) or an admin can move the project or change its main details.
          </Callout>
        </div>
      )}

      <section className="panel mb-5 px-3 pb-3 pt-4">
        <StageString stages={stages} current={p.stage} substage={p.substage} blocked={!!p.blocked} selected={tab === 'stages' ? viewStage : null}
          onSelect={(k) => { if (PROJECT_STAGE_KEYS.includes(k)) { setSelStage(k); goTab('stages') } }} />
      </section>

      <Tabs.Root value={tab} onValueChange={goTab}>
        <div className="scroll-x mb-5 border-b border-line">
          <Tabs.List className="flex gap-6" aria-label="Project sections">
            {TABS.map(([k, label]) => (
              <Tabs.Trigger key={k} value={k} className="tab-trigger">
                {label}
                {k === 'tasks' && openTasks.length > 0 && <span className="ml-1.5 rounded-full bg-sunken px-1.5 text-[0.75rem] text-ink-2">{openTasks.length}</span>}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <Tabs.Content value="overview" className="focus:outline-none">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <Panel
                title={`Gate: ${cur.name}`}
                description={p.stage === 'om' ? 'Project is in operations and maintenance.' : gate.ok ? 'Ready to move to the next stage.' : 'Complete these before the project can move on.'}
                action={canEdit && p.stage !== 'om' && <button className={cx('btn btn-sm', gate.ok ? 'btn-primary' : 'btn-secondary')} onClick={() => setDlg('move')}>Move project</button>}
              >
                <GateChecklist project={p} stageKey={p.stage} editable={canEditStage(p.stage)} />
                {gate.openTasks.length > 0 && (
                  <p className="mt-4 text-[0.8125rem] text-ink-3">Also waiting on {gate.openTasks.length} required {gate.openTasks.length === 1 ? 'task' : 'tasks'}: {gate.openTasks.map((t) => t.title).join(', ')}.</p>
                )}
              </Panel>

              <Panel title="Open tasks" action={canEdit && <button className="btn btn-secondary btn-sm" onClick={() => setDlg('task')}><Plus size={15} /> Add task</button>} bodyClass="px-5 pb-2">
                {openTasks.length === 0 ? <p className="pb-4 text-sm text-ink-3">No open tasks.</p> : (
                  <ul className="divide-y divide-line">{openTasks.slice(0, 6).map((t) => <TaskRow key={t.id} t={t} onOpen={setTask} showStage />)}</ul>
                )}
                {openTasks.length > 6 && <button className="btn btn-ghost btn-sm mb-3" onClick={() => goTab('tasks')}>See all {openTasks.length} tasks</button>}
              </Panel>

              <Panel title="Recent activity" action={<button className="btn btn-ghost btn-sm" onClick={() => goTab('history')}>Full history</button>}>
                <Timeline events={events.slice(0, 5)} />
              </Panel>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Panel title="Project">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <KV label="Capacity">{fmtKw(p.capacityKw)}</KV>
                  <KV label="Project value">{fmtINR(p.value)}</KV>
                  <KV label="Current stage">{cur.name}</KV>
                  <KV label="Substage">{p.substage}</KV>
                  <KV label="In stage for">{ageLabel(p.stageEnteredAt)}</KV>
                  <KV label="Won on">{fmtDate(p.wonDate)}</KV>
                  <KV label="Scheme" className="col-span-2">{scheme?.name}{scheme?.portal ? `, ${scheme.portal}` : ''}</KV>
                  <KV label="Consumer number">{p.consumerNo}</KV>
                  <KV label="Lead source">{p.source}{lead?.referrer ? `, ${lead.referrer}` : ''}</KV>
                </dl>
              </Panel>
              <Panel title="Client and site">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <KV label="Contact">{p.contact}</KV>
                  <KV label="Phone"><a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-cell hover:underline">{p.phone}</a></KV>
                  <KV label="Email" className="col-span-2">{p.email}</KV>
                  <KV label="Site" className="col-span-2">{p.address}, {p.taluka}, {p.district}</KV>
                </dl>
              </Panel>
              <Panel title="People">
                <ul className="space-y-3">
                  <li><Person userId={p.owner} sub="Project owner" size={32} /></li>
                  <li><Person userId={p.installationOwner} sub="Installation owner" size={32} /></li>
                  <li><Person userId={p.survey.surveyor} sub="Surveyor" size={32} /></li>
                </ul>
              </Panel>
              <Panel title="Status at a glance" bodyClass="px-5 pb-4">
                <ul className="divide-y divide-line text-sm">
                  {[
                    ['Feasibility', p.survey.feasibility || 'Not recorded'],
                    ['Vendor agreement', p.docs.vendorAgreement],
                    ['Portal', p.docs.portal.status],
                    ['Loan', p.docs.loan.status],
                    ['Subsidy', p.subsidy],
                    ['Installed on', p.installation.actualDate ? fmtDate(p.installation.actualDate) : 'Not yet'],
                    ['Commissioned on', p.commissioning.date ? fmtDate(p.commissioning.date) : 'Not yet'],
                  ].map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3 py-2"><span className="text-ink-3">{k}</span><span className="text-right font-medium">{v}</span></li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="stages" className="focus:outline-none">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <nav className="panel h-fit p-2" aria-label="Stages">
              <ol>
                {pStages.map((s, i) => {
                  const ci = pStages.findIndex((x) => x.key === p.stage)
                  const st = i < ci ? 'done' : i === ci ? 'live' : 'todo'
                  return (
                    <li key={s.key}>
                      <button onClick={() => setSelStage(s.key)} className={cx('flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-sm', viewStage === s.key ? 'bg-cell-soft' : 'hover:bg-sunken')}>
                        <span className={cx('grid size-6 shrink-0 place-items-center rounded-[6px] text-[0.75rem] font-bold', st === 'done' ? 'bg-cell text-white' : st === 'live' ? (p.blocked ? 'bg-bad text-white' : 'bg-sun text-[#3a2a00]') : 'bg-sunken text-ink-3')}>
                          {st === 'done' ? <CheckCircle2 size={14} /> : i + 3}
                        </span>
                        <span className={cx('min-w-0 flex-1 font-medium', st === 'todo' && 'text-ink-3')}>{s.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>
            <StageDetail project={p} stageKey={viewStage} editable={canEditStage(viewStage)} canEdit={canEdit} tasks={tasks} onTask={setTask} onMove={() => setDlg('move')} onAddTask={() => setDlg('task')} events={events} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="tasks" className="focus:outline-none">
          <Panel title="All tasks" description="Assignees can update their own tasks. Assigning a task never changes project ownership."
            action={canEdit && <button className="btn btn-primary btn-sm" onClick={() => setDlg('task')}><Plus size={15} /> Add task</button>} bodyClass="px-5 pb-2">
            {tasks.length === 0 ? <EmptyState title="No tasks yet" /> : pStages.filter((s) => tasks.some((t) => t.stage === s.key)).map((s) => (
              <div key={s.key} className="mb-2">
                <h3 className="border-b border-line pb-2 pt-3 text-[0.8125rem] font-semibold text-ink-3">{s.name}</h3>
                <ul className="divide-y divide-line">{tasks.filter((t) => t.stage === s.key).map((t) => <TaskRow key={t.id} t={t} onOpen={setTask} />)}</ul>
              </div>
            ))}
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="survey" className="focus:outline-none"><SurveyTab project={p} canEdit={canEditStage('survey')} /></Tabs.Content>
        <Tabs.Content value="documentation" className="focus:outline-none"><DocsTab project={p} canEdit={canEditStage('docs')} /></Tabs.Content>
        <Tabs.Content value="installation" className="focus:outline-none">
          <DeliveryTab project={p} canEdit={canEditStage('procurement')} canEditInstall={canEditStage('installation') || p.installationOwner === me.id} />
        </Tabs.Content>
        <Tabs.Content value="approvals" className="focus:outline-none"><ApprovalsTab project={p} canEdit={canEditStage('post') || canEditStage('commissioning') || canEditStage('om')} /></Tabs.Content>
        <Tabs.Content value="drive" className="focus:outline-none"><DriveTab project={p} canEdit={canEdit} /></Tabs.Content>
        <Tabs.Content value="history" className="focus:outline-none">
          <Panel title="History" description="Project, task and original lead events. Nobody can edit or delete history.">
            <Timeline events={events} />
          </Panel>
        </Tabs.Content>
      </Tabs.Root>

      {dlg === 'move' && <MoveStageDialog project={p} open onOpenChange={close} />}
      {dlg === 'block' && <BlockDialog project={p} open onOpenChange={close} />}
      {dlg === 'task' && <TaskDialog projectId={p.id} defaultStage={tab === 'stages' ? viewStage : p.stage} open onOpenChange={close} />}
      {dlg === 'owner' && <ReassignDialog entity="project" record={p} open onOpenChange={close} />}
      {dlg === 'inst' && <ReassignDialog entity="project" record={p} field="installationOwner" open onOpenChange={close} />}
      {dlg === 'archive' && <ArchiveDialog project={p} open onOpenChange={close} onDone={() => nav('/projects')} />}
      {task && <TaskDialog task={task} open onOpenChange={(v) => !v && setTask(null)} />}
    </>
  )
}

function StageDetail({ project: p, stageKey, editable, canEdit, tasks, onTask, onMove, onAddTask, events }) {
  const stages = useStore((s) => s.config.stages)
  const s = stages.find((x) => x.key === stageKey)
  const pStages = stages.filter((x) => PROJECT_STAGE_KEYS.includes(x.key))
  const si = pStages.findIndex((x) => x.key === stageKey)
  const ci = pStages.findIndex((x) => x.key === p.stage)
  const state = si < ci ? 'done' : si === ci ? 'live' : 'todo'
  const subIdx = state === 'live' ? s.substages.indexOf(p.substage) : state === 'done' ? s.substages.length : -1
  const stageTasks = tasks.filter((t) => t.stage === stageKey)
  const folderKey = STAGE_TO_FOLDER[stageKey]
  const folderUrl = p.drive.stages[folderKey]
  const stageName = s.name.toLowerCase()
  const stageEvents = events.filter((e) => e.type === 'stage_change' || e.type === 'override').filter((e) => (e.to || '').toLowerCase().startsWith(stageName) || (e.from || '').toLowerCase().startsWith(stageName))

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Panel
        title={s.name}
        description={state === 'done' ? 'Completed.' : state === 'live' ? `In progress, ${ageLabel(p.stageEnteredAt)} so far.` : 'Not started.'}
        action={
          <div className="flex gap-2">
            {folderUrl && <a href={folderUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={14} /> Stage folder</a>}
            {state === 'live' && canEdit && p.stage !== 'om' && <button className="btn btn-primary btn-sm" onClick={onMove}>Move project</button>}
          </div>
        }
      >
        <ol className="relative grid gap-0">
          {s.substages.map((sub, i) => {
            const st = i < subIdx ? 'done' : i === subIdx ? 'live' : 'todo'
            return (
              <li key={sub} className="relative flex gap-3 pb-4 last:pb-0">
                {i < s.substages.length - 1 && <span aria-hidden className={cx('absolute left-[11px] top-6 bottom-0 w-[2px]', st === 'done' ? 'bg-cell' : 'bg-line')} />}
                <span className={cx('relative grid size-6 shrink-0 place-items-center rounded-full border-2', st === 'done' ? 'border-cell bg-cell text-white' : st === 'live' ? (p.blocked ? 'border-bad bg-bad-soft' : 'border-sun bg-sun-soft') : 'border-line-strong bg-surface')}>
                  {st === 'done' && <CheckCircle2 size={14} />}
                  {st === 'live' && <span className={cx('size-2 rounded-full', p.blocked ? 'bg-bad' : 'bg-sun')} />}
                </span>
                <span className={cx('pt-0.5 text-sm', st === 'todo' ? 'text-ink-3' : 'font-medium text-ink')}>
                  {sub}
                  {st === 'live' && <span className="ml-2 text-[0.8125rem] font-normal text-sun-ink">{p.blocked ? 'blocked' : 'current'}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </Panel>

      <Panel title="Gate checklist" description={state === 'live' ? 'Required items must be done before the project moves on.' : state === 'done' ? 'Recorded when the stage was completed.' : 'Applies when the project reaches this stage.'}>
        <GateChecklist project={p} stageKey={stageKey} editable={editable && (state === 'live' || isAdminCheck())} />
      </Panel>

      <Panel title="Stage tasks" action={canEdit && state !== 'done' && <button className="btn btn-secondary btn-sm" onClick={onAddTask}><Plus size={15} /> Add task</button>} bodyClass="px-5 pb-2">
        {stageTasks.length === 0 ? <p className="pb-4 text-sm text-ink-3">No tasks for this stage.</p> : <ul className="divide-y divide-line">{stageTasks.map((t) => <TaskRow key={t.id} t={t} onOpen={onTask} />)}</ul>}
      </Panel>

      {stageEvents.length > 0 && (
        <Panel title="Stage movements"><Timeline events={stageEvents} /></Panel>
      )}
    </div>
  )
}

// Past-stage checklists stay editable only for admins (as a correction).
function isAdminCheck() {
  const s = useStore.getState()
  return s.users.find((u) => u.id === s.currentUserId)?.role === 'admin'
}
