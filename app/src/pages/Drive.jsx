import { ExternalLink, FolderOpen, FolderX, ShieldCheck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DRIVE_FOLDERS } from '@/lib/config'
import { useMe, useStore } from '@/lib/store'
import { cx, isAdmin, isValidDriveUrl, visibleProjects } from '@/lib/utils'
import { Callout, Chip, EmptyState, PageHeader, Segmented } from '@/components/ui'

function health(p) {
  const links = [p.drive.root, ...DRIVE_FOLDERS.map((f) => p.drive.stages[f.key])]
  const invalid = links.filter((u) => u && !isValidDriveUrl(u)).length
  const linked = links.filter((u) => u && isValidDriveUrl(u)).length
  return { invalid, linked, total: links.length, rootOk: !!p.drive.root && isValidDriveUrl(p.drive.root) }
}

export default function Drive() {
  const state = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [filter, setFilter] = useState('all')
  const projects = visibleProjects(state, me).map((p) => ({ p, h: health(p) }))
  const rows = projects.filter(({ h }) => filter === 'all' || (filter === 'repair' ? h.invalid > 0 || !h.rootOk : h.linked < h.total))
  const noRoot = projects.filter(({ h }) => !h.rootOk).length
  const broken = projects.filter(({ h }) => h.invalid > 0).length
  const mode = state.config.settings.driveMode

  return (
    <>
      <PageHeader title="Drive folders" description="Each project has one root folder on the company Shared Drive with a subfolder per stage. The tracker stores links only." />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="panel px-5 py-4">
          <p className="text-[0.8125rem] font-medium text-ink-2">Projects with a root folder</p>
          <p className="mt-1 text-[1.75rem] font-bold leading-none">{projects.length - noRoot}<span className="text-base font-semibold text-ink-3"> of {projects.length}</span></p>
        </div>
        <div className="panel px-5 py-4">
          <p className="text-[0.8125rem] font-medium text-ink-2">Links needing repair</p>
          <p className={cx('mt-1 text-[1.75rem] font-bold leading-none', broken ? 'text-bad' : '')}>{broken}</p>
        </div>
        <div className="panel px-5 py-4">
          <p className="text-[0.8125rem] font-medium text-ink-2">Folder creation</p>
          <p className="mt-1.5 font-semibold">{mode === 'auto' ? 'Automatic, via backend service' : 'Manual links (pilot)'}</p>
          {isAdmin(me) && <Link to="/settings/drive" className="text-[0.8125rem] font-medium text-cell hover:underline">Change in settings</Link>}
        </div>
      </div>

      <div className="mb-4"><Callout tone="cell" icon={ShieldCheck} title="Access follows Google Drive">A link does not grant upload rights. If a folder will not open, your Google account needs access to the Shared Drive. Customer folders are never shared publicly.</Callout></div>

      <div className="mb-4">
        <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All projects' }, { value: 'incomplete', label: 'Missing folders' }, { value: 'repair', label: 'Needs repair' }]} />
      </div>

      {rows.length === 0 ? (
        <div className="panel"><EmptyState icon={FolderOpen} title="Every folder is linked" /></div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="scroll-x">
            <table className="data-table min-w-[720px]">
              <thead><tr><th>Project</th><th>Stage folders</th><th>Status</th><th className="!text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map(({ p, h }) => (
                  <tr key={p.id} className="row-link" onClick={() => nav(`/projects/${p.id}/drive`)}>
                    <td>
                      <p className="font-semibold">{p.id} {p.client.split(' ').slice(0, 2).join(' ')}</p>
                      <p className="text-[0.8125rem] text-ink-3">{p.client}</p>
                    </td>
                    <td>
                      <div className="flex gap-[3px]" aria-label={`${h.linked} of ${h.total} folders linked`}>
                        {[p.drive.root, ...DRIVE_FOLDERS.map((f) => p.drive.stages[f.key])].map((u, i) => (
                          <span key={i} title={i === 0 ? 'Root' : DRIVE_FOLDERS[i - 1].name} className={cx('h-4 w-3 rounded-[3px]', !u ? 'bg-line' : isValidDriveUrl(u) ? 'bg-cell' : 'bg-bad')} />
                        ))}
                      </div>
                      <p className="mt-1 text-[0.8125rem] text-ink-3">{h.linked} of {h.total} linked</p>
                    </td>
                    <td>
                      {!h.rootOk ? <Chip tone="bad" icon={FolderX}>No root folder</Chip> : h.invalid ? <Chip tone="bad" icon={Wrench}>Invalid link</Chip> : h.linked < h.total ? <Chip tone="warn">Partly linked</Chip> : <Chip tone="good">Complete</Chip>}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {h.rootOk && <a href={p.drive.root} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={14} /> Open</a>}
                        <Link to={`/projects/${p.id}/drive`} className="btn btn-ghost btn-sm">Manage</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
