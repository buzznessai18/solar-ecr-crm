import { ArrowRight, CheckCircle2, ClipboardCheck, Trophy, UserRoundCog, XCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useMe, useStore, useUserName } from '@/lib/store'
import { cx, fmtDate, fmtDateTime, fmtINR, fmtKw, isAdmin } from '@/lib/utils'
import { Callout, Chip, EmptyState, Field, KV, PageHeader, Panel, Person, Segmented, Textarea } from '@/components/ui'

const TYPE = {
  won: ['Won', Trophy, 'good'],
  loss: ['Loss', XCircle, 'bad'],
  reopen: ['Reopen', RotateCcw, 'cell'],
  installation_reassign: ['Installation owner change', UserRoundCog, 'wait'],
  owner_reassign: ['Owner change', UserRoundCog, 'wait'],
}

function recordOf(state, a) {
  if (a.entity === 'lead') {
    const l = state.leads.find((x) => x.id === a.entityId)
    return { title: l?.businessName || l?.contact, sub: a.entityId, to: `/leads/${a.entityId}`, owner: l?.owner }
  }
  const p = state.projects.find((x) => x.id === a.entityId)
  return { title: p?.client, sub: a.entityId, to: `/projects/${a.entityId}`, owner: p?.owner }
}

function Detail({ a, onDone }) {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const decide = useStore((s) => s.decideApproval)
  const nav = useNavigate()
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const rec = recordOf(state, a)
  const [label, Icon, tone] = TYPE[a.type]
  const admin = isAdmin(me)
  const scheme = state.config.schemes.find((s) => s.key === a.payload.scheme)

  const act = (approve) => {
    if (comment.trim().length < 3) return setErr('Add a decision comment. It is saved with the decision.')
    const pid = decide(a.id, approve, comment)
    toast.success(`${label} ${approve ? 'approved' : 'rejected'}`, {
      description: a.type === 'won' && approve ? `Project ${pid} created.` : a.type === 'loss' && !approve ? 'The record stays in the active pipeline.' : undefined,
    })
    setComment('')
    setErr('')
    if (a.type === 'won' && approve && pid) nav(`/projects/${pid}`)
    else onDone?.()
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Icon size={18} className={tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-wait'} />{label} request</span>}
      description={`${a.id}, sent ${fmtDateTime(a.requestedAt)}`}
      action={<Chip tone={a.status === 'pending' ? 'sun' : a.status === 'approved' ? 'good' : 'bad'}>{a.status === 'pending' ? 'Pending' : a.status === 'approved' ? 'Approved' : 'Rejected'}</Chip>}
    >
      <div className="grid gap-5">
        <Link to={rec.to} className="flex items-center justify-between gap-3 rounded-[12px] border border-line p-4 hover:border-line-strong">
          <span className="min-w-0">
            <span className="block font-semibold">{rec.title}</span>
            <span className="block text-[0.8125rem] text-ink-3">{rec.sub}, owned by {name(rec.owner)}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-ink-3" />
        </Link>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <KV label="Requested by"><Person userId={a.requestedBy} size={22} /></KV>
          {a.type === 'won' && (
            <>
              <KV label="Close evidence">{a.payload.evidence}</KV>
              <KV label="Proposal accepted">{a.payload.proposalAccepted ? 'Yes' : 'No'}</KV>
              <KV label="Work order or advance">{[a.payload.workOrder && 'Signed work order', a.payload.advance && 'Advance confirmed'].filter(Boolean).join(', ') || 'None'}</KV>
              <KV label="Capacity and value">{fmtKw(a.payload.capacityKw)}, {fmtINR(a.payload.value)}</KV>
              <KV label="Scheme">{scheme?.name}</KV>
            </>
          )}
          {a.type === 'loss' && (
            <>
              <KV label="Reason category">{a.payload.category}</KV>
              <KV label="Customer decided on">{fmtDate(a.payload.date)}</KV>
              <KV label="Explanation" className="sm:col-span-2">{a.payload.explanation}</KV>
            </>
          )}
          {(a.type === 'installation_reassign' || a.type === 'owner_reassign') && (
            <>
              <KV label="Change">{name(a.payload.from)} to {name(a.payload.to)}</KV>
              <KV label="Reason" className="sm:col-span-2">{a.payload.reason}</KV>
            </>
          )}
          {a.type === 'reopen' && <KV label="Reason" className="sm:col-span-2">{a.payload.reason}</KV>}
          {a.payload.comment && <KV label="Comment" className="sm:col-span-2">{a.payload.comment}</KV>}
        </dl>

        {a.status !== 'pending' ? (
          <Callout tone={a.status === 'approved' ? 'good' : 'bad'} icon={a.status === 'approved' ? CheckCircle2 : XCircle} title={`${a.status === 'approved' ? 'Approved' : 'Rejected'} by ${name(a.decidedBy)} on ${fmtDate(a.decidedAt)}`}>
            {a.decisionComment}
          </Callout>
        ) : admin ? (
          <div className="grid gap-3 border-t border-line pt-5">
            {a.type === 'loss' && <p className="text-sm text-ink-2">Approval counts this in loss KPIs from today. Rejection keeps the record in the active pipeline.</p>}
            {a.type === 'won' && <p className="text-sm text-ink-2">Approval creates one client project and keeps the lead’s source, owner and history.</p>}
            <Field label="Decision comment" required error={err}>
              <Textarea value={comment} onChange={(e) => { setComment(e.target.value); setErr('') }} placeholder="Why you approved or rejected" />
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn btn-secondary" onClick={() => act(false)}>Reject</button>
              <button className="btn btn-primary" onClick={() => act(true)}>Approve</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Waiting for an admin. You will see the decision here.</p>
        )}
      </div>
    </Panel>
  )
}

export default function Approvals() {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('pending')
  const admin = isAdmin(me)
  const mine = state.approvals.filter((a) => admin || a.requestedBy === me.id)
  const list = mine.filter((a) => (tab === 'pending' ? a.status === 'pending' : a.status !== 'pending')).sort((x, y) => (x.requestedAt < y.requestedAt ? 1 : -1))
  const selId = params.get('id') || list[0]?.id
  const sel = state.approvals.find((a) => a.id === selId && mine.includes(a))

  return (
    <>
      <PageHeader title="Approvals" description={admin ? 'Won, loss, reopen and reassignment requests. Nothing changes until you decide.' : 'Requests you have sent to an admin.'} />
      <div className="mb-4">
        <Segmented value={tab} onChange={(v) => { setTab(v); setParams({}) }} options={[{ value: 'pending', label: `Pending (${mine.filter((a) => a.status === 'pending').length})` }, { value: 'decided', label: 'Decided' }]} />
      </div>
      {list.length === 0 ? (
        <div className="panel"><EmptyState icon={ClipboardCheck} title={tab === 'pending' ? 'No pending requests' : 'No decisions yet'}>{admin ? 'New requests from the team will appear here.' : 'Requests you send from a lead or project appear here.'}</EmptyState></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <ul className="panel h-fit divide-y divide-line overflow-hidden">
            {list.map((a) => {
              const rec = recordOf(state, a)
              const [label, Icon] = TYPE[a.type]
              return (
                <li key={a.id}>
                  <button onClick={() => setParams({ id: a.id })} className={cx('flex w-full items-start gap-3 px-4 py-3.5 text-left', sel?.id === a.id ? 'bg-cell-soft' : 'hover:bg-[#f7f9f8]')}>
                    <Icon size={18} className="mt-0.5 shrink-0 text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}: {rec.title}</span>
                      <span className="block text-[0.8125rem] text-ink-3">{name(a.requestedBy)}, {fmtDate(a.requestedAt)}</span>
                    </span>
                    {a.status !== 'pending' && <Chip tone={a.status === 'approved' ? 'good' : 'bad'}>{a.status === 'approved' ? 'Approved' : 'Rejected'}</Chip>}
                  </button>
                </li>
              )
            })}
          </ul>
          {sel ? <Detail key={sel.id} a={sel} onDone={() => setParams({})} /> : <div className="panel"><EmptyState title="Select a request" /></div>}
        </div>
      )}
    </>
  )
}
