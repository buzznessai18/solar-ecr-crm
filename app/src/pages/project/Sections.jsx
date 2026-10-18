import { AlertTriangle, CheckCircle2, ExternalLink, FolderOpen, FolderPlus, FolderX, Link2, Loader2, Plus, ShieldCheck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DOC_STATUS, DRIVE_FOLDERS, FEASIBILITY, LOAN_STATUS, MILESTONE_STATUS, PORTAL_STATUS, SUBSIDY_STATUS, UTILITY_MILESTONES, VENDOR_AGREEMENT } from '@/lib/config'
import { useMe, useStore, useUserName } from '@/lib/store'
import { cx, daysFromToday, fmtDate, isAdmin, isValidDriveUrl, todayISO } from '@/lib/utils'
import { SectionForm } from '@/components/SectionForm'
import { Callout, Checkbox, Field, Input, Modal, Panel, Select, StatusChip, Textarea, UserSelect } from '@/components/ui'
import { DriveLinkDialog } from '@/components/dialogs/ProjectDialogs'

// ---------------- survey ----------------

export function SurveyTab({ project, canEdit }) {
  const update = useStore((s) => s.updateProjectSection)
  const submitApproval = useStore((s) => s.submitApproval)
  const decideApproval = useStore((s) => s.decideApproval)
  const me = useMe()
  const [lossOpen, setLossOpen] = useState(false)
  const [lossReason, setLossReason] = useState('')
  const s = project.survey
  const save = (patch, summary) => {
    update(project.id, 'survey', patch, `Survey and design updated: ${summary}.`)
    toast.success('Survey details saved')
  }
  const notFeasible = s.feasibility === 'Not feasible'

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Site survey" description="Request, schedule and outcome.">
        <SectionForm
          editable={canEdit}
          value={s}
          onSave={save}
          fields={[
            { key: 'surveyor', label: 'Assigned surveyor', type: 'user' },
            { key: 'requestedAt', label: 'Requested on', type: 'date' },
            { key: 'plannedDate', label: 'Planned date', type: 'date' },
            { key: 'completedDate', label: 'Completed on', type: 'date' },
            { key: 'feasibility', label: 'Feasibility outcome', type: 'select', options: FEASIBILITY, placeholder: 'Not recorded', status: true, wide: true },
            { key: 'roofType', label: 'Roof or site type' },
            { key: 'shadow', label: 'Shading and constraints' },
            { key: 'electrical', label: 'Electrical connection observations', type: 'textarea', wide: true },
          ]}
        />
        {notFeasible && (
          <div className="mt-4">
            <Callout tone="bad" title="Site marked not feasible" action={canEdit && !project.lossPending && <button className="btn btn-secondary btn-sm" onClick={() => setLossOpen(true)}>Send to admin</button>}>
              {project.lossPending ? 'Loss review is with an admin.' : 'A not-feasible outcome needs a reason and may lead to a loss. Send it to an admin to decide.'}
            </Callout>
          </div>
        )}
        {s.feasibility === 'Re-survey required' && <div className="mt-4"><Callout tone="warn" title="Re-survey required">Set a new planned date and keep the survey task open.</Callout></div>}
      </Panel>

      <Panel title="Design" description="Proposed capacity, version and corrective actions.">
        <SectionForm
          editable={canEdit}
          value={s}
          onSave={save}
          fields={[
            { key: 'dcKw', label: 'Proposed DC capacity (kWp)', type: 'number', step: 0.1 },
            { key: 'acKw', label: 'Proposed AC capacity (kW)', type: 'number', step: 0.1 },
            { key: 'designVersion', label: 'Design version' },
            { key: 'designStatus', label: 'Design status', type: 'select', options: ['Not started', 'In progress', 'In review', 'Approved', 'Returned for changes'], status: true },
            { key: 'exceptions', label: 'Exceptions and corrective actions', type: 'textarea', wide: true },
          ]}
        />
      </Panel>

      <Modal open={lossOpen} onOpenChange={setLossOpen} title="Send for loss review" description="An admin decides whether the project is closed as lost. Until then it stays active."
        footer={<><button className="btn btn-secondary" onClick={() => setLossOpen(false)}>Cancel</button><button className="btn btn-danger" disabled={lossReason.trim().length < 10} onClick={() => {
          const id = submitApproval('loss', 'project', project.id, { category: 'Roof or site not feasible', explanation: lossReason, date: todayISO() })
          if (isAdmin(me)) decideApproval(id, true, 'Closed by admin after not-feasible survey.')
          toast.success(isAdmin(me) ? 'Project closed as lost and archived' : 'Sent to admin for review')
          setLossOpen(false)
        }}>Send for review</button></>}>
        <Field label="Why is the site not feasible?" required><Textarea value={lossReason} onChange={(e) => setLossReason(e.target.value)} placeholder="Structural limits, shading, sanctioned load…" /></Field>
      </Modal>
    </div>
  )
}

// ---------------- documentation, scheme and finance ----------------

export function DocsTab({ project, canEdit }) {
  const update = useStore((s) => s.updateProjectSection)
  const updateProject = useStore((s) => s.updateProject)
  const scheme = useStore((s) => s.config.schemes.find((x) => x.key === project.scheme))
  const d = project.docs
  const usesPortal = project.scheme !== 'none'
  const verified = d.customerDocs.filter((x) => ['Verified', 'Not applicable'].includes(x.status)).length

  const setDocStatus = (i, status) => {
    const customerDocs = d.customerDocs.map((x, j) => (j === i ? { ...x, status } : x))
    update(project.id, 'docs', { customerDocs }, `Customer document "${d.customerDocs[i].name}" set to ${status}.`)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Vendor agreement">
        {canEdit ? (
          <Field label="Status">
            <Select value={d.vendorAgreement} onChange={(e) => { update(project.id, 'docs', { vendorAgreement: e.target.value }, `Vendor agreement set to ${e.target.value}.`); toast.success('Vendor agreement updated') }} options={VENDOR_AGREEMENT} />
          </Field>
        ) : <StatusChip value={d.vendorAgreement} />}
        {project.type === 'commercial' && (
          <div className="mt-4">
            <SectionForm editable={canEdit} value={project} cols={1}
              onSave={(patch, summary) => { updateProject(project.id, patch, `Commercial details updated: ${summary}.`); toast.success('Saved') }}
              fields={[{ key: 'sanctionedDemand', label: 'Sanctioned or contract demand', hint: 'For example 35 kVA' }, { key: 'businessName', label: 'Business entity' }]} />
          </div>
        )}
      </Panel>

      <Panel title="Customer documents" description={`${verified} of ${d.customerDocs.length} verified or not applicable. Files are kept in the Drive folder, not here.`} bodyClass="px-5 pb-2">
        <ul className="divide-y divide-line">
          {d.customerDocs.map((doc, i) => (
            <li key={doc.name} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm">{doc.name}</span>
              {canEdit ? (
                <Select className="!w-[150px] !min-h-[2.125rem] !py-1 text-sm" value={doc.status} onChange={(e) => setDocStatus(i, e.target.value)} options={DOC_STATUS} aria-label={`${doc.name} status`} />
              ) : <StatusChip value={doc.status} />}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Loan" description="Tracked separately from the project stage. Not applicable is excluded from pending counts.">
        <SectionForm editable={canEdit} value={d.loan}
          onSave={(patch, summary) => { update(project.id, 'docs', { loan: { ...d.loan, ...patch } }, `Loan updated: ${summary}.`); toast.success('Loan details saved') }}
          fields={[
            { key: 'status', label: 'Loan status', type: 'select', options: LOAN_STATUS, status: true },
            { key: 'lender', label: 'Lender', hidden: d.loan.status === 'Not applicable' },
            { key: 'ref', label: 'Application reference', hidden: d.loan.status === 'Not applicable' },
            { key: 'date', label: 'Submitted on', type: 'date', hidden: d.loan.status === 'Not applicable' },
          ]} />
      </Panel>

      <Panel title="Portal onboarding" description={usesPortal ? scheme?.portal : 'This project does not use a scheme portal.'}>
        {usesPortal ? (
          <>
            <SectionForm editable={canEdit} value={d.portal}
              onSave={(patch, summary) => { update(project.id, 'docs', { portal: { ...d.portal, ...patch } }, `Portal updated: ${summary}.`); toast.success('Portal details saved') }}
              fields={[
                { key: 'status', label: 'Portal status', type: 'select', options: PORTAL_STATUS.filter((x) => x !== 'Not applicable'), status: true },
                { key: 'ref', label: 'Application or reference number' },
                { key: 'date', label: 'Submitted on', type: 'date' },
                { key: 'query', label: 'Returned query', type: 'textarea', wide: true, hint: 'Record the exact wording from the portal.' },
              ]} />
            <p className="mt-4 text-[0.8125rem] text-ink-3">This app does not submit to {scheme?.portal}. Update the status here after acting on the portal. The status here is not proof of approval.</p>
          </>
        ) : (
          <p className="text-sm text-ink-2">Portal steps are skipped for private projects, so the documentation gate does not require them.</p>
        )}
      </Panel>
    </div>
  )
}

// ---------------- procurement and installation ----------------

export function DeliveryTab({ project, canEdit, canEditInstall }) {
  const update = useStore((s) => s.updateProjectSection)
  const name = useUserName()
  const pr = project.procurement
  const inst = project.installation

  const setInstTask = (i, patch) => {
    const tasks = inst.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t))
    const what = Object.entries(patch).map(([k, v]) => `${k === 'done' ? 'done date' : k === 'planned' ? 'planned date' : 'assignee'} ${k === 'assignee' ? name(v) : v || 'cleared'}`).join(', ')
    update(project.id, 'installation', { tasks }, `${inst.tasks[i].name}: ${what}.`)
  }

  return (
    <div className="grid gap-5">
      <Panel title="Procurement and pre-installation">
        {project.blocked && <div className="mb-4"><Callout tone="bad" title={`${project.blocked.kind}: ${project.blocked.waitingOn}`}>Next action: {project.blocked.nextAction}. Review on {fmtDate(project.blocked.reviewDate)}.</Callout></div>}
        <SectionForm editable={canEdit} value={pr} cols={3}
          onSave={(patch, summary) => { update(project.id, 'procurement', patch, `Procurement updated: ${summary}.`); toast.success('Procurement saved') }}
          fields={[
            { key: 'confirmedDate', label: 'Procurement confirmed on', type: 'date' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'materialReady', label: 'Material readiness', type: 'select', options: ['Not ready', 'Partially ready', 'Ready'], status: true },
            { key: 'plannedInstallDate', label: 'Planned installation date', type: 'date' },
            { key: 'siteReady', label: 'Site readiness' },
            { key: 'fabrication', label: 'Fabrication details' },
            { key: 'prerequisites', label: 'Unresolved prerequisites', type: 'textarea', wide: true },
          ]} />
      </Panel>

      <Panel title="Installation work" description="Each step has its own assignee and dates." bodyClass="px-5 pb-2">
        <div className="scroll-x">
          <table className="data-table min-w-[620px]">
            <thead><tr><th className="!pl-0">Step</th><th>Assignee</th><th>Planned</th><th>Done</th></tr></thead>
            <tbody>
              {inst.tasks.map((t, i) => (
                <tr key={t.name}>
                  <td className="!pl-0">
                    <span className="flex items-center gap-2 font-medium">
                      {t.done ? <CheckCircle2 size={16} className="text-good" /> : <span className="size-4 rounded-full border-2 border-line-strong" />}
                      {t.name}
                    </span>
                  </td>
                  <td>{canEditInstall ? <UserSelect className="!min-h-[2.125rem] !py-1 text-sm" value={t.assignee} onChange={(v) => setInstTask(i, { assignee: v })} aria-label={`${t.name} assignee`} /> : name(t.assignee)}</td>
                  <td>{canEditInstall ? <Input type="date" className="!min-h-[2.125rem] !py-1 text-sm" value={t.planned} onChange={(e) => setInstTask(i, { planned: e.target.value })} aria-label={`${t.name} planned date`} /> : fmtDate(t.planned)}</td>
                  <td>{canEditInstall ? <Input type="date" max={todayISO()} className="!min-h-[2.125rem] !py-1 text-sm" value={t.done} onChange={(e) => setInstTask(i, { done: e.target.value })} aria-label={`${t.name} done date`} /> : fmtDate(t.done)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Installation completion" description="The actual completion date drives the Installations KPI.">
        <SectionForm editable={canEditInstall} value={inst}
          onSave={(patch, summary) => { update(project.id, 'installation', patch, `Installation updated: ${summary}.`); toast.success('Installation saved') }}
          fields={[
            { key: 'actualDate', label: 'Actual completion date', type: 'date' },
            { key: 'observations', label: 'Technical observations', type: 'textarea', wide: true },
          ]} />
      </Panel>
    </div>
  )
}

// ---------------- utility approvals, subsidy, commissioning, O&M ----------------

function QueryDialog({ project, milestone, open, onOpenChange }) {
  const update = useStore((s) => s.updateProject)
  const createTask = useStore((s) => s.createTask)
  const [f, setF] = useState({ query: '', deadline: daysFromToday(7), owner: project.owner })
  const label = UTILITY_MILESTONES.find((m) => m.key === milestone)?.label
  const save = () => {
    const milestones = project.milestones.map((m) => (m.key === milestone ? { ...m, status: 'Query raised', note: f.query } : m))
    update(project.id, { milestones }, `${label}: query raised. ${f.query}`)
    createTask({ projectId: project.id, title: `Respond to query: ${label}`, stage: 'post', assignee: f.owner, due: f.deadline, priority: 'High', required: true, requiresDrive: true })
    toast.success('Query logged', { description: 'A correction task was created with the response deadline.' })
    onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Log query on ${label?.toLowerCase()}`} description="Creates a required correction task. Store the evidence in the Approvals and Scheme folder."
      footer={<><button className="btn btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button className="btn btn-primary" disabled={f.query.trim().length < 5} onClick={save}>Log query</button></>}>
      <div className="grid gap-4">
        <Field label="Query text" required><Textarea value={f.query} onChange={(e) => setF({ ...f, query: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Response deadline"><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
          <Field label="Responsible"><UserSelect value={f.owner} onChange={(v) => setF({ ...f, owner: v })} /></Field>
        </div>
      </div>
    </Modal>
  )
}

export function ApprovalsTab({ project, canEdit }) {
  const updateProject = useStore((s) => s.updateProject)
  const update = useStore((s) => s.updateProjectSection)
  const addIssue = useStore((s) => s.addServiceIssue)
  const closeIssue = useStore((s) => s.closeServiceIssue)
  const [query, setQuery] = useState(null)
  const [issue, setIssue] = useState('')
  const [creditConfirm, setCreditConfirm] = useState(false)
  const c = project.commissioning

  const setMilestone = (key, patch) => {
    const milestones = project.milestones.map((m) => (m.key === key ? { ...m, ...patch, date: patch.status === 'Done' && !m.date ? todayISO() : patch.date ?? m.date } : m))
    const label = UTILITY_MILESTONES.find((m) => m.key === key).label
    updateProject(project.id, { milestones }, `${label}: ${Object.values(patch).join(', ')}.`)
  }

  const setSubsidy = (v) => {
    if (v === 'Credited' && !creditConfirm) {
      toast.error('Confirm the credit evidence first', { description: 'Tick the box once the bank or portal credit proof is in Drive.' })
      return
    }
    updateProject(project.id, { subsidy: v }, `Subsidy status set to ${v}.`)
    toast.success('Subsidy status updated')
  }

  return (
    <div className="grid gap-5">
      <Panel title="Utility and portal milestones" description="Each milestone is tracked separately. Log a query when the utility or portal returns one." bodyClass="px-5 pb-2">
        <ul className="divide-y divide-line">
          {project.milestones.map((m) => {
            const def = UTILITY_MILESTONES.find((x) => x.key === m.key)
            return (
              <li key={m.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {m.status === 'Done' ? <CheckCircle2 size={16} className="text-good" /> : m.status === 'Query raised' ? <AlertTriangle size={16} className="text-warn" /> : <span className="size-4 rounded-full border-2 border-line-strong" />}
                    {def.label}
                  </p>
                  {m.note && <p className="ml-6 mt-0.5 text-[0.8125rem] text-warn">{m.note}</p>}
                  {m.date && <p className="ml-6 text-[0.8125rem] text-ink-3">{fmtDate(m.date)}</p>}
                </div>
                {canEdit ? (
                  <div className="ml-6 flex items-center gap-2 sm:ml-0">
                    <Select className="!w-[150px] !min-h-[2.125rem] !py-1 text-sm" value={m.status} onChange={(e) => setMilestone(m.key, { status: e.target.value })} options={MILESTONE_STATUS} aria-label={`${def.label} status`} />
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuery(m.key)}>Log query</button>
                  </div>
                ) : <span className="ml-6 sm:ml-0"><StatusChip value={m.status} /></span>}
              </li>
            )
          })}
        </ul>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Subsidy" description={project.scheme === 'none' ? 'Not applicable for private projects.' : 'Mark Credited only after verified evidence is in Drive.'}>
          {project.scheme === 'none' ? <StatusChip value="Not applicable" /> : canEdit ? (
            <div className="grid gap-4">
              <Field label="Subsidy status"><Select value={project.subsidy} onChange={(e) => setSubsidy(e.target.value)} options={SUBSIDY_STATUS.filter((s) => s !== 'Not applicable')} /></Field>
              {project.subsidy !== 'Credited' && <Checkbox checked={creditConfirm} onChange={setCreditConfirm} label="Credit evidence is verified and stored in the Approvals and Scheme folder" />}
            </div>
          ) : <StatusChip value={project.subsidy} />}
        </Panel>

        <Panel title="Commissioning and handover" description="Completion needs the commissioning date, handover checklist and warranty dates.">
          <SectionForm editable={canEdit} value={{ ...c, handoverChecklist: c.handoverChecklist ? 'Complete' : 'Not complete' }}
            onSave={(patch, summary) => {
              if ('handoverChecklist' in patch) patch.handoverChecklist = patch.handoverChecklist === 'Complete'
              update(project.id, 'commissioning', patch, `Commissioning updated: ${summary}.`)
              toast.success('Commissioning saved')
            }}
            fields={[
              { key: 'date', label: 'Commissioning date', type: 'date' },
              { key: 'outcome', label: 'Outcome' },
              { key: 'handoverChecklist', label: 'Handover checklist', type: 'select', options: ['Not complete', 'Complete'], status: true },
              { key: 'omStart', label: 'O&M start', type: 'date' },
              { key: 'warrantyStart', label: 'Warranty start', type: 'date' },
              { key: 'warrantyEnd', label: 'Warranty end', type: 'date' },
            ]} />
        </Panel>
      </div>

      {project.stage === 'om' && (
        <Panel title="Service issues" description="Open issues stay trackable without changing the commissioning date." bodyClass="pb-4">
          <ul className="mb-3 divide-y divide-line">
            {project.serviceIssues.length === 0 && <li className="py-3 text-sm text-ink-3">No service issues raised.</li>}
            {project.serviceIssues.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Wrench size={16} className={s.status === 'Open' ? 'text-warn' : 'text-ink-3'} />
                <span className="min-w-0 flex-1 text-sm"><span className={cx('font-medium', s.status !== 'Open' && 'text-ink-3 line-through')}>{s.title}</span> <span className="text-ink-3">raised {fmtDate(s.raisedAt)}</span></span>
                {s.status === 'Open' && canEdit && <button className="btn btn-secondary btn-sm" onClick={() => { closeIssue(project.id, s.id); toast.success('Issue closed') }}>Close issue</button>}
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="flex gap-2">
              <Input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe a new issue" aria-label="New service issue" />
              <button className="btn btn-secondary" disabled={issue.trim().length < 4} onClick={() => { addIssue(project.id, issue); setIssue(''); toast.success('Issue raised') }}><Plus size={16} /> Raise</button>
            </div>
          )}
        </Panel>
      )}
      {query && <QueryDialog project={project} milestone={query} open onOpenChange={(v) => !v && setQuery(null)} />}
    </div>
  )
}

// ---------------- drive ----------------

export function DriveTab({ project, canEdit }) {
  const me = useMe()
  const mode = useStore((s) => s.config.settings.driveMode)
  const createFolders = useStore((s) => s.createDriveFolders)
  const [link, setLink] = useState(null)
  const [busy, setBusy] = useState(false)
  const admin = isAdmin(me)
  const folders = [{ key: 'root', name: `${project.id} ${project.client.split(' ').slice(0, 2).join(' ')}`, hint: 'Project root folder' }, ...DRIVE_FOLDERS]
  const missing = folders.filter((f) => !(f.key === 'root' ? project.drive.root : project.drive.stages[f.key])).length

  const run = async () => {
    setBusy(true)
    try {
      await createFolders(project.id)
      toast.success('Drive folders created', { description: 'Root and 7 stage folders are linked.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5">
      <Callout tone="cell" icon={ShieldCheck} title="Files stay in Google Drive">
        The tracker stores folder links only. Opening a link works if your Google account has access to the company Shared Drive. Ask an admin if a folder will not open.
      </Callout>
      <Panel
        title="Project folders"
        description={missing ? `${missing} of ${folders.length} folders are not linked.` : 'All folders are linked.'}
        action={admin && missing > 0 && mode === 'auto' ? (
          <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <FolderPlus size={15} />} {busy ? 'Creating folders' : 'Create missing folders'}</button>
        ) : null}
        bodyClass="px-5 pb-2"
      >
        <ul className="divide-y divide-line">
          {folders.map((f) => {
            const url = f.key === 'root' ? project.drive.root : project.drive.stages[f.key]
            const invalid = url && !isValidDriveUrl(url)
            return (
              <li key={f.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-[8px]', !url ? 'bg-sunken text-ink-3' : invalid ? 'bg-bad-soft text-bad' : 'bg-cell-soft text-cell')}>
                  {!url || invalid ? <FolderX size={18} /> : <FolderOpen size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm font-semibold', f.key === 'root' && 'text-ink')}>{f.name}</p>
                  <p className="truncate text-[0.8125rem] text-ink-3">{invalid ? 'Link is not a valid Drive folder. Repair it.' : !url ? 'Not linked yet' : f.hint}</p>
                </div>
                <div className="flex gap-2">
                  {url && !invalid && <a className="btn btn-secondary btn-sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open folder</a>}
                  {(canEdit || admin) && <button className="btn btn-ghost btn-sm" onClick={() => setLink(f.key)}><Link2 size={14} /> {url ? (invalid ? 'Repair link' : 'Change') : 'Link folder'}</button>}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
      {link && <DriveLinkDialog project={project} folderKey={link} open onOpenChange={(v) => !v && setLink(null)} />}
    </div>
  )
}
