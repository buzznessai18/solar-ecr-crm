import { PROJECT_STAGE_KEYS } from './config'
import { daysBetween, fyStart, inRange, median, periodRange, taskBuckets, todayISO } from './utils'

// Each KPI uses the date field the BRD names for it.
export function computeKpis(state, filters) {
  const basis = state.config.settings.fyBasis
  const range = filters.period === 'custom' ? [filters.from, filters.to] : periodRange(filters.period, basis)
  const stale = state.config.settings.staleDays

  const matchLead = (l) =>
    (!filters.type || l.type === filters.type) &&
    (!filters.owner || l.owner === filters.owner) &&
    (!filters.district || l.district === filters.district)
  const matchProject = (p) =>
    !p.archived &&
    (!filters.type || p.type === filters.type) &&
    (!filters.scheme || p.scheme === filters.scheme) &&
    (!filters.owner || p.owner === filters.owner) &&
    (!filters.district || p.district === filters.district)

  const leads = state.leads.filter((l) => !l.mergedInto && matchLead(l))
  const projects = state.projects.filter(matchProject)

  const newLeads = leads.filter((l) => inRange(l.createdAt, range))
  const won = projects.filter((p) => inRange(p.wonDate, range))
  const lossApprovals = state.approvals.filter((a) => a.type === 'loss' && a.status === 'approved' && inRange(a.decidedAt, range))
    .filter((a) => {
      const l = state.leads.find((x) => x.id === a.entityId)
      return l && matchLead(l)
    })
  const installs = projects.filter((p) => inRange(p.installation.actualDate, range))
  const commissioned = projects.filter((p) => inRange(p.commissioning.date, range))

  // Conversion cohort: leads created in the period that have reached a decision or are still eligible.
  const cohort = newLeads.filter((l) => l.status !== 'merged')
  const cohortWon = cohort.filter((l) => l.status === 'won').length
  const conversion = cohort.length ? Math.round((cohortWon / cohort.length) * 100) : 0

  const openSales = leads.filter((l) => ['open', 'won-pending', 'loss-pending'].includes(l.status) && !l.projectId)
  const stalled = openSales
    .filter((l) => l.stage === 'sales' || l.stage === 'lead')
    .filter((l) => daysBetween(l.lastMovedAt) > stale)
    .sort((a, b) => (a.lastMovedAt < b.lastMovedAt ? -1 : 1))

  const lossByReason = {}
  lossApprovals.forEach((a) => (lossByReason[a.payload.category] = (lossByReason[a.payload.category] || 0) + 1))

  // Stage counts for the fleet string: open leads in lead/sales, projects in their stage.
  const counts = {}
  const stalledByStage = {}
  openSales.forEach((l) => (counts[l.stage] = (counts[l.stage] || 0) + 1))
  stalled.forEach((l) => (stalledByStage[l.stage] = (stalledByStage[l.stage] || 0) + 1))
  projects.forEach((p) => (counts[p.stage] = (counts[p.stage] || 0) + 1))

  const openProjects = projects.filter((p) => p.stage !== 'om')
  const portal = {}
  openProjects.forEach((p) => {
    const s = p.docs.portal.status
    if (s === 'Not applicable') return
    portal[s] = (portal[s] || 0) + 1
  })
  const queries = openProjects.filter((p) => p.docs.portal.status === 'Query raised' || p.milestones.some((m) => m.status === 'Query raised'))
  const missingDocs = openProjects.filter((p) => ['docs', 'won', 'survey'].includes(p.stage) && p.docs.customerDocs.some((d) => d.status === 'Missing'))

  const loan = {}
  projects.forEach((p) => (loan[p.docs.loan.status] = (loan[p.docs.loan.status] || 0) + 1))
  const loanPending = ['Not started', 'Submitted', 'Pending'].reduce((a, k) => a + (loan[k] || 0), 0)

  // Stage ageing: days since entering current stage.
  const ageing = PROJECT_STAGE_KEYS.filter((k) => k !== 'om').map((k) => {
    const list = openProjects.filter((p) => p.stage === k).map((p) => ({ p, days: daysBetween(p.stageEnteredAt) }))
    const longest = list.sort((a, b) => b.days - a.days)[0]
    return { key: k, count: list.length, median: median(list.map((x) => x.days)), longest }
  })

  // Task health per person.
  const tasks = state.tasks.filter((t) => {
    if (filters.owner && t.assignee !== filters.owner) return false
    const p = t.projectId && state.projects.find((x) => x.id === t.projectId)
    if (p && !matchProject(p)) return false
    return true
  })
  const b = taskBuckets(tasks)
  const byPerson = state.users.filter((u) => u.active).map((u) => {
    const mine = (arr) => arr.filter((t) => t.assignee === u.id).length
    return { user: u, overdue: mine(b.overdue), today: mine(b.today), soon: mine(b.soon), blocked: mine(b.blocked), waiting: mine(b.waiting), open: mine(b.open) }
  }).filter((r) => r.open > 0)

  // Monthly series across the selected financial (or calendar) year.
  const fy = fyStart()
  const startYear = filters.period === 'lastYear' ? (basis === 'fy' ? fy - 1 : new Date().getFullYear() - 1) : basis === 'fy' ? fy : new Date().getFullYear()
  const months = Array.from({ length: 12 }).map((_, i) => {
    const m0 = basis === 'fy' ? (3 + i) % 12 : i
    const y = basis === 'fy' ? startYear + (3 + i >= 12 ? 1 : 0) : startYear
    const key = `${y}-${String(m0 + 1).padStart(2, '0')}`
    return {
      key,
      label: new Date(y, m0, 1).toLocaleString('en-IN', { month: 'short' }),
      future: key > todayISO().slice(0, 7),
      leads: leads.filter((l) => l.createdAt.slice(0, 7) === key).length,
      won: projects.filter((p) => p.wonDate.slice(0, 7) === key).length,
    }
  })

  return {
    range, basis,
    newLeads, won, lossApprovals, installs, commissioned, conversion, cohort, cohortWon,
    wonKw: won.reduce((a, p) => a + Number(p.capacityKw || 0), 0),
    wonValue: won.reduce((a, p) => a + Number(p.value || 0), 0),
    stalled, lossByReason, counts, stalledByStage,
    portal, queries, missingDocs, loan, loanPending,
    ageing, taskBuckets: b, byPerson, months,
    yearLabel: basis === 'fy' ? `FY ${startYear}–${String(startYear + 1).slice(2)}` : `${startYear}`,
  }
}
