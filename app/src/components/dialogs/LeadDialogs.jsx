import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { WON_CONDITIONS } from '@/lib/config'
import { useMe, useStore } from '@/lib/store'
import { daysFromToday, isAdmin, todayISO } from '@/lib/utils'
import { Callout, Checkbox, Field, Input, Modal, Select, Textarea, UserSelect } from '../ui'

const OUTCOMES = ['Positive', 'Positive, follow-up needed', 'Undecided', 'Needs revised quote', 'Not interested for now']

export function MeetingDialog({ lead, open, onOpenChange }) {
  const addMeeting = useStore((s) => s.addMeeting)
  const n = lead.meetings.length + 1
  const [f, setF] = useState({ date: todayISO(), outcome: OUTCOMES[0], comment: '', nextAction: '', nextDate: daysFromToday(5), scheduleSurvey: false, surveyor: 'u-pradeep', surveyDate: daysFromToday(3) })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const label = ['First', 'Second', 'Third', 'Fourth'][Math.min(n, 4) - 1] + ' meeting'

  const save = () => {
    const e = {}
    if (!f.comment.trim()) e.comment = 'Add what was discussed. Every stage change needs a comment.'
    if (!f.nextAction.trim()) e.nextAction = 'Enter the next action.'
    if (f.date > todayISO()) e.date = 'Meeting date cannot be in the future.'
    setErr(e)
    if (Object.keys(e).length) return
    addMeeting(lead.id, f)
    toast.success(`${label} logged`, { description: f.scheduleSurvey ? 'A survey task was created for the surveyor.' : `Next: ${f.nextAction}` })
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={n > 4 ? 'Log follow-up meeting' : `Log ${label.toLowerCase()}`}
      description={`Moves ${lead.contact} to Sales / ${label}.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Log meeting</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meeting date" error={err.date}><Input type="date" max={todayISO()} value={f.date} onChange={set('date')} /></Field>
        <Field label="Outcome"><Select value={f.outcome} onChange={set('outcome')} options={OUTCOMES} /></Field>
        <Field label="What was discussed" required error={err.comment} className="sm:col-span-2">
          <Textarea value={f.comment} onChange={set('comment')} placeholder="Customer questions, quote shared, objections…" aria-invalid={!!err.comment} />
        </Field>
        <Field label="Next action" required error={err.nextAction}><Input value={f.nextAction} onChange={set('nextAction')} aria-invalid={!!err.nextAction} /></Field>
        <Field label="Next action date"><Input type="date" value={f.nextDate} onChange={set('nextDate')} /></Field>
        <div className="sm:col-span-2 rounded-[10px] border border-line p-4">
          <Checkbox checked={f.scheduleSurvey} onChange={set('scheduleSurvey')} label="Schedule a site survey" description="Creates a survey task for the nominated surveyor." />
          {f.scheduleSurvey && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Surveyor"><UserSelect value={f.surveyor} onChange={set('surveyor')} /></Field>
              <Field label="Survey date"><Input type="date" value={f.surveyDate} onChange={set('surveyDate')} /></Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function WonDialog({ lead, open, onOpenChange }) {
  const me = useMe()
  const config = useStore((s) => s.config)
  const submitApproval = useStore((s) => s.submitApproval)
  const decideApproval = useStore((s) => s.decideApproval)
  const nav = useNavigate()
  const cond = config.settings.wonCondition
  const schemes = config.schemes.filter((s) => s.active && s.types.includes(lead.type))
  const [f, setF] = useState({ proposalAccepted: false, workOrder: false, advance: false, evidence: '', capacityKw: lead.estimatedKw || '', value: '', scheme: schemes[0]?.key || 'none', comment: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const admin = isAdmin(me)

  const closeOk =
    f.proposalAccepted &&
    (cond === 'workorder' ? f.workOrder : cond === 'advance' ? f.advance : f.workOrder || f.advance)

  const save = () => {
    if (!closeOk) return setErr(`Close evidence is incomplete. Required: ${WON_CONDITIONS.find((c) => c.key === cond).label.toLowerCase()}.`)
    if (!f.evidence.trim()) return setErr('Describe the evidence, for example the work order number or advance receipt.')
    if (!f.capacityKw || !f.value) return setErr('Enter the contracted capacity and project value.')
    const id = submitApproval('won', 'lead', lead.id, f)
    if (admin) {
      const pid = decideApproval(id, true, 'Approved by admin at request time.')
      toast.success('Marked as won', { description: `Project ${pid} created with the original lead history.` })
      onOpenChange(false)
      nav(`/projects/${pid}`)
    } else {
      toast.success('Won request sent', { description: 'An admin will review the close evidence. The lead stays in your pipeline until then.' })
      onOpenChange(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={admin ? 'Mark as won' : 'Request won'}
      description={`Approval creates a client project for ${lead.businessName || lead.contact} and keeps lead ${lead.id}’s source, owner and timeline.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>{admin ? 'Mark won and create project' : 'Send for approval'}</button></>}
    >
      <div className="grid gap-4">
        <Callout tone="cell" title="Won condition set by admin">{WON_CONDITIONS.find((c) => c.key === cond).label}.</Callout>
        <div className="grid gap-3 rounded-[10px] border border-line p-4">
          <Checkbox checked={f.proposalAccepted} onChange={set('proposalAccepted')} label="Customer accepted the proposal" />
          <Checkbox checked={f.workOrder} onChange={set('workOrder')} label="Signed work order received" />
          <Checkbox checked={f.advance} onChange={set('advance')} label="Advance payment confirmed" />
        </div>
        <Field label="Evidence reference" required hint="Store the actual document in the lead’s Drive folder.">
          <Input value={f.evidence} onChange={set('evidence')} placeholder="WO number, receipt number, or email date" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contracted capacity (kWp)" required><Input type="number" min="0" step="0.5" value={f.capacityKw} onChange={set('capacityKw')} /></Field>
          <Field label="Project value (₹)" required><Input type="number" min="0" step="1000" value={f.value} onChange={set('value')} /></Field>
        </div>
        <Field label="Scheme or portal path" hint="Disabled schemes are not shown. Admin enables them in Settings.">
          <Select value={f.scheme} onChange={set('scheme')} options={schemes.map((s) => ({ value: s.key, label: s.name }))} />
        </Field>
        <Field label="Comment"><Textarea value={f.comment} onChange={set('comment')} /></Field>
        {err && <p className="text-sm font-medium text-bad">{err}</p>}
      </div>
    </Modal>
  )
}

export function LossDialog({ lead, open, onOpenChange }) {
  const me = useMe()
  const reasons = useStore((s) => s.config.lossReasons)
  const submitApproval = useStore((s) => s.submitApproval)
  const decideApproval = useStore((s) => s.decideApproval)
  const [f, setF] = useState({ category: '', explanation: '', date: todayISO() })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const admin = isAdmin(me)

  const save = () => {
    const e = {}
    if (!f.category) e.category = 'Choose a reason category.'
    if (f.explanation.trim().length < 10) e.explanation = 'Explain what happened in a sentence or two.'
    setErr(e)
    if (Object.keys(e).length) return
    const id = submitApproval('loss', 'lead', lead.id, f)
    if (admin) {
      decideApproval(id, true, 'Recorded by admin.')
      toast.success('Lead closed as lost', { description: 'It now counts in loss KPIs.' })
    } else {
      toast.success('Loss request sent', { description: 'It counts as a loss only after admin approval.' })
    }
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={admin ? 'Close as lost' : 'Request loss approval'}
      description={admin ? 'Records an approved loss with today’s decision date.' : 'The lead stays active until an admin approves. Rejection keeps it in the pipeline.'}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-danger" onClick={save}>{admin ? 'Close as lost' : 'Send for approval'}</button></>}
    >
      <div className="grid gap-4">
        <Field label="Reason category" required error={err.category}>
          <Select value={f.category} onChange={set('category')} placeholder="Choose a reason" options={reasons} aria-invalid={!!err.category} />
        </Field>
        <Field label="Explanation" required error={err.explanation}>
          <Textarea value={f.explanation} onChange={set('explanation')} aria-invalid={!!err.explanation} placeholder="What did the customer say? Who did they choose?" />
        </Field>
        <Field label="Date the customer decided"><Input type="date" max={todayISO()} value={f.date} onChange={set('date')} /></Field>
      </div>
    </Modal>
  )
}

export function ReopenDialog({ lead, open, onOpenChange }) {
  const me = useMe()
  const submitApproval = useStore((s) => s.submitApproval)
  const decideApproval = useStore((s) => s.decideApproval)
  const [reason, setReason] = useState('')
  const admin = isAdmin(me)
  const save = () => {
    if (reason.trim().length < 5) return
    const id = submitApproval('reopen', 'lead', lead.id, { reason })
    if (admin) decideApproval(id, true, 'Reopened by admin.')
    toast.success(admin ? 'Lead reopened' : 'Reopen request sent')
    onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={admin ? 'Reopen lead' : 'Request reopen'} description="The loss stays in history; the lead returns to the active pipeline."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={reason.trim().length < 5} onClick={save}>{admin ? 'Reopen lead' : 'Send request'}</button></>}>
      <Field label="Why reopen?" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer called back, budget approved…" /></Field>
    </Modal>
  )
}

// Owner change for leads/projects, or installation owner for projects.
// Admins change directly with a reason; everyone else submits a request.
export function ReassignDialog({ entity, record, field = 'owner', open, onOpenChange }) {
  const me = useMe()
  const submitApproval = useStore((s) => s.submitApproval)
  const reassignOwner = useStore((s) => s.reassignOwner)
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const admin = isAdmin(me)
  const isInstall = field === 'installationOwner'
  const label = isInstall ? 'installation owner' : 'owner'

  const save = () => {
    if (!to || reason.trim().length < 5) return
    if (admin) {
      reassignOwner(entity, record.id, to, reason, field)
      toast.success(`${isInstall ? 'Installation owner' : 'Owner'} changed`, { description: 'The change is in the audit history.' })
    } else {
      submitApproval(isInstall ? 'installation_reassign' : 'owner_reassign', entity, record.id, { from: record[field], to, reason })
      toast.success('Reassignment request sent', { description: 'Nothing changes until an admin approves.' })
    }
    onOpenChange(false)
    setTo('')
    setReason('')
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={admin ? `Change ${label}` : `Request ${label} change`}
      description={admin ? 'Takes effect now and is logged with your reason.' : `The current ${label} stays in place until an admin approves.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={!to || reason.trim().length < 5} onClick={save}>{admin ? 'Change owner' : 'Send request'}</button></>}
    >
      <div className="grid gap-4">
        <Field label={`New ${label}`} required>
          <UserSelect value={to} onChange={setTo} filter={(u) => u.id !== record[field] && (!isInstall || u.team === 'Installation')} />
        </Field>
        <Field label="Reason" required hint="Recorded in the audit history.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

export function MergeDialog({ lead, candidates, open, onOpenChange }) {
  const mergeLeads = useStore((s) => s.mergeLeads)
  const nav = useNavigate()
  const [target, setTarget] = useState(candidates[0]?.record.id || '')
  const [reason, setReason] = useState('')
  const save = () => {
    mergeLeads(lead.id, target, reason || 'Duplicate enquiry.')
    toast.success('Leads merged', { description: `${lead.id} is now part of ${target}. Both histories are kept.` })
    onOpenChange(false)
    nav(`/leads/${target}`)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Merge duplicate" description={`${lead.id} will be closed as merged. Its meetings, tasks and history move to the record you keep.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={!target} onClick={save}>Merge into selected</button></>}>
      <div className="grid gap-4">
        <Field label="Keep this record">
          <Select value={target} onChange={(e) => setTarget(e.target.value)} options={candidates.filter((c) => c.kind === 'lead').map((c) => ({ value: c.record.id, label: `${c.record.id}, ${c.record.contact} (matches ${c.reasons.join(', ')})` }))} />
        </Field>
        <Field label="Note"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Same customer called twice" /></Field>
      </div>
    </Modal>
  )
}
