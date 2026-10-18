import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { Timeline } from '@/components/Timeline'
import { PageHeader, Panel, Select } from '@/components/ui'

const TYPES = [
  ['stage_change', 'Stage changes'],
  ['override', 'Admin overrides'],
  ['approval', 'Decisions'],
  ['request', 'Requests'],
  ['assignment', 'Assignments'],
  ['task', 'Task updates'],
  ['drive_link', 'Drive links'],
  ['config', 'Configuration'],
  ['export', 'Exports'],
  ['created', 'Created records'],
]

export default function Activity() {
  const events = useStore((s) => s.events)
  const users = useStore((s) => s.users)
  const [type, setType] = useState('')
  const [actor, setActor] = useState('')
  const [limit, setLimit] = useState(60)
  const rows = useMemo(() => events.filter((e) => (!type || e.type === type) && (!actor || e.actor === actor)), [events, type, actor])

  return (
    <>
      <PageHeader title="Activity log" description="Every creation, stage change, approval, override, assignment, Drive link and configuration change. The log cannot be edited or deleted." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="!w-auto" value={type} onChange={(e) => setType(e.target.value)} placeholder="All event types" options={TYPES.map(([value, label]) => ({ value, label }))} aria-label="Event type" />
        <Select className="!w-auto" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Everyone" options={users.map((u) => ({ value: u.id, label: u.name }))} aria-label="Person" />
      </div>
      <Panel title={`${rows.length} events`}>
        <Timeline events={rows.slice(0, limit)} showEntity empty="No events match these filters." />
        {rows.length > limit && <button className="btn btn-secondary mt-5 w-full" onClick={() => setLimit((n) => n + 60)}>Show more</button>}
      </Panel>
    </>
  )
}
