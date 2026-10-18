import { Download, FolderKanban, FolderX, Pause, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DISTRICTS, PROJECT_STAGE_KEYS } from '@/lib/config'
import { useMe, useStore, useUserName } from '@/lib/store'
import { ageLabel, cx, daysBetween, downloadCSV, fmtINR, fmtKw, isAdmin, todayISO, visibleProjects } from '@/lib/utils'
import { MiniString } from '@/components/StageString'
import { Chip, EmptyState, Input, PageHeader, Person, Select, StatusChip } from '@/components/ui'

export default function Projects() {
  const state = useStore()
  const me = useMe()
  const name = useUserName()
  const nav = useNavigate()
  const logExport = useStore((s) => s.logExport)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const stages = state.config.stages
  const pStages = stages.filter((s) => PROJECT_STAGE_KEYS.includes(s.key))
  const schemes = state.config.schemes

  const f = Object.fromEntries(['stage', 'type', 'scheme', 'owner', 'district', 'flag'].map((k) => [k, params.get(k) || '']))
  const setParam = (k) => (e) => {
    const v = e?.target ? e.target.value : e
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    setParams(n, { replace: true })
  }

  const all = visibleProjects(state, me)
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all
      .filter((p) => !f.stage || p.stage === f.stage)
      .filter((p) => !f.type || p.type === f.type)
      .filter((p) => !f.scheme || p.scheme === f.scheme)
      .filter((p) => !f.owner || p.owner === f.owner)
      .filter((p) => !f.district || p.district === f.district)
      .filter((p) => {
        if (f.flag === 'blocked') return !!p.blocked
        if (f.flag === 'nodrive') return !p.drive.root
        if (f.flag === 'query') return p.docs.portal.status === 'Query raised' || p.milestones.some((m) => m.status === 'Query raised')
        return true
      })
      .filter((p) => !s || [p.id, p.client, p.contact, p.phone, p.consumerNo, p.address, p.taluka, name(p.owner)].some((v) => String(v || '').toLowerCase().includes(s)))
      .sort((a, b) => PROJECT_STAGE_KEYS.indexOf(a.stage) - PROJECT_STAGE_KEYS.indexOf(b.stage) || (a.stageEnteredAt < b.stageEnteredAt ? -1 : 1))
  }, [all, q, f.stage, f.type, f.scheme, f.owner, f.district, f.flag, name])

  const exportRows = () => {
    downloadCSV(`ecorays-projects-${todayISO()}.csv`, rows.map((p) => ({
      'Project ID': p.id, 'Lead ID': p.leadId, Client: p.client, Type: p.type, Scheme: schemes.find((s) => s.key === p.scheme)?.name,
      'Capacity kWp': p.capacityKw, 'Value INR': p.value, 'Won date': p.wonDate, Owner: name(p.owner), 'Installation owner': name(p.installationOwner),
      Stage: stages.find((s) => s.key === p.stage)?.name, Substage: p.substage, 'Days in stage': daysBetween(p.stageEnteredAt),
      'Portal status': p.docs.portal.status, 'Loan status': p.docs.loan.status, Subsidy: p.subsidy, District: p.district, Taluka: p.taluka,
      'Installed on': p.installation.actualDate, 'Commissioned on': p.commissioning.date,
    })))
    logExport('projects', rows.length)
    toast.success(`Exported ${rows.length} projects`)
  }

  const counts = Object.fromEntries(pStages.map((s) => [s.key, all.filter((p) => p.stage === s.key).length]))

  return (
    <>
      <PageHeader
        title="Projects"
        description={isAdmin(me) ? 'Won clients, from survey to O&M. Each project keeps its original lead history.' : 'Projects you own, install, or have tasks on.'}
        actions={isAdmin(me) && <button className="btn btn-secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Export</button>}
      />

      <div className="scroll-x mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5">
          <button onClick={() => setParam('stage')('')} className={cx('rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap', !f.stage ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-surface')}>
            All stages <span className="opacity-60">{all.length}</span>
          </button>
          {pStages.map((s) => (
            <button key={s.key} onClick={() => setParam('stage')(s.key)} className={cx('rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap', f.stage === s.key ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-surface')}>
              {s.short} <span className="opacity-60">{counts[s.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client, project ID, phone" className="!pl-9" aria-label="Filter projects" />
        </div>
        <Select className="!w-auto" value={f.type} onChange={setParam('type')} placeholder="Any type" options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]} aria-label="Type" />
        <Select className="!w-auto" value={f.scheme} onChange={setParam('scheme')} placeholder="Any scheme" options={schemes.map((s) => ({ value: s.key, label: s.name }))} aria-label="Scheme" />
        {isAdmin(me) && <Select className="!w-auto" value={f.owner} onChange={setParam('owner')} placeholder="Any owner" options={state.users.map((u) => ({ value: u.id, label: u.name }))} aria-label="Owner" />}
        <Select className="!w-auto" value={f.district} onChange={setParam('district')} placeholder="Any district" options={Object.keys(DISTRICTS)} aria-label="District" />
        <Select className="!w-auto" value={f.flag} onChange={setParam('flag')} placeholder="No flag filter" options={[{ value: 'blocked', label: 'Blocked or waiting' }, { value: 'query', label: 'Open portal or utility query' }, { value: 'nodrive', label: 'Missing Drive folder' }]} aria-label="Flags" />
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <EmptyState icon={FolderKanban} title="No projects match" action={<button className="btn btn-secondary" onClick={() => { setParams({}); setQ('') }}>Clear filters</button>}>
            Projects are created when a lead is approved as won.
          </EmptyState>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="scroll-x hidden md:block">
            <table className="data-table">
              <thead>
                <tr><th>Project</th><th>Progress</th><th>Owner</th><th className="!text-right">Size and value</th><th>Scheme</th><th className="!text-right">In stage</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const days = daysBetween(p.stageEnteredAt)
                  return (
                    <tr key={p.id} className="row-link" onClick={() => nav(`/projects/${p.id}`)}>
                      <td>
                        <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-cell">{p.client}</Link>
                        <p className="text-[0.8125rem] text-ink-3">{p.id}, {p.type === 'commercial' ? 'Commercial' : 'Residential'}, {p.taluka}</p>
                      </td>
                      <td>
                        <MiniString stages={stages.slice(2)} current={p.stage} substage={p.substage} blocked={!!p.blocked} />
                        <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-ink-2">
                          {p.blocked && <Pause size={12} className="text-bad" />}
                          {stages.find((s) => s.key === p.stage)?.short}: {p.substage}
                        </p>
                      </td>
                      <td><Person userId={p.owner} size={22} /></td>
                      <td className="text-right"><p className="font-medium">{fmtKw(p.capacityKw)}</p><p className="text-[0.8125rem] text-ink-3">{fmtINR(p.value)}</p></td>
                      <td>
                        <p className="text-ink-2">{schemes.find((s) => s.key === p.scheme)?.name}</p>
                        {p.docs.portal.status !== 'Not applicable' && <StatusChip value={p.docs.portal.status} />}
                        {!p.drive.root && <Chip tone="bad" icon={FolderX} className="ml-1">No Drive</Chip>}
                      </td>
                      <td className={cx('text-right font-medium', days > 21 && p.stage !== 'om' ? 'text-warn' : 'text-ink-2')}>{ageLabel(p.stageEnteredAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{p.client}</p>
                      <p className="text-[0.8125rem] text-ink-3">{p.id}, {fmtKw(p.capacityKw)}</p>
                    </div>
                    <span className="text-[0.8125rem] text-ink-3">{ageLabel(p.stageEnteredAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MiniString stages={stages.slice(2)} current={p.stage} substage={p.substage} blocked={!!p.blocked} />
                    <span className="truncate text-[0.8125rem] text-ink-2">{p.substage}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-[0.8125rem] text-ink-3">{rows.length} projects</p>
        </div>
      )}
    </>
  )
}
