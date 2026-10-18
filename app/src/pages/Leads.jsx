import { AlertTriangle, Download, KanbanSquare, List, Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LEAD_SOURCES } from '@/lib/config'
import { useMe, useStore, useUserName } from '@/lib/store'
import { cx, daysBetween, downloadCSV, fmtShortDate, isAdmin, relDays, todayISO, visibleLeads } from '@/lib/utils'
import { Chip, EmptyState, Input, LeadStatus, PageHeader, Person, Segmented, Select } from '@/components/ui'
import { NewLeadDialog } from '@/components/dialogs/NewLeadDialog'

const COLUMNS = [
  ['lead', 'New'], ['lead', 'Contacted'], ['sales', 'First meeting'], ['sales', 'Second meeting'], ['sales', 'Third meeting'], ['sales', 'Fourth meeting'],
]

export default function Leads() {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const nav = useNavigate()
  const logExport = useStore((s) => s.logExport)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('leads-view') || 'table' } catch { return 'table' }
  })
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const stale = state.config.settings.staleDays

  const status = params.get('status') || 'active'
  const stage = params.get('stage') || ''
  const type = params.get('type') || ''
  const owner = params.get('owner') || ''
  const source = params.get('source') || ''
  const setParam = (k) => (e) => {
    const v = e?.target ? e.target.value : e
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    setParams(n, { replace: true })
  }

  const all = visibleLeads(state, me)
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all
      .filter((l) => {
        if (status === 'active') return ['open', 'won-pending', 'loss-pending'].includes(l.status)
        if (status === 'stalled') return ['open', 'won-pending', 'loss-pending'].includes(l.status) && daysBetween(l.lastMovedAt) > stale
        return status === 'all' || l.status === status
      })
      .filter((l) => !stage || l.stage === stage)
      .filter((l) => !type || l.type === type)
      .filter((l) => !owner || l.owner === owner)
      .filter((l) => !source || l.source === source)
      .filter((l) => !s || [l.id, l.contact, l.businessName, l.phone, l.email, l.consumerNo, l.address, l.taluka].some((v) => String(v || '').toLowerCase().includes(s)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [all, q, status, stage, type, owner, source, stale])

  const setViewP = (v) => {
    setView(v)
    try { localStorage.setItem('leads-view', v) } catch { /* storage unavailable */ }
  }

  const exportRows = () => {
    downloadCSV(`ecorays-leads-${todayISO()}.csv`, rows.map((l) => ({
      'Lead ID': l.id, Created: l.createdAt.slice(0, 10), Type: l.type, Contact: l.contact, Business: l.businessName, Phone: l.phone, Email: l.email,
      Source: l.source, Referrer: l.referrer, District: l.district, Taluka: l.taluka, Owner: name(l.owner), Stage: l.stage, Substage: l.substage,
      Status: l.status, 'Next action': l.nextAction, 'Next action date': l.nextActionDate, 'Last moved': l.lastMovedAt.slice(0, 10),
    })))
    logExport('leads', rows.length)
    toast.success(`Exported ${rows.length} leads`)
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description={isAdmin(me) ? 'Every prospect and referral across the company, from first contact to a won or lost decision.' : 'Prospects and referrals you own.'}
        actions={
          <>
            {isAdmin(me) && <button className="btn btn-secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Export</button>}
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={17} /> New lead</button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={status}
            onChange={setParam('status')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'stalled', label: 'Stalled' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
              { value: 'all', label: 'All' },
            ]}
          />
          <div className="ml-auto">
            <Segmented size="sm" value={view} onChange={setViewP} options={[{ value: 'table', label: <span className="flex items-center gap-1.5"><List size={15} />List</span> }, { value: 'board', label: <span className="flex items-center gap-1.5"><KanbanSquare size={15} />Board</span> }]} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, consumer no." className="!pl-9" aria-label="Filter leads" />
          </div>
          <Select className="!w-auto" value={stage} onChange={setParam('stage')} placeholder="Any stage" options={[{ value: 'lead', label: 'Lead or referral' }, { value: 'sales', label: 'Sales' }]} aria-label="Stage" />
          <Select className="!w-auto" value={type} onChange={setParam('type')} placeholder="Any type" options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]} aria-label="Type" />
          <Select className="!w-auto" value={source} onChange={setParam('source')} placeholder="Any source" options={LEAD_SOURCES} aria-label="Source" />
          {isAdmin(me) && <Select className="!w-auto" value={owner} onChange={setParam('owner')} placeholder="Any owner" options={state.users.map((u) => ({ value: u.id, label: u.name }))} aria-label="Owner" />}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <EmptyState icon={Users} title="No leads match these filters" action={<button className="btn btn-secondary" onClick={() => { setParams({}); setQ('') }}>Clear filters</button>}>
            Try a different status or clear the search.
          </EmptyState>
        </div>
      ) : view === 'table' ? (
        <div className="panel overflow-hidden">
          {/* desktop table */}
          <div className="scroll-x hidden md:block">
            <table className="data-table">
              <thead>
                <tr><th>Lead</th><th>Source</th><th>Stage</th><th>Owner</th><th>Next action</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const idle = daysBetween(l.lastMovedAt)
                  return (
                    <tr key={l.id} className="row-link" onClick={() => nav(`/leads/${l.id}`)}>
                      <td>
                        <Link to={`/leads/${l.id}`} className="font-semibold text-ink hover:text-cell" onClick={(e) => e.stopPropagation()}>{l.businessName || l.contact}</Link>
                        <p className="text-[0.8125rem] text-ink-3">{l.id}, {l.type === 'commercial' ? 'Commercial' : 'Residential'}, {l.taluka}</p>
                      </td>
                      <td className="text-ink-2">{l.source}{l.referrer && <p className="max-w-[180px] truncate text-[0.8125rem] text-ink-3">{l.referrer}</p>}</td>
                      <td>
                        <p className="text-ink">{l.substage}</p>
                        <p className={cx('text-[0.8125rem]', idle > stale && ['open', 'won-pending', 'loss-pending'].includes(l.status) ? 'font-semibold text-warn' : 'text-ink-3')}>
                          {idle > stale && ['open', 'won-pending', 'loss-pending'].includes(l.status) ? `No movement for ${idle} days` : `Moved ${fmtShortDate(l.lastMovedAt)}`}
                        </p>
                      </td>
                      <td><Person userId={l.owner} size={22} /></td>
                      <td className="max-w-[240px]">
                        <p className="truncate text-ink-2">{l.nextAction}</p>
                        {l.nextActionDate && <p className={cx('text-[0.8125rem]', l.nextActionDate < todayISO() ? 'font-semibold text-bad' : 'text-ink-3')}>{relDays(l.nextActionDate)}</p>}
                      </td>
                      <td><LeadStatus status={l.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* mobile cards */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((l) => (
              <li key={l.id}>
                <Link to={`/leads/${l.id}`} className="block px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.businessName || l.contact}</p>
                      <p className="text-[0.8125rem] text-ink-3">{l.substage}, {l.taluka}</p>
                    </div>
                    <LeadStatus status={l.status} />
                  </div>
                  <p className="mt-1.5 truncate text-sm text-ink-2">{l.nextAction}{l.nextActionDate && <span className={cx(l.nextActionDate < todayISO() ? 'text-bad' : 'text-ink-3')}>, {relDays(l.nextActionDate).toLowerCase()}</span>}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-[0.8125rem] text-ink-3">{rows.length} leads</p>
        </div>
      ) : (
        <div className="scroll-x -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1100px] grid-cols-6 gap-3">
            {COLUMNS.map(([st, sub]) => {
              const col = rows.filter((l) => l.stage === st && l.substage === sub)
              return (
                <section key={sub} className="flex min-w-0 flex-col rounded-[14px] bg-sunken p-2" aria-label={sub}>
                  <header className="flex items-center justify-between px-2 pb-2 pt-1">
                    <h2 className="text-sm font-semibold">{sub}</h2>
                    <span className="text-[0.8125rem] font-semibold text-ink-3">{col.length}</span>
                  </header>
                  <div className="flex flex-col gap-2">
                    {col.map((l) => {
                      const idle = daysBetween(l.lastMovedAt)
                      return (
                        <Link key={l.id} to={`/leads/${l.id}`} className="rounded-[10px] border border-line bg-surface p-3 hover:border-line-strong">
                          <p className="text-sm font-semibold leading-snug">{l.businessName || l.contact}</p>
                          <p className="mt-0.5 text-[0.75rem] text-ink-3">{l.taluka}{l.estimatedKw ? `, ~${l.estimatedKw} kWp` : ''}</p>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <Person userId={l.owner} size={20} />
                          </div>
                          {(l.status !== 'open' || idle > stale) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {l.status !== 'open' && <LeadStatus status={l.status} />}
                              {idle > stale && <Chip tone="warn" icon={AlertTriangle}>{idle}d idle</Chip>}
                            </div>
                          )}
                        </Link>
                      )
                    })}
                    {col.length === 0 && <p className="px-2 py-4 text-center text-[0.8125rem] text-ink-3">None</p>}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
      <NewLeadDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  )
}
