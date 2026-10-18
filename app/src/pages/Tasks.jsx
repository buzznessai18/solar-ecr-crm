import { CheckCircle2, CheckSquare, Circle, Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useMe, useStore, useUserName } from '@/lib/store'
import { canUpdateTask, cx, downloadCSV, fmtDate, isAdmin, relDays, taskBuckets, todayISO, visibleTasks } from '@/lib/utils'
import { EmptyState, Input, PageHeader, Person, Priority, Select, TaskStatus } from '@/components/ui'
import { TaskDialog } from '@/components/dialogs/ProjectDialogs'

const QUEUES = [
  ['open', 'All open'],
  ['overdue', 'Overdue'],
  ['today', 'Due today'],
  ['soon', 'Next 7 days'],
  ['waiting', 'Waiting'],
  ['blocked', 'Blocked'],
  ['review', 'Under review'],
  ['done', 'Completed'],
]

export default function Tasks() {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const updateTask = useStore((s) => s.updateTask)
  const logExport = useStore((s) => s.logExport)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const admin = isAdmin(me)

  const queue = params.get('queue') || 'open'
  const assignee = params.get('assignee') ?? (admin ? '' : me.id)
  const stage = params.get('stage') || ''
  const setParam = (k) => (e) => {
    const v = e?.target ? e.target.value : e
    const n = new URLSearchParams(params)
    n.set(k, v)
    if (!v && k !== 'assignee') n.delete(k)
    setParams(n, { replace: true })
  }

  const scoped = useMemo(() => {
    let list = visibleTasks(state, me)
    if (assignee) list = list.filter((t) => t.assignee === assignee)
    if (stage) list = list.filter((t) => t.stage === stage)
    const s = q.trim().toLowerCase()
    if (s) {
      list = list.filter((t) => {
        const parent = t.projectId ? state.projects.find((p) => p.id === t.projectId) : state.leads.find((l) => l.id === t.leadId)
        return [t.title, t.id, t.projectId, t.leadId, parent?.client, parent?.contact].some((v) => String(v || '').toLowerCase().includes(s))
      })
    }
    return list
  }, [state, me, assignee, stage, q])

  const b = taskBuckets(scoped)
  const counts = { ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.length])), done: scoped.filter((t) => t.status === 'Completed').length }
  const rows = (queue === 'done' ? scoped.filter((t) => t.status === 'Completed') : b[queue] || b.open)
    .slice()
    .sort((x, y) => (queue === 'done' ? (x.completedAt < y.completedAt ? 1 : -1) : x.due < y.due ? -1 : 1))

  const parentOf = (t) => {
    if (t.projectId) {
      const p = state.projects.find((x) => x.id === t.projectId)
      return { label: p?.client, sub: t.projectId, to: `/projects/${t.projectId}` }
    }
    const l = state.leads.find((x) => x.id === t.leadId)
    return { label: l?.businessName || l?.contact, sub: t.leadId, to: `/leads/${t.leadId}` }
  }

  const quickComplete = (t) => {
    if (t.requiresDrive) return setEdit(t)
    updateTask(t.id, { status: t.status === 'Completed' ? 'In Progress' : 'Completed' })
    toast.success(t.status === 'Completed' ? 'Task reopened' : 'Task completed', { description: t.title })
  }

  const exportRows = () => {
    downloadCSV(`ecorays-tasks-${todayISO()}.csv`, rows.map((t) => ({
      'Task ID': t.id, Title: t.title, Project: t.projectId || '', Lead: t.leadId || '', Stage: t.stage, Assignee: name(t.assignee),
      Due: t.due, Priority: t.priority, Status: t.status, 'Blocked or waiting on': t.blocker, Completed: t.completedAt,
    })))
    logExport('tasks', rows.length)
    toast.success(`Exported ${rows.length} tasks`)
  }

  return (
    <>
      <PageHeader
        title={admin ? 'Tasks' : 'My tasks'}
        description={admin ? 'Every task across the company. Overdue and due-soon queues stand in for reminders in this release.' : 'Tasks assigned to you, and tasks on records you own.'}
        actions={admin && <button className="btn btn-secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Export</button>}
      />

      <div className="scroll-x mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5" role="tablist" aria-label="Task queues">
          {QUEUES.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={queue === k} onClick={() => setParam('queue')(k)}
              className={cx('flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold',
                queue === k ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-surface')}>
              {label}
              <span className={cx('tabular-nums', queue === k ? 'opacity-70' : k === 'overdue' && counts.overdue ? 'text-bad' : 'opacity-60')}>{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Task, client or ID" className="!pl-9" aria-label="Filter tasks" />
        </div>
        <Select className="!w-auto" value={assignee} onChange={setParam('assignee')} placeholder={admin ? 'Everyone' : 'All I can see'} options={state.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.id === me.id ? `${u.name} (you)` : u.name }))} aria-label="Assignee" />
        <Select className="!w-auto" value={stage} onChange={setParam('stage')} placeholder="Any stage" options={state.config.stages.map((s) => ({ value: s.key, label: s.name }))} aria-label="Stage" />
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <EmptyState icon={CheckSquare} title={queue === 'overdue' ? 'Nothing overdue' : 'No tasks in this queue'}>
            {queue === 'overdue' ? 'Every open task is on schedule.' : 'Try another queue or widen the filters.'}
          </EmptyState>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((t) => {
              const par = parentOf(t)
              const can = canUpdateTask(state, me, t)
              const overdue = t.status !== 'Completed' && t.due < todayISO()
              return (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <button
                    className={cx('mt-0.5 shrink-0 rounded-full', !can && 'cursor-not-allowed opacity-40')}
                    disabled={!can}
                    onClick={() => quickComplete(t)}
                    aria-label={t.status === 'Completed' ? `Reopen ${t.title}` : `Complete ${t.title}`}
                    title={t.requiresDrive && t.status !== 'Completed' ? 'Needs a Drive link check before completing' : undefined}
                  >
                    {t.status === 'Completed' ? <CheckCircle2 size={20} className="text-good" /> : <Circle size={20} className="text-line-strong hover:text-cell" />}
                  </button>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(t)}>
                    <span className={cx('block font-medium', t.status === 'Completed' && 'text-ink-3 line-through')}>{t.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-ink-3">
                      <Link to={par.to} onClick={(e) => e.stopPropagation()} className="font-medium text-ink-2 hover:text-cell">{par.label}</Link>, {par.sub}, {state.config.stages.find((s) => s.key === t.stage)?.short}
                    </span>
                    {t.blocker && t.status !== 'Completed' && <span className="mt-0.5 block text-[0.8125rem] text-wait">{t.status === 'Blocked' ? 'Blocked by' : 'Waiting on'}: {t.blocker}</span>}
                  </button>
                  <div className="hidden w-[170px] shrink-0 md:block"><Person userId={t.assignee} size={22} /></div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:w-[150px]">
                    <span className={cx('text-[0.8125rem] font-semibold', overdue ? 'text-bad' : t.due === todayISO() ? 'text-sun-ink' : 'text-ink-2')}>
                      {t.status === 'Completed' ? `Done ${fmtDate(t.completedAt)}` : relDays(t.due)}
                    </span>
                    <span className="flex gap-1"><TaskStatus status={t.status} />{t.status !== 'Completed' && <span className="hidden sm:inline"><Priority value={t.priority} /></span>}</span>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[0.8125rem] text-ink-3">{rows.length} tasks</p>
        </div>
      )}
      {edit && <TaskDialog task={edit} open onOpenChange={(v) => !v && setEdit(null)} />}
    </>
  )
}
