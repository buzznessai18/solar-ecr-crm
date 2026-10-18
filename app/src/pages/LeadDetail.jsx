import { AlertTriangle, ArrowLeft, CalendarPlus, Check, CheckCircle2, ExternalLink, GitMerge, Lock, MoreHorizontal, Pencil, PhoneCall, Plus, RotateCcw, Trophy, UserRoundCog, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DISTRICTS, LEAD_SOURCES } from '@/lib/config'
import { useMe, useStore, useUserName } from '@/lib/store'
import { canEditLead, canViewLead, cx, daysBetween, findDuplicates, fmtDate, fmtShortDate, isAdmin, relDays, todayISO } from '@/lib/utils'
import { StageString } from '@/components/StageString'
import { Timeline } from '@/components/Timeline'
import { Callout, Chip, EmptyState, Field, Input, KV, LeadStatus, Menu, Modal, Panel, Person, Select, TaskStatus, Textarea } from '@/components/ui'
import { LossDialog, MeetingDialog, MergeDialog, ReassignDialog, ReopenDialog, WonDialog } from '@/components/dialogs/LeadDialogs'
import { TaskDialog } from '@/components/dialogs/ProjectDialogs'
import NotFound, { NoAccess } from './NotFound'

function EditLeadDialog({ lead, open, onOpenChange }) {
  const updateLead = useStore((s) => s.updateLead)
  const [f, setF] = useState(lead)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = () => {
    const fields = ['contact', 'businessName', 'phone', 'email', 'address', 'district', 'taluka', 'consumerNo', 'source', 'referrer', 'estimatedKw', 'nextAction', 'nextActionDate']
    const patch = {}
    fields.forEach((k) => { if (f[k] !== lead[k]) patch[k] = f[k] })
    if (!Object.keys(patch).length) return onOpenChange(false)
    updateLead(lead.id, patch, `Updated ${Object.keys(patch).join(', ')}.`)
    toast.success('Lead updated')
    onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit lead details" width={620}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save changes</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {lead.type === 'commercial' && <Field label="Business name" className="sm:col-span-2"><Input value={f.businessName} onChange={set('businessName')} /></Field>}
        <Field label="Contact name"><Input value={f.contact} onChange={set('contact')} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
        <Field label="Email"><Input value={f.email} onChange={set('email')} /></Field>
        <Field label="Consumer number"><Input value={f.consumerNo} onChange={set('consumerNo')} /></Field>
        <Field label="Source"><Select value={f.source} onChange={set('source')} options={LEAD_SOURCES} /></Field>
        <Field label="Referred by"><Input value={f.referrer} onChange={set('referrer')} /></Field>
        <Field label="Site address" className="sm:col-span-2"><Textarea rows={2} className="!min-h-[3.5rem]" value={f.address} onChange={set('address')} /></Field>
        <Field label="District"><Select value={f.district} onChange={(e) => setF((x) => ({ ...x, district: e.target.value, taluka: DISTRICTS[e.target.value][0] }))} options={Object.keys(DISTRICTS)} /></Field>
        <Field label="Taluka"><Select value={f.taluka} onChange={set('taluka')} options={DISTRICTS[f.district]} /></Field>
        <Field label="Next action"><Input value={f.nextAction} onChange={set('nextAction')} /></Field>
        <Field label="Next action date"><Input type="date" value={f.nextActionDate} onChange={set('nextActionDate')} /></Field>
      </div>
    </Modal>
  )
}

function ContactedDialog({ lead, open, onOpenChange }) {
  const markContacted = useStore((s) => s.markContacted)
  const [c, setC] = useState('')
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Mark as contacted" description="Moves the lead to Lead / Contacted."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={c.trim().length < 5} onClick={() => { markContacted(lead.id, c); toast.success('Marked as contacted'); onOpenChange(false) }}>Mark contacted</button></>}>
      <Field label="What happened on the call?" required><Textarea value={c} onChange={(e) => setC(e.target.value)} /></Field>
    </Modal>
  )
}

export default function LeadDetail() {
  const { id } = useParams()
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const lead = state.leads.find((l) => l.id === id)
  const [dlg, setDlg] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const close = (v) => !v && setDlg(null)

  const dups = useMemo(() => (lead ? findDuplicates(state, lead, lead.id) : []), [state, lead])

  if (!lead) return <NotFound />
  if (!canViewLead(me, lead)) return <NoAccess what="lead" />
  if (lead.mergedInto) {
    return (
      <div className="panel">
        <EmptyState icon={GitMerge} title={`${lead.id} was merged`} action={<Link className="btn btn-primary" to={`/leads/${lead.mergedInto}`}>Open {lead.mergedInto}</Link>}>
          Its history now lives on the record it was merged into.
        </EmptyState>
      </div>
    )
  }

  const canEdit = canEditLead(me, lead)
  const admin = isAdmin(me)
  const open = lead.status === 'open'
  const tasks = state.tasks.filter((t) => t.leadId === lead.id)
  const events = state.events.filter((e) => (e.entity === 'lead' && e.entityId === lead.id) || e.parent === lead.id)
  const pending = state.approvals.filter((a) => a.entityId === lead.id && a.status === 'pending')
  const idle = daysBetween(lead.lastMovedAt)
  const stale = state.config.settings.staleDays
  const stages = state.config.stages
  const shownStage = lead.status === 'won' ? 'won' : lead.stage

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink"><ArrowLeft size={16} /> Leads</Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <LeadStatus status={lead.status} />
            <Chip tone="outline">{lead.type === 'commercial' ? 'Commercial' : 'Residential'}</Chip>
            {idle > stale && open && <Chip tone="warn" icon={AlertTriangle}>No movement for {idle} days</Chip>}
          </div>
          <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.015em] sm:text-[1.875rem]">{lead.businessName || lead.contact}</h1>
          <p className="mt-1 text-ink-2">{lead.id}, created {fmtDate(lead.createdAt)} by {name(lead.createdBy)}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {open && lead.substage === 'New' && <button className="btn btn-secondary" onClick={() => setDlg('contacted')}><PhoneCall size={16} /> Mark contacted</button>}
            {open && <button className="btn btn-secondary" onClick={() => setDlg('meeting')}><CalendarPlus size={16} /> Log meeting</button>}
            {open && lead.meetings.length > 0 && <button className="btn btn-primary" onClick={() => setDlg('won')}><Trophy size={16} /> {admin ? 'Mark won' : 'Request won'}</button>}
            {lead.status === 'lost' && <button className="btn btn-primary" onClick={() => setDlg('reopen')}><RotateCcw size={16} /> {admin ? 'Reopen' : 'Request reopen'}</button>}
            {lead.projectId && <Link className="btn btn-primary" to={`/projects/${lead.projectId}`}><ExternalLink size={16} /> Open project</Link>}
            <Menu
              trigger={<button className="btn btn-secondary btn-icon" aria-label="More actions"><MoreHorizontal size={18} /></button>}
              items={[
                { label: 'Edit details', icon: Pencil, onSelect: () => setDlg('edit') },
                { label: 'Add task', icon: Plus, onSelect: () => setDlg('task') },
                { label: admin ? 'Change owner' : 'Request owner change', icon: UserRoundCog, onSelect: () => setDlg('reassign') },
                admin && dups.some((d) => d.kind === 'lead') && { label: 'Merge duplicate', icon: GitMerge, onSelect: () => setDlg('merge') },
                open && '-',
                open && { label: admin ? 'Close as lost' : 'Request loss', icon: XCircle, danger: true, onSelect: () => setDlg('loss') },
              ]}
            />
          </div>
        )}
      </div>

      {pending.map((a) => (
        <div key={a.id} className="mb-4">
          <Callout tone="warn" title={`${{ won: 'Won', loss: 'Loss', reopen: 'Reopen', owner_reassign: 'Owner change' }[a.type]} request waiting for admin approval`}
            action={admin && <Link to={`/approvals?id=${a.id}`} className="btn btn-secondary btn-sm">Review</Link>}>
            Sent by {name(a.requestedBy)} on {fmtDate(a.requestedAt)}. {a.type === 'loss' ? 'The lead stays in the active pipeline and does not count as lost until approved.' : ''}
          </Callout>
        </div>
      ))}
      {dups.length > 0 && open && (
        <div className="mb-4">
          <Callout tone="cell" icon={GitMerge} title="Possible duplicate"
            action={admin && dups.some((d) => d.kind === 'lead') && <button className="btn btn-secondary btn-sm" onClick={() => setDlg('merge')}>Merge</button>}>
            {dups.map((d) => (
              <span key={d.record.id} className="block">
                <Link className="font-semibold text-cell hover:underline" to={d.kind === 'lead' ? `/leads/${d.record.id}` : `/projects/${d.record.id}`}>{d.record.id}</Link> matches on {d.reasons.join(' and ')}.
              </span>
            ))}
            {!admin && <span className="block">Ask an admin to merge them. History is kept.</span>}
          </Callout>
        </div>
      )}
      {lead.status === 'lost' && (
        <div className="mb-4"><Callout tone="bad" icon={XCircle} title={`Lost: ${lead.lostReason}`}>Approved on {fmtDate(lead.lostAt)}. Reopening keeps this decision in the history.</Callout></div>
      )}

      <section className="panel mb-5 px-3 pb-3 pt-4">
        <StageString stages={stages} current={shownStage} substage={lead.status === 'won' ? 'Won approved' : lead.substage} blocked={lead.status === 'lost'} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Next action" action={canEdit && open && <button className="btn btn-ghost btn-sm" onClick={() => setDlg('edit')}><Pencil size={14} /> Change</button>}>
            <div className="flex items-start gap-3">
              <span className={cx('mt-1 h-10 w-1 shrink-0 rounded-full', lead.nextActionDate && lead.nextActionDate < todayISO() ? 'bg-bad' : lead.nextActionDate === todayISO() ? 'bg-sun' : 'bg-cell')} />
              <div>
                <p className="font-semibold">{lead.nextAction || 'No next action set'}</p>
                {lead.nextActionDate && <p className={cx('text-sm', lead.nextActionDate < todayISO() ? 'font-semibold text-bad' : 'text-ink-3')}>{relDays(lead.nextActionDate)}, {fmtDate(lead.nextActionDate)}</p>}
              </div>
            </div>
          </Panel>

          <Panel title="Meetings" description={lead.type === 'commercial' ? 'Commercial leads can use all four meetings.' : 'Up to four sales meetings.'}
            action={canEdit && open && <button className="btn btn-secondary btn-sm" onClick={() => setDlg('meeting')}><Plus size={15} /> Log meeting</button>}>
            {lead.meetings.length === 0 ? (
              <EmptyState icon={CalendarPlus} title="No meetings yet" action={canEdit && open && <button className="btn btn-primary" onClick={() => setDlg('meeting')}>Log first meeting</button>}>
                Logging a meeting moves the lead into Sales.
              </EmptyState>
            ) : (
              <ol className="space-y-3">
                {lead.meetings.map((m) => (
                  <li key={m.n} className="rounded-[12px] border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{['First', 'Second', 'Third', 'Fourth'][m.n - 1] || `Meeting ${m.n}`} meeting</p>
                      <span className="text-sm text-ink-3">{fmtDate(m.date)}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-good">{m.outcome}</p>
                    <p className="mt-2 text-sm text-ink-2">{m.comment}</p>
                    {m.nextAction && <p className="mt-2 text-[0.8125rem] text-ink-3">Next: {m.nextAction}{m.nextDate ? `, by ${fmtShortDate(m.nextDate)}` : ''}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="History" description="Every change, request and decision. History cannot be edited.">
            <Timeline events={events} />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Contact and site" action={canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setDlg('edit')}><Pencil size={14} /> Edit</button>}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <KV label="Contact">{lead.contact}</KV>
              <KV label="Phone"><a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="text-cell hover:underline">{lead.phone}</a></KV>
              <KV label="Email" className="col-span-2">{lead.email || '—'}</KV>
              <KV label="Site address" className="col-span-2">{lead.address}</KV>
              <KV label="Taluka">{lead.taluka}</KV>
              <KV label="District">{lead.district}</KV>
              <KV label="Consumer number">{lead.consumerNo || '—'}</KV>
              <KV label="Estimated size">{lead.estimatedKw ? `${lead.estimatedKw} kWp` : '—'}</KV>
              <KV label="Source">{lead.source}</KV>
              <KV label="Referred by">{lead.referrer || '—'}</KV>
            </dl>
          </Panel>

          <Panel title="Owner">
            <Person userId={lead.owner} sub={state.users.find((u) => u.id === lead.owner)?.title} size={36} />
            {lead.surveyRequested && (
              <div className="mt-4 rounded-[10px] bg-paper p-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold"><Check size={15} className="text-good" /> Survey requested</p>
                <p className="text-ink-3">Surveyor: {name(lead.surveyor)}. Final survey and design happen after Won.</p>
              </div>
            )}
            {!canEdit && <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3"><Lock size={14} /> You can view but not change this lead.</p>}
          </Panel>

          <Panel title="Tasks" action={canEdit && <button className="btn btn-secondary btn-sm" onClick={() => setDlg('task')}><Plus size={15} /> Add task</button>} bodyClass="px-5 pb-2">
            {tasks.length === 0 ? (
              <p className="pb-4 text-sm text-ink-3">No tasks on this lead.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <button className="flex w-full items-start gap-3 py-3 text-left" onClick={() => setEditTask(t)}>
                      {t.status === 'Completed' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-good" /> : <span className="mt-1 size-4 shrink-0 rounded-full border-2 border-line-strong" />}
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm font-medium', t.status === 'Completed' && 'text-ink-3 line-through')}>{t.title}</span>
                        <span className="block text-[0.8125rem] text-ink-3">{name(t.assignee)}, {relDays(t.due).toLowerCase()}</span>
                      </span>
                      <TaskStatus status={t.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {dlg === 'meeting' && <MeetingDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'won' && <WonDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'loss' && <LossDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'reopen' && <ReopenDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'reassign' && <ReassignDialog entity="lead" record={lead} open onOpenChange={close} />}
      {dlg === 'merge' && <MergeDialog lead={lead} candidates={dups} open onOpenChange={close} />}
      {dlg === 'edit' && <EditLeadDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'contacted' && <ContactedDialog lead={lead} open onOpenChange={close} />}
      {dlg === 'task' && <TaskDialog leadId={lead.id} defaultStage="sales" open onOpenChange={close} />}
      {editTask && <TaskDialog task={editTask} open onOpenChange={(v) => !v && setEditTask(null)} />}
    </>
  )
}
