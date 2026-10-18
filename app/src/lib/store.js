import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CHECKLISTS, LOSS_REASONS, SCHEMES, STAGES, CUSTOMER_DOCS, UTILITY_MILESTONES, DRIVE_FOLDERS } from './config'
import { APPROVALS, DEFAULT_SETTINGS, EVENTS, LEADS, PROJECTS, TASKS, USERS } from './mock'
import { nextId, todayISO, uid } from './utils'

const now = () => new Date().toISOString()

function seed() {
  return {
    currentUserId: null,
    users: structuredClone(USERS),
    leads: structuredClone(LEADS),
    projects: structuredClone(PROJECTS),
    tasks: structuredClone(TASKS),
    approvals: structuredClone(APPROVALS),
    events: structuredClone(EVENTS),
    config: {
      stages: structuredClone(STAGES),
      checklists: structuredClone(CHECKLISTS),
      schemes: structuredClone(SCHEMES),
      lossReasons: [...LOSS_REASONS],
      settings: { ...DEFAULT_SETTINGS },
    },
  }
}

const fakeFolder = () => `https://drive.google.com/drive/folders/1${uid()}${uid()}${uid()}`

export const useStore = create(
  persist(
    (set, get) => {
      const me = () => get().users.find((u) => u.id === get().currentUserId)
      const log = (e) => ({ id: `E-${uid()}`, actor: get().currentUserId, at: now(), ...e })
      const addEvents = (...evs) => set((s) => ({ events: [...evs.map(log), ...s.events] }))
      const patchProject = (id, fn) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }))
      const patchLead = (id, fn) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...fn(l) } : l)) }))
      const stageName = (k) => get().config.stages.find((s) => s.key === k)?.name || k

      return {
        ...seed(),

        // ---------- session ----------
        signIn: (userId) => set({ currentUserId: userId }),
        signOut: () => set({ currentUserId: null }),
        resetDemo: () => set({ ...seed(), currentUserId: get().currentUserId }),

        // ---------- leads ----------
        createLead: (data) => {
          const id = nextId('ECR-L', get().leads.map((l) => l.id))
          const u = me()
          const lead = {
            id,
            createdAt: now(),
            createdBy: u.id,
            type: data.type,
            source: data.source,
            referrer: data.referrer || '',
            contact: data.contact,
            businessName: data.businessName || '',
            phone: data.phone,
            email: data.email || '',
            address: data.address,
            district: data.district,
            taluka: data.taluka,
            consumerNo: data.consumerNo || '',
            owner: data.owner || u.id,
            stage: 'lead',
            substage: 'New',
            status: 'open',
            lastMovedAt: now(),
            nextAction: data.nextAction,
            nextActionDate: data.nextActionDate,
            estimatedKw: data.estimatedKw ? Number(data.estimatedKw) : '',
            meetings: [],
            surveyRequested: false,
            surveyor: '',
            lostReason: '',
            lostAt: '',
            projectId: null,
            mergedInto: null,
          }
          set((s) => ({ leads: [lead, ...s.leads] }))
          const ownerName = get().users.find((x) => x.id === lead.owner)?.name
          addEvents({ entity: 'lead', entityId: id, type: 'created', comment: `Lead created from ${lead.source.toLowerCase()}. Owner: ${ownerName}.` })
          return id
        },

        updateLead: (id, patch, comment = 'Lead details updated.') => {
          patchLead(id, () => patch)
          addEvents({ entity: 'lead', entityId: id, type: 'update', comment })
        },

        markContacted: (id, comment) => {
          patchLead(id, () => ({ substage: 'Contacted', lastMovedAt: now() }))
          addEvents({ entity: 'lead', entityId: id, type: 'stage_change', from: 'Lead / New', to: 'Lead / Contacted', comment })
        },

        addMeeting: (id, m) => {
          const lead = get().leads.find((l) => l.id === id)
          const n = lead.meetings.length + 1
          const sub = ['First meeting', 'Second meeting', 'Third meeting', 'Fourth meeting'][Math.min(n, 4) - 1]
          patchLead(id, (l) => ({
            stage: 'sales',
            substage: sub,
            lastMovedAt: now(),
            meetings: [...l.meetings, { ...m, n }],
            nextAction: m.nextAction,
            nextActionDate: m.nextDate,
            surveyRequested: l.surveyRequested || !!m.scheduleSurvey,
            surveyor: m.scheduleSurvey ? m.surveyor : l.surveyor,
          }))
          addEvents({
            entity: 'lead', entityId: id, type: 'stage_change',
            from: `${lead.stage === 'lead' ? 'Lead' : 'Sales'} / ${lead.substage}`, to: `Sales / ${sub}`,
            comment: `${m.outcome}. ${m.comment}`,
          })
          if (m.scheduleSurvey) {
            get().createTask({ leadId: id, title: `Site survey for ${lead.contact}`, stage: 'sales', assignee: m.surveyor, due: m.surveyDate, priority: 'High', required: false })
          }
        },

        mergeLeads: (sourceId, targetId, reason) => {
          const src = get().leads.find((l) => l.id === sourceId)
          patchLead(targetId, (t) => ({ meetings: [...t.meetings, ...src.meetings.map((m, i) => ({ ...m, n: t.meetings.length + i + 1 }))] }))
          patchLead(sourceId, () => ({ mergedInto: targetId, status: 'merged' }))
          set((s) => ({ tasks: s.tasks.map((t) => (t.leadId === sourceId ? { ...t, leadId: targetId } : t)) }))
          addEvents(
            { entity: 'lead', entityId: sourceId, type: 'merge', comment: `Merged into ${targetId}. ${reason}` },
            { entity: 'lead', entityId: targetId, type: 'merge', comment: `Duplicate ${sourceId} merged in; its history is kept. ${reason}` },
          )
        },

        // ---------- approvals ----------
        submitApproval: (type, entity, entityId, payload) => {
          const id = 'AP-' + (Math.max(...get().approvals.map((a) => Number(a.id.split('-')[1]))) + 1)
          const a = { id, type, entity, entityId, requestedBy: me().id, requestedAt: now(), status: 'pending', payload }
          set((s) => ({ approvals: [a, ...s.approvals] }))
          const label = { won: 'Won', loss: 'Loss', reopen: 'Reopen', installation_reassign: 'Installation owner change', owner_reassign: 'Owner change' }[type]
          if (entity === 'lead') {
            if (type === 'won') patchLead(entityId, () => ({ status: 'won-pending' }))
            if (type === 'loss') patchLead(entityId, () => ({ status: 'loss-pending' }))
          } else if (type === 'loss') {
            patchProject(entityId, () => ({ lossPending: true }))
          }
          addEvents({ entity, entityId, type: 'request', comment: `${label} requested. ${payload.reason || payload.explanation || payload.comment || ''}`.trim() })
          return id
        },

        decideApproval: (id, approve, comment) => {
          const a = get().approvals.find((x) => x.id === id)
          set((s) => ({
            approvals: s.approvals.map((x) =>
              x.id === id ? { ...x, status: approve ? 'approved' : 'rejected', decidedBy: me().id, decidedAt: now(), decisionComment: comment } : x,
            ),
          }))
          const verb = approve ? 'approved' : 'rejected'
          const users = get().users
          const nm = (uid) => users.find((u) => u.id === uid)?.name
          let projectId = null

          if (a.type === 'won') {
            if (approve) projectId = get()._convertLead(a)
            else patchLead(a.entityId, () => ({ status: 'open' }))
          }
          if (a.type === 'loss') {
            if (a.entity === 'lead') {
              patchLead(a.entityId, () => (approve ? { status: 'lost', lostReason: a.payload.category, lostAt: todayISO() } : { status: 'open' }))
            } else {
              patchProject(a.entityId, () => (approve ? { archived: true, lostReason: a.payload.category, lossPending: false } : { lossPending: false }))
            }
          }
          if (a.type === 'reopen' && approve) {
            patchLead(a.entityId, () => ({ status: 'open', lostReason: '', lostAt: '', lastMovedAt: now() }))
          }
          if (a.type === 'installation_reassign' && approve) {
            patchProject(a.entityId, () => ({ installationOwner: a.payload.to }))
          }
          if (a.type === 'owner_reassign' && approve) {
            if (a.entity === 'lead') patchLead(a.entityId, () => ({ owner: a.payload.to }))
            else patchProject(a.entityId, () => ({ owner: a.payload.to }))
          }
          const what = {
            won: 'Won', loss: 'Loss', reopen: 'Reopen',
            installation_reassign: `Installation owner change ${nm(a.payload.from)} to ${nm(a.payload.to)}`,
            owner_reassign: `Owner change ${nm(a.payload.from)} to ${nm(a.payload.to)}`,
          }[a.type]
          addEvents({ entity: a.entity, entityId: a.entityId, type: 'approval', comment: `${what} ${verb}. ${comment}`.trim(), ref: id })
          return projectId
        },

        _convertLead: (a) => {
          const lead = get().leads.find((l) => l.id === a.entityId)
          const id = nextId('ECR-P', get().projects.map((p) => p.id))
          const p = {
            id,
            leadId: lead.id,
            client: lead.businessName || lead.contact,
            contact: lead.contact,
            businessName: lead.businessName,
            phone: lead.phone,
            email: lead.email,
            type: lead.type,
            scheme: a.payload.scheme,
            address: lead.address,
            district: lead.district,
            taluka: lead.taluka,
            consumerNo: lead.consumerNo,
            capacityKw: Number(a.payload.capacityKw),
            value: Number(a.payload.value),
            sanctionedDemand: '',
            wonDate: todayISO(),
            source: lead.source,
            owner: lead.owner,
            installationOwner: '',
            stage: 'won',
            substage: 'Client created',
            stageEnteredAt: now(),
            createdAt: now(),
            checklist: { won: { proposal: !!a.payload.proposalAccepted, closeEvidence: true, scheme: !!a.payload.scheme, driveRoot: false } },
            blocked: null,
            archived: false,
            survey: { requestedAt: '', plannedDate: '', surveyor: lead.surveyor || '', completedDate: '', feasibility: '', roofType: '', shadow: '', electrical: '', dcKw: Number(a.payload.capacityKw), acKw: '', designVersion: '', designStatus: 'Not started', exceptions: '' },
            docs: {
              vendorAgreement: 'Not started',
              customerDocs: CUSTOMER_DOCS[lead.type].map((name) => ({ name, status: 'Missing' })),
              loan: { status: 'Not started', lender: '', ref: '', date: '' },
              portal: a.payload.scheme === 'none'
                ? { status: 'Not applicable', name: '', ref: '', date: '', query: '' }
                : { status: 'Not started', name: SCHEMES.find((s) => s.key === a.payload.scheme)?.portal, ref: '', date: '', query: '' },
            },
            procurement: { confirmedDate: '', supplier: '', materialReady: 'Not ready', fabrication: '', plannedInstallDate: '', siteReady: '', prerequisites: '' },
            installation: { tasks: ['Fabrication and structure', 'Earthing', 'Wiring', 'Testing', 'Installation upload'].map((name) => ({ name, assignee: '', planned: '', done: '' })), actualDate: '', observations: '' },
            milestones: UTILITY_MILESTONES.map((m) => ({ key: m.key, status: a.payload.scheme === 'none' && m.key === 'portalUpload' ? 'Not applicable' : 'Not started', date: '', note: '' })),
            subsidy: a.payload.scheme === 'none' ? 'Not applicable' : 'Not started',
            commissioning: { date: '', outcome: '', handoverChecklist: false, warrantyStart: '', warrantyEnd: '', omStart: '' },
            serviceIssues: [],
            drive: { root: null, stages: {} },
          }
          set((s) => ({ projects: [p, ...s.projects] }))
          patchLead(lead.id, () => ({ status: 'won', projectId: id, wonAt: todayISO(), stage: 'sales' }))
          addEvents({ entity: 'project', entityId: id, type: 'created', comment: `Project created from lead ${lead.id}. Original source, owner and timeline kept.` })
          get().createTask({ projectId: id, title: 'Create Drive project folder', stage: 'won', assignee: lead.owner, due: todayISO(), priority: 'High', required: true, requiresDrive: true })
          return id
        },

        // ---------- projects ----------
        moveProject: (id, { stage, substage, comment, overrideReason }) => {
          const p = get().projects.find((x) => x.id === id)
          const changedStage = stage !== p.stage
          patchProject(id, () => ({ stage, substage, ...(changedStage ? { stageEnteredAt: now() } : {}) }))
          addEvents({
            entity: 'project', entityId: id, type: overrideReason ? 'override' : 'stage_change',
            from: `${stageName(p.stage)} / ${p.substage}`, to: `${stageName(stage)} / ${substage}`,
            comment, reason: overrideReason || undefined,
          })
          if (changedStage && stage === 'om') {
            patchProject(id, (x) => ({ commissioning: { ...x.commissioning, omStart: x.commissioning.omStart || todayISO() } }))
          }
        },

        toggleChecklist: (id, stage, key, value) => {
          patchProject(id, (p) => ({ checklist: { ...p.checklist, [stage]: { ...(p.checklist[stage] || {}), [key]: value } } }))
          const item = (get().config.checklists[stage] || []).find((i) => i.key === key)
          addEvents({ entity: 'project', entityId: id, type: 'checklist', comment: `${value ? 'Checked' : 'Unchecked'}: ${item?.label || key}.` })
        },

        updateProject: (id, patch, comment) => {
          patchProject(id, () => patch)
          addEvents({ entity: 'project', entityId: id, type: 'update', comment })
        },

        updateProjectSection: (id, section, patch, comment) => {
          patchProject(id, (p) => ({ [section]: { ...p[section], ...patch } }))
          addEvents({ entity: 'project', entityId: id, type: 'update', comment })
        },

        setBlock: (id, block) => {
          patchProject(id, () => ({ blocked: block }))
          addEvents({
            entity: 'project', entityId: id, type: 'blocked',
            comment: block ? `${block.kind}: ${block.waitingOn}. Next action: ${block.nextAction}. Review on ${block.reviewDate}.` : 'Block cleared; project is moving again.',
          })
        },

        reassignOwner: (entity, id, to, reason, field = 'owner') => {
          const rec = entity === 'lead' ? get().leads.find((l) => l.id === id) : get().projects.find((p) => p.id === id)
          const users = get().users
          const from = users.find((u) => u.id === rec[field])?.name || 'nobody'
          const toName = users.find((u) => u.id === to)?.name
          if (entity === 'lead') patchLead(id, () => ({ [field]: to }))
          else patchProject(id, () => ({ [field]: to }))
          addEvents({ entity, entityId: id, type: 'assignment', comment: `${field === 'owner' ? 'Owner' : 'Installation owner'} changed from ${from} to ${toName}.`, reason })
        },

        archiveProject: (id, reason) => {
          patchProject(id, () => ({ archived: true }))
          addEvents({ entity: 'project', entityId: id, type: 'archive', comment: 'Project archived. History kept.', reason })
        },

        addServiceIssue: (id, title) => {
          patchProject(id, (p) => ({ serviceIssues: [...p.serviceIssues, { id: 'SI-' + uid(), title, status: 'Open', raisedAt: todayISO() }] }))
          addEvents({ entity: 'project', entityId: id, type: 'update', comment: `Service issue raised: ${title}.` })
        },
        closeServiceIssue: (id, issueId) => {
          patchProject(id, (p) => ({ serviceIssues: p.serviceIssues.map((x) => (x.id === issueId ? { ...x, status: 'Closed' } : x)) }))
          addEvents({ entity: 'project', entityId: id, type: 'update', comment: 'Service issue closed.' })
        },

        // ---------- drive ----------
        setDriveLink: (id, folderKey, url) => {
          patchProject(id, (p) => ({
            drive: folderKey === 'root' ? { ...p.drive, root: url } : { ...p.drive, stages: { ...p.drive.stages, [folderKey]: url } },
          }))
          const name = folderKey === 'root' ? 'Project root' : DRIVE_FOLDERS.find((f) => f.key === folderKey)?.name
          addEvents({ entity: 'project', entityId: id, type: 'drive_link', comment: url ? `${name} folder link set.` : `${name} folder link removed.` })
          if (folderKey === 'root' && url) {
            const p = get().projects.find((x) => x.id === id)
            if (p.checklist.won && !p.checklist.won.driveRoot) get().toggleChecklist(id, 'won', 'driveRoot', true)
          }
        },

        // Simulates the backend folder service: creates root + seven subfolders.
        createDriveFolders: async (id) => {
          await new Promise((r) => setTimeout(r, 1400))
          const stages = {}
          DRIVE_FOLDERS.forEach((f) => (stages[f.key] = fakeFolder()))
          patchProject(id, (p) => ({ drive: { root: p.drive.root || fakeFolder(), stages: { ...stages, ...p.drive.stages } } }))
          addEvents({ entity: 'project', entityId: id, type: 'drive_link', comment: 'Project folder and 7 stage subfolders created on the company Shared Drive.' })
          const p = get().projects.find((x) => x.id === id)
          if (p.checklist.won && !p.checklist.won.driveRoot) get().toggleChecklist(id, 'won', 'driveRoot', true)
        },

        // ---------- tasks ----------
        createTask: (data) => {
          const id = 'T-' + (Math.max(...get().tasks.map((t) => Number(t.id.split('-')[1]))) + 1)
          const t = {
            id,
            projectId: data.projectId || null,
            leadId: data.leadId || null,
            title: data.title,
            stage: data.stage,
            assignee: data.assignee,
            due: data.due,
            priority: data.priority || 'Medium',
            status: 'To Do',
            required: !!data.required,
            blocker: '',
            completedAt: '',
            requiresDrive: !!data.requiresDrive,
            createdAt: now(),
            createdBy: get().currentUserId,
            comments: [],
          }
          set((s) => ({ tasks: [t, ...s.tasks] }))
          const who = get().users.find((u) => u.id === t.assignee)?.name
          addEvents({ entity: 'task', entityId: id, parent: t.projectId || t.leadId, type: 'assignment', comment: `Task "${t.title}" assigned to ${who}, due ${t.due}.` })
          return id
        },

        updateTask: (id, patch, comment) => {
          const before = get().tasks.find((t) => t.id === id)
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    ...patch,
                    completedAt: patch.status === 'Completed' ? todayISO() : patch.status ? '' : t.completedAt,
                    comments: comment ? [...t.comments, { id: uid(), by: get().currentUserId, at: now(), text: comment }] : t.comments,
                  }
                : t,
            ),
          }))
          const changes = []
          if (patch.status && patch.status !== before.status) changes.push(`status ${before.status} to ${patch.status}`)
          if (patch.due && patch.due !== before.due) changes.push(`due date ${before.due} to ${patch.due}`)
          if (patch.assignee && patch.assignee !== before.assignee) changes.push(`assignee changed`)
          addEvents({
            entity: 'task', entityId: id, parent: before.projectId || before.leadId, type: 'task',
            comment: `"${before.title}": ${changes.join(', ') || 'comment added'}.${comment ? ' ' + comment : ''}`,
          })
        },

        // ---------- settings ----------
        updateSettings: (patch, comment) => {
          set((s) => ({ config: { ...s.config, settings: { ...s.config.settings, ...patch } } }))
          addEvents({ entity: 'config', entityId: 'settings', type: 'config', comment })
        },
        setLossReasons: (list, comment) => {
          set((s) => ({ config: { ...s.config, lossReasons: list } }))
          addEvents({ entity: 'config', entityId: 'lossReasons', type: 'config', comment })
        },
        setSchemeActive: (key, active) => {
          set((s) => ({ config: { ...s.config, schemes: s.config.schemes.map((x) => (x.key === key ? { ...x, active } : x)) } }))
          const nm = get().config.schemes.find((x) => x.key === key)?.name
          addEvents({ entity: 'config', entityId: 'schemes', type: 'config', comment: `${nm} ${active ? 'enabled' : 'disabled'}.` })
        },
        setChecklist: (stage, items, comment) => {
          set((s) => ({ config: { ...s.config, checklists: { ...s.config.checklists, [stage]: items } } }))
          addEvents({ entity: 'config', entityId: 'checklists', type: 'config', comment })
        },
        setSubstages: (stage, substages, comment) => {
          set((s) => ({ config: { ...s.config, stages: s.config.stages.map((x) => (x.key === stage ? { ...x, substages } : x)) } }))
          addEvents({ entity: 'config', entityId: 'stages', type: 'config', comment })
        },
        saveUser: (user) => {
          const exists = get().users.some((u) => u.id === user.id)
          set((s) => ({ users: exists ? s.users.map((u) => (u.id === user.id ? user : u)) : [...s.users, user] }))
          addEvents({ entity: 'user', entityId: user.id, type: 'config', comment: exists ? `Updated user ${user.name}.` : `Created user ${user.name} (${user.role}).` })
        },
        setUserActive: (id, active) => {
          set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, active } : u)) }))
          const nm = get().users.find((u) => u.id === id)?.name
          addEvents({ entity: 'user', entityId: id, type: 'config', comment: `${active ? 'Enabled' : 'Disabled'} user ${nm}.` })
        },
        logExport: (what, count) => addEvents({ entity: 'config', entityId: 'export', type: 'export', comment: `Exported ${count} ${what} to CSV.` }),
      }
    },
    {
      name: 'ecorays-tracker-v1',
      version: 1,
    },
  ),
)

export const useMe = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId))
export const useUserName = () => {
  const users = useStore((s) => s.users)
  return (id) => users.find((u) => u.id === id)?.name || 'Unassigned'
}
