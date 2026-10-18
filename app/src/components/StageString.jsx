import { cx } from '@/lib/utils'

// A project's lifecycle drawn as a string of solar modules wired in series.
// Each module is a 3×2 grid of cells: finished stages are fully lit, the live
// stage lights cells in proportion to its substage progress, later stages are dark.

const CELLS = 6

function litCells(stage, substage) {
  const n = stage.substages.length || 1
  const i = Math.max(0, stage.substages.indexOf(substage))
  return Math.max(1, Math.round(((i + 1) / n) * CELLS))
}

function Module({ state, lit = 0, blocked, size = 'md' }) {
  const cell = size === 'sm' ? 'h-[5px]' : 'h-[9px] sm:h-[11px]'
  return (
    <span
      className={cx(
        'grid grid-cols-3 gap-[2px] rounded-[5px] p-[3px] transition-colors',
        state === 'done' && 'bg-cell-deep',
        state === 'live' && (blocked ? 'bg-bad' : 'bg-[#3a2a00]'),
        state === 'live' && !blocked && size !== 'sm' && 'module-live',
        state === 'todo' && 'bg-line',
      )}
    >
      {Array.from({ length: CELLS }).map((_, i) => (
        <span
          key={i}
          className={cx(
            'rounded-[1.5px]',
            cell,
            state === 'done' && 'bg-cell',
            state === 'live' && (i < lit ? (blocked ? 'bg-[#f6c9c5]' : 'bg-sun') : 'bg-[#6b5310]'),
            state === 'todo' && 'bg-surface',
          )}
        />
      ))}
    </span>
  )
}

export function StageString({ stages, current, substage, blocked, onSelect, selected, startAt = 0 }) {
  const list = stages.slice(startAt)
  const curIdx = list.findIndex((s) => s.key === current)
  return (
    <div className="scroll-x -mx-1 px-1 pb-1">
      <ol className="flex min-w-[640px] items-start">
        {list.map((s, i) => {
          const state = i < curIdx ? 'done' : i === curIdx ? 'live' : 'todo'
          const isSel = selected === s.key
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                onClick={() => onSelect?.(s.key)}
                className={cx(
                  'group flex w-full min-w-0 flex-col items-stretch gap-2 rounded-[8px] p-1.5 text-left',
                  onSelect && 'cursor-pointer hover:bg-sunken',
                  isSel && 'bg-sunken',
                )}
                aria-current={state === 'live' ? 'step' : undefined}
                aria-label={`${s.name}: ${state === 'done' ? 'complete' : state === 'live' ? `in progress, ${substage}` : 'not started'}`}
              >
                <Module state={state} lit={state === 'live' ? litCells(s, substage) : 0} blocked={blocked} />
                <span className="min-w-0">
                  <span className={cx('block truncate text-[0.8125rem] font-semibold', state === 'todo' ? 'text-ink-3' : 'text-ink')}>{s.short}</span>
                  <span className="block truncate text-[0.75rem] text-ink-3">
                    {state === 'done' ? 'Done' : state === 'live' ? (blocked ? 'Blocked' : substage) : `Stage ${i + 1 + startAt}`}
                  </span>
                </span>
              </button>
              {i < list.length - 1 && (
                <span aria-hidden className={cx('mt-[17px] h-[2px] w-2 shrink-0 sm:mt-[20px]', i < curIdx ? 'bg-cell-deep' : 'bg-line-strong')} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Compact version for table rows.
export function MiniString({ stages, current, substage, blocked }) {
  const curIdx = stages.findIndex((s) => s.key === current)
  const cur = stages[curIdx]
  return (
    <span className="inline-flex items-center gap-[3px]" title={`${cur?.name}: ${substage}`} aria-label={`Stage ${curIdx + 1} of ${stages.length}, ${cur?.name}`}>
      {stages.map((s, i) => (
        <span
          key={s.key}
          className={cx(
            'h-3 w-[7px] rounded-[2px]',
            i < curIdx && 'bg-cell',
            i === curIdx && (blocked ? 'bg-bad' : 'bg-sun'),
            i > curIdx && 'bg-line',
          )}
        />
      ))}
    </span>
  )
}

// Fleet view: how many records sit in each stage right now.
export function FleetString({ stages, counts, onSelect, stalled = {} }) {
  const max = Math.max(1, ...stages.map((s) => counts[s.key] || 0))
  return (
    <div className="scroll-x -mx-1 px-1 pb-1">
      <ol className="flex min-w-[720px] items-stretch">
        {stages.map((s, i) => {
          const c = counts[s.key] || 0
          const lit = c === 0 ? 0 : Math.max(1, Math.round((c / max) * CELLS))
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                onClick={() => onSelect?.(s.key)}
                className="flex w-full min-w-0 cursor-pointer flex-col gap-2.5 rounded-[10px] p-2 text-left hover:bg-sunken"
                aria-label={`${s.name}: ${c} records`}
              >
                <span className="grid grid-cols-3 gap-[3px] rounded-[6px] bg-cell-deep p-[4px]">
                  {Array.from({ length: CELLS }).map((_, k) => (
                    <span key={k} className={cx('h-[14px] rounded-[2px]', k < lit ? 'bg-sun' : 'bg-cell')} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.375rem] font-bold leading-none text-ink">{c}</span>
                  <span className="mt-1 block truncate text-[0.8125rem] font-medium text-ink-2">{s.short}</span>
                  {stalled[s.key] ? (
                    <span className="mt-0.5 block truncate text-[0.75rem] font-medium text-warn">{stalled[s.key]} stalled</span>
                  ) : (
                    <span className="mt-0.5 block text-[0.75rem] text-ink-3">&nbsp;</span>
                  )}
                </span>
              </button>
              {i < stages.length - 1 && <span aria-hidden className="mt-[26px] h-[2px] w-2 shrink-0 bg-line-strong" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
