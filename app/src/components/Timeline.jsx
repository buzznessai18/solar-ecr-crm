import { ArrowRightLeft, CheckCircle2, ClipboardCheck, FolderOpen, GitMerge, ListChecks, MessageSquare, Pause, PencilLine, Plus, Settings2, ShieldAlert, UserRoundCog, Archive, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { cx, fmtDateTime } from '@/lib/utils'

const META = {
  created: [Plus, 'Created'],
  stage_change: [ArrowRightLeft, 'Stage change'],
  override: [ShieldAlert, 'Admin override'],
  approval: [ClipboardCheck, 'Decision'],
  request: [MessageSquare, 'Request'],
  assignment: [UserRoundCog, 'Assignment'],
  checklist: [ListChecks, 'Checklist'],
  update: [PencilLine, 'Update'],
  blocked: [Pause, 'Pause'],
  drive_link: [FolderOpen, 'Drive'],
  task: [CheckCircle2, 'Task'],
  merge: [GitMerge, 'Merge'],
  config: [Settings2, 'Configuration'],
  archive: [Archive, 'Archive'],
  export: [Download, 'Export'],
}

export function Timeline({ events, showEntity = false, empty = 'No history yet.' }) {
  const users = useStore((s) => s.users)
  if (!events.length) return <p className="py-6 text-center text-sm text-ink-3">{empty}</p>
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const [Icon, label] = META[e.type] || [PencilLine, e.type]
        const actor = users.find((u) => u.id === e.actor)?.name || 'System'
        const link = e.entity === 'project' ? `/projects/${e.entityId}` : e.entity === 'lead' ? `/leads/${e.entityId}` : e.parent ? (e.parent.includes('-P-') ? `/projects/${e.parent}` : `/leads/${e.parent}`) : null
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 bottom-0 w-px bg-line" />}
            <span
              className={cx(
                'relative grid size-8 shrink-0 place-items-center rounded-full border',
                e.type === 'override' ? 'border-[#f0c2be] bg-bad-soft text-bad' : e.type === 'stage_change' ? 'border-[#c7d4f7] bg-cell-soft text-cell' : e.type === 'approval' ? 'border-[#b8e0c9] bg-good-soft text-good' : 'border-line bg-surface text-ink-3',
              )}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm">
                <span className="font-semibold text-ink">{actor}</span>
                <span className="text-ink-3"> {label.toLowerCase()}</span>
                {showEntity && link && (
                  <>
                    <span className="text-ink-3"> on </span>
                    <Link to={link} className="font-semibold text-cell hover:underline">{e.entity === 'task' ? e.parent : e.entityId}</Link>
                  </>
                )}
              </p>
              {(e.from || e.to) && (
                <p className="mt-1 text-sm text-ink-2">
                  {e.from && <span className="text-ink-3 line-through decoration-line-strong">{e.from}</span>}
                  {e.from && e.to && <span className="mx-1.5 text-ink-3">to</span>}
                  {e.to && <span className="font-medium text-ink">{e.to}</span>}
                </p>
              )}
              {e.comment && <p className="mt-1 max-w-[70ch] text-sm text-ink-2">{e.comment}</p>}
              {e.reason && <p className="mt-1 rounded-[6px] bg-bad-soft px-2 py-1 text-[0.8125rem] text-bad">Reason: {e.reason}</p>}
              <p className="mt-1 text-[0.75rem] text-ink-3">{fmtDateTime(e.at)}{e.ref ? `, ref ${e.ref}` : ''}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
