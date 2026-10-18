import { Lock, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DRIVE_FOLDERS, PRIORITIES, PROJECT_STAGE_KEYS, TASK_STATUSES } from '@/lib/config'
import { useMe, useStore } from '@/lib/store'
import { canUpdateTask, cx, daysFromToday, gateBlockers, isAdmin, isValidDriveUrl, todayISO } from '@/lib/utils'
import { Callout, Checkbox, Field, Input, Modal, Select, Textarea, UserSelect } from '../ui'

export function MoveStageDialog({ project, open, onOpenChange }) {
  const me = useMe()
  const state = useStore()
  const moveProject = useStore((s) => s.moveProject)
  const stages = state.config.stages.filter((s) => PROJECT_STAGE_KEYS.includes(s.key))
  const admin = isAdmin(me)
  const cur = stages.find((s) => s.key === project.stage)
  const curIdx = stages.indexOf(cur)
  const subIdx = cur.substages.indexOf(project.substage)

  // Default target: next substage, else first substage of next stage.
  const defaultTarget = subIdx < cur.substages.length - 1
    ? `${cur.key}|${cur.substages[subIdx + 1]}`
    : stages[curIdx + 1] ? `${stages[curIdx + 1].key}|${stages[curIdx + 1].substages[0]}` : ''

  const [target, setTarget] = useState(defaultTarget)
  const [comment, setComment] = useState('')
  const [override, setOverride] = useState('')
  const [err, setErr] = useState('')

  const options = useMemo(() => {
    const out = []
    stages.forEach((s, i) => {
      s.substages.forEach((sub, j) => {
        const isCurrent = s.key === project.stage && sub === project.substage
        const forwardOk = i === curIdx || i === curIdx + 1 && j === 0
        const allowed = admin || forwardOk
        if (isCurrent) return
        out.push({ value: `${s.key}|${sub}`, label: `${s.name} / ${sub}${!allowed ? ' (admin only)' : ''}`, disabled: !allowed, group: s.name })
      })
    })
    return out
  }, [stages, project, admin, curIdx])

  const [tStage, tSub] = target.split('|')
  const tIdx = stages.findIndex((s) => s.key === tStage)
  const leaving = tIdx > curIdx
  const backward = tIdx < curIdx || (tIdx === curIdx && cur.substages.indexOf(tSub) < subIdx)
  const skipping = tIdx > curIdx + 1
  const gate = gateBlockers(state, project)
  const needsOverride = (leaving && !gate.ok) || backward || skipping

  const save = () => {
    if (!target) return setErr('Choose where the project moves.')
    if (comment.trim().length < 5) return setErr('Add a dated comment explaining the change.')
    if (needsOverride && !admin) return setErr('The gate is not complete. Finish the checklist or ask an admin to override.')
    if (needsOverride && override.trim().length < 5) return setErr('Enter an override reason. It is logged in the audit history.')
    moveProject(project.id, { stage: tStage, substage: tSub, comment, overrideReason: needsOverride ? override : undefined })
    toast.success('Project moved', { description: `${stages[tIdx].name} / ${tSub}` })
    onOpenChange(false)
    setComment('')
    setOverride('')
    setErr('')
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Move project"
      description={`Now at ${cur.name} / ${project.substage}. Only the project owner or an admin can move it.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className={cx('btn', needsOverride ? 'btn-danger' : 'btn-primary')} onClick={save} disabled={needsOverride && !admin}>{needsOverride ? 'Override and move' : 'Move project'}</button></>}
    >
      <div className="grid gap-4">
        <Field label="Move to">
          <Select value={target} onChange={(e) => { setTarget(e.target.value); setErr('') }} options={options} />
        </Field>

        {leaving && !gate.ok && (
          <Callout tone={admin ? 'warn' : 'bad'} icon={Lock} title={`The ${cur.name.toLowerCase()} gate is not complete`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {gate.missing.map((m) => <li key={m.key}>{m.label}</li>)}
              {gate.openTasks.map((t) => <li key={t.id}>Open required task: {t.title}</li>)}
            </ul>
          </Callout>
        )}
        {(backward || skipping) && (
          <Callout tone="warn" icon={ShieldAlert} title={backward ? 'Moving backwards' : 'Skipping a stage'}>
            This is an admin override and is logged with your reason.
          </Callout>
        )}

        <Field label="Comment" required hint={`Saved as ${me.name}, ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST. Cannot be backdated.`}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What happened and what comes next" />
        </Field>
        {needsOverride && admin && (
          <Field label="Override reason" required>
            <Textarea value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Why the gate is being bypassed" />
          </Field>
        )}
        {err && <p className="text-sm font-medium text-bad">{err}</p>}
      </div>
    </Modal>
  )
}

export function BlockDialog({ project, open, onOpenChange }) {
  const setBlock = useStore((s) => s.setBlock)
  const [f, setF] = useState({ kind: 'Blocked', waitingOn: '', nextAction: '', party: project.owner, reviewDate: daysFromToday(3) })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const save = () => {
    if (!f.waitingOn.trim() || !f.nextAction.trim() || !f.party || !f.reviewDate) return setErr('All four fields are required for a paused project.')
    setBlock(project.id, f)
    toast.success(`Project marked ${f.kind.toLowerCase()}`, { description: `Review on ${f.reviewDate}.` })
    onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Pause project" description="A paused project needs a blocker, next action, responsible person and review date."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Pause project</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status"><Select value={f.kind} onChange={set('kind')} options={['Blocked', 'Waiting']} /></Field>
        <Field label="Review date" required><Input type="date" min={todayISO()} value={f.reviewDate} onChange={set('reviewDate')} /></Field>
        <Field label={f.kind === 'Blocked' ? 'Blocked by' : 'Waiting on'} required className="sm:col-span-2"><Input value={f.waitingOn} onChange={set('waitingOn')} placeholder="Supplier dispatch, customer documents, DISCOM…" /></Field>
        <Field label="Next action" required className="sm:col-span-2"><Input value={f.nextAction} onChange={set('nextAction')} /></Field>
        <Field label="Responsible person" required className="sm:col-span-2"><UserSelect value={f.party} onChange={set('party')} /></Field>
        {err && <p className="text-sm font-medium text-bad sm:col-span-2">{err}</p>}
      </div>
    </Modal>
  )
}

export function TaskDialog({ open, onOpenChange, task, projectId, leadId, defaultStage }) {
  const me = useMe()
  const state = useStore()
  const createTask = useStore((s) => s.createTask)
  const updateTask = useStore((s) => s.updateTask)
  const editing = !!task
  const parentProject = state.projects.find((p) => p.id === (task?.projectId || projectId))
  const admin = isAdmin(me)
  const canAssign = admin || parentProject?.owner === me.id || state.leads.find((l) => l.id === (task?.leadId || leadId))?.owner === me.id
  const canEdit = editing ? canUpdateTask(state, me, task) : true

  const [f, setF] = useState(() => task
    ? { ...task, comment: '' }
    : { title: '', stage: defaultStage || parentProject?.stage || 'sales', assignee: me.id, due: daysFromToday(3), priority: 'Medium', required: false, requiresDrive: false, status: 'To Do', blocker: '', comment: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const stageOpts = state.config.stages.filter((s) => (projectId || task?.projectId ? PROJECT_STAGE_KEYS.includes(s.key) : ['lead', 'sales'].includes(s.key))).map((s) => ({ value: s.key, label: s.name }))
  const pausing = ['Blocked', 'Waiting'].includes(f.status)
  const needsDriveLink = f.requiresDrive && f.status === 'Completed'
  const folderKey = { won: 'sales', survey: 'survey', docs: 'docs', procurement: 'procurement', installation: 'installation', post: 'approvals', commissioning: 'handover', om: 'handover' }[f.stage]
  const hasFolder = parentProject?.drive.stages?.[folderKey] || parentProject?.drive.root

  const save = () => {
    if (!f.title.trim()) return setErr('Enter a task title.')
    if (!f.assignee) return setErr('Assign the task to one person.')
    if (!f.due) return setErr('Set a due date.')
    if (pausing && !f.blocker.trim()) return setErr(`Say what the task is ${f.status === 'Blocked' ? 'blocked by' : 'waiting on'}.`)
    if (needsDriveLink && !hasFolder) return setErr('This task needs a Drive folder link before it can be completed. Link the stage folder on the Drive tab first.')
    if (editing) {
      const patch = { status: f.status, due: f.due, blocker: pausing ? f.blocker : '', priority: f.priority }
      if (canAssign) Object.assign(patch, { assignee: f.assignee, title: f.title })
      updateTask(task.id, patch, f.comment.trim() || undefined)
      toast.success(f.status === 'Completed' && task.status !== 'Completed' ? 'Task completed' : 'Task updated')
    } else {
      createTask({ ...f, projectId, leadId })
      toast.success('Task assigned', { description: `${state.users.find((u) => u.id === f.assignee)?.name} can now see it in their tasks.` })
    }
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Update task' : 'New task'}
      description={editing ? `${task.id}${task.projectId ? `, ${task.projectId}` : task.leadId ? `, ${task.leadId}` : ''}` : 'Assigning a task does not change who owns the project.'}
      footer={canEdit ? <><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing ? 'Save task' : 'Assign task'}</button></> : null}
    >
      {!canEdit ? (
        <Callout tone="bad" icon={Lock} title="You can view this task but not change it">Only the assignee, the project owner or an admin can update it.</Callout>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input value={f.title} onChange={set('title')} disabled={editing && !canAssign} />
          </Field>
          <Field label="Stage"><Select value={f.stage} onChange={set('stage')} options={stageOpts} disabled={editing} /></Field>
          <Field label="Assignee" required hint={!canAssign ? 'Only the owner or an admin can reassign.' : undefined}>
            <UserSelect value={f.assignee} onChange={set('assignee')} disabled={!canAssign} />
          </Field>
          <Field label="Due date" required><Input type="date" value={f.due} onChange={set('due')} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={set('priority')} options={PRIORITIES} /></Field>
          {editing && (
            <Field label="Status" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {TASK_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => set('status')(s)}
                    className={cx('rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold', f.status === s ? 'border-cell bg-cell text-white' : 'border-line-strong text-ink-2 hover:bg-sunken')}
                    aria-pressed={f.status === s}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {pausing && (
            <Field label={f.status === 'Blocked' ? 'Blocked by' : 'Waiting on'} required className="sm:col-span-2">
              <Input value={f.blocker} onChange={set('blocker')} placeholder="Who or what is holding this up" />
            </Field>
          )}
          {!editing && (
            <div className="grid gap-3 sm:col-span-2">
              <Checkbox checked={f.required} onChange={set('required')} label="Required to leave this stage" description="The project cannot move forward until this task is completed." />
              <Checkbox checked={f.requiresDrive} onChange={set('requiresDrive')} label="Needs a Drive folder link to complete" />
            </div>
          )}
          {needsDriveLink && (
            <div className="sm:col-span-2">
              <Callout tone={hasFolder ? 'good' : 'warn'} title={hasFolder ? 'Drive folder is linked' : 'Drive folder missing'}>
                {hasFolder ? 'Confirm the files are uploaded to the stage folder before completing.' : 'Link the stage folder before completing this task.'}
              </Callout>
            </div>
          )}
          {editing && (
            <Field label="Comment" className="sm:col-span-2" hint="Optional; appears in the task history.">
              <Textarea value={f.comment} onChange={set('comment')} />
            </Field>
          )}
          {editing && task.comments.length > 0 && (
            <div className="sm:col-span-2">
              <p className="field-label">Earlier comments</p>
              <ul className="space-y-2">
                {task.comments.map((c) => (
                  <li key={c.id} className="rounded-[8px] bg-paper px-3 py-2 text-sm">
                    <span className="font-semibold">{state.users.find((u) => u.id === c.by)?.name}</span>
                    <span className="text-ink-3">, {new Date(c.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <p className="mt-0.5 text-ink-2">{c.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {err && <p className="text-sm font-medium text-bad sm:col-span-2">{err}</p>}
        </div>
      )}
    </Modal>
  )
}

export function DriveLinkDialog({ project, folderKey, open, onOpenChange }) {
  const setDriveLink = useStore((s) => s.setDriveLink)
  const current = folderKey === 'root' ? project.drive.root : project.drive.stages[folderKey]
  const [url, setUrl] = useState(current || '')
  const name = folderKey === 'root' ? 'Project root folder' : DRIVE_FOLDERS.find((f) => f.key === folderKey)?.name
  const valid = isValidDriveUrl(url)
  const save = () => {
    if (!valid) return
    setDriveLink(project.id, folderKey, url.trim())
    toast.success('Drive link saved', { description: name })
    onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={current ? 'Repair Drive link' : 'Link Drive folder'} description={`${name} for ${project.id}. Only the link is stored; files stay in Google Drive.`}
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={save}>Save link</button></>}>
      <div className="grid gap-4">
        <Field label="Folder URL" error={url && !valid ? 'Paste a Google Drive folder or file link, starting with https://drive.google.com/' : undefined} hint="Use the company Shared Drive. Avoid public “anyone with the link” sharing.">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" aria-invalid={!!url && !valid} />
        </Field>
        <p className="text-[0.8125rem] text-ink-3">Suggested folder name: <span className="font-semibold text-ink-2">{project.id} {project.client.split(' ').slice(0, 2).join(' ')}</span></p>
      </div>
    </Modal>
  )
}

export function ArchiveDialog({ project, open, onOpenChange, onDone }) {
  const archiveProject = useStore((s) => s.archiveProject)
  const [reason, setReason] = useState('')
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Archive project" description="Projects are never deleted. Archiving hides it from active lists and keeps every event in the audit history."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-danger" disabled={reason.trim().length < 5} onClick={() => { archiveProject(project.id, reason); toast.success('Project archived'); onOpenChange(false); onDone?.() }}>Archive project</button></>}>
      <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  )
}
