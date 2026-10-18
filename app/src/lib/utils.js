import clsx from 'clsx'
import { CHECKLISTS, STAGES } from './config'

export const cx = clsx

const DAY = 86400000

// ---------- dates (displayed in India Standard Time) ----------

export function todayISO() {
  return toDateISO(new Date())
}

export function toDateISO(d) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return parts
}

export function addDays(iso, n) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00+05:30' : iso)
  return new Date(d.getTime() + n * DAY)
}

export function daysFromToday(n) {
  return toDateISO(addDays(todayISO(), n))
}

export function tsDaysAgo(n, hour = 11) {
  const d = addDays(todayISO(), -n)
  d.setUTCHours(hour - 5, 30 + ((n * 7) % 29), 0, 0)
  return d.toISOString()
}

function asDate(v) {
  if (!v) return null
  return new Date(v.length === 10 ? v + 'T12:00:00+05:30' : v)
}

export function fmtDate(v) {
  const d = asDate(v)
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

export function fmtShortDate(v) {
  const d = asDate(v)
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(d)
}

export function fmtDateTime(v) {
  const d = asDate(v)
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' IST'
}

export function daysBetween(a, b = new Date().toISOString()) {
  const da = asDate(a), db = asDate(b)
  if (!da || !db) return 0
  return Math.floor((startOfDay(db) - startOfDay(da)) / DAY)
}

function startOfDay(d) {
  return asDate(toDateISO(d)).getTime()
}

export function relDays(v) {
  if (!v) return '—'
  const n = daysBetween(todayISO(), v)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n < 0) return `${-n} days ago`
  return `In ${n} days`
}

export function ageLabel(v) {
  const n = daysBetween(v)
  if (n <= 0) return 'Today'
  if (n === 1) return '1 day'
  return `${n} days`
}

// ---------- numbers ----------

export function fmtINR(n) {
  if (n == null || n === '') return '—'
  const v = Number(n)
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr'
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L'
  return '₹' + v.toLocaleString('en-IN')
}

export function fmtKw(n) {
  if (n == null || n === '') return '—'
  return `${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kWp`
}

// ---------- ids ----------

export function nextId(prefix, existing) {
  const year = new Date().getFullYear()
  const nums = existing
    .map((x) => Number(String(x).split('-').pop()))
    .filter((n) => !Number.isNaN(n))
  const n = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${year}-${String(n).padStart(3, '0')}`
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ---------- stages ----------

export function stageIndex(stages, key) {
  return stages.findIndex((s) => s.key === key)
}

export function stageByKey(stages, key) {
  return stages.find((s) => s.key === key) || STAGES.find((s) => s.key === key)
}

export function checklistFor(checklists, stageKey, project) {
  return (checklists[stageKey] || CHECKLISTS[stageKey] || []).filter((item) => {
    if (item.schemes && !item.schemes.includes(project.scheme)) return false
    if (item.types && !item.types.includes(project.type)) return false
    return true
  })
}

// What stops a project leaving its current stage.
export function gateBlockers(state, project) {
  const items = checklistFor(state.config.checklists, project.stage, project)
  const missing = items.filter((i) => i.required && !project.checklist?.[project.stage]?.[i.key])
  const openTasks = state.tasks.filter(
    (t) => t.projectId === project.id && t.stage === project.stage && t.required && t.status !== 'Completed',
  )
  return { missing, openTasks, ok: missing.length === 0 && openTasks.length === 0 }
}

// ---------- permissions ----------

export const isAdmin = (u) => u?.role === 'admin'

export function canViewProject(state, u, p) {
  if (!u || !p) return false
  if (isAdmin(u)) return true
  if (p.owner === u.id || p.installationOwner === u.id) return true
  return state.tasks.some((t) => t.projectId === p.id && t.assignee === u.id)
}

export const canEditProject = (u, p) => isAdmin(u) || p?.owner === u?.id
export const canMoveProject = canEditProject

export function canUpdateTask(state, u, t) {
  if (!u || !t) return false
  if (isAdmin(u) || t.assignee === u.id) return true
  const parent = t.projectId ? state.projects.find((p) => p.id === t.projectId) : state.leads.find((l) => l.id === t.leadId)
  return parent?.owner === u.id
}

export const canViewLead = (u, l) => isAdmin(u) || l?.owner === u?.id
export const canEditLead = canViewLead

export function visibleProjects(state, u) {
  return state.projects.filter((p) => !p.archived && canViewProject(state, u, p))
}

export function visibleLeads(state, u) {
  return state.leads.filter((l) => !l.mergedInto && canViewLead(u, l))
}

export function visibleTasks(state, u) {
  if (isAdmin(u)) return state.tasks
  return state.tasks.filter((t) => canUpdateTask(state, u, t))
}

// ---------- duplicate detection ----------

const normPhone = (p) => String(p || '').replace(/\D/g, '').slice(-10)
const normText = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function findDuplicates(state, data, ignoreId) {
  const phone = normPhone(data.phone)
  const email = normText(data.email)
  const consumer = normText(data.consumerNo)
  const address = normText(data.address)
  const out = []
  const check = (rec, kind) => {
    if (rec.id === ignoreId || rec.mergedInto) return
    const reasons = []
    if (phone.length >= 10 && normPhone(rec.phone) === phone) reasons.push('phone')
    if (email && normText(rec.email) === email) reasons.push('email')
    if (consumer && normText(rec.consumerNo) === consumer) reasons.push('consumer number')
    if (address.length > 8 && normText(rec.address) === address) reasons.push('site address')
    if (reasons.length) out.push({ kind, record: rec, reasons })
  }
  state.leads.forEach((l) => check(l, 'lead'))
  state.projects.forEach((p) => check(p, 'project'))
  return out
}

// ---------- KPIs ----------

export function fyStart(date = new Date()) {
  const iso = toDateISO(date)
  const [y, m] = iso.split('-').map(Number)
  return m >= 4 ? y : y - 1
}

export function periodRange(period, basis = 'fy') {
  const today = todayISO()
  const y = Number(today.slice(0, 4))
  const fy = fyStart()
  switch (period) {
    case 'last30': return [toDateISO(addDays(today, -29)), today]
    case 'last90': return [toDateISO(addDays(today, -89)), today]
    case 'month': return [today.slice(0, 8) + '01', today]
    case 'thisYear':
      return basis === 'fy' ? [`${fy}-04-01`, `${fy + 1}-03-31`] : [`${y}-01-01`, `${y}-12-31`]
    case 'lastYear':
      return basis === 'fy' ? [`${fy - 1}-04-01`, `${fy}-03-31`] : [`${y - 1}-01-01`, `${y - 1}-12-31`]
    case 'all':
    default:
      return ['2000-01-01', '2100-12-31']
  }
}

export function inRange(v, [a, b]) {
  if (!v) return false
  const d = v.slice(0, 10)
  return d >= a && d <= b
}

export function median(nums) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export function taskBuckets(tasks) {
  const today = todayISO()
  const soon = daysFromToday(7)
  const open = tasks.filter((t) => t.status !== 'Completed')
  return {
    open,
    overdue: open.filter((t) => t.due < today),
    today: open.filter((t) => t.due === today),
    soon: open.filter((t) => t.due > today && t.due <= soon),
    blocked: open.filter((t) => t.status === 'Blocked'),
    waiting: open.filter((t) => t.status === 'Waiting'),
    review: open.filter((t) => t.status === 'Under Review'),
  }
}

// ---------- export ----------

export function downloadCSV(filename, rows) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function isValidDriveUrl(url) {
  return /^https:\/\/drive\.google\.com\/(drive\/(u\/\d\/)?folders\/|file\/d\/|open\?id=)[\w-]+/.test(url || '')
}

export function stageName(stages, key) {
  return stageByKey(stages, key)?.name || key
}

export { STAGES }
