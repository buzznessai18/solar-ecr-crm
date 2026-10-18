import * as Dialog from '@radix-ui/react-dialog'
import * as DM from '@radix-ui/react-dropdown-menu'
import { AlertTriangle, Check, CheckCircle2, Circle, CircleDashed, CircleDot, Clock, Eye, Hourglass, Minus, OctagonAlert, X, XCircle } from 'lucide-react'
import { forwardRef } from 'react'
import { cx, initials } from '@/lib/utils'
import { useStore } from '@/lib/store'

// ---------- layout ----------

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="text-[1.625rem] font-bold leading-tight text-ink sm:text-[1.875rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, action, children, className, bodyClass, description }) {
  return (
    <section className={cx('panel', className)}>
      {(title || action) && (
        <div className="panel-head">
          <div className="min-w-0">
            {title && <h2 className="panel-title">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8125rem] text-ink-3">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cx(bodyClass ?? 'px-5 pb-5')}>{children}</div>
    </section>
  )
}

export function EmptyState({ icon: Icon = CircleDashed, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-sunken text-ink-3">
        <Icon size={20} />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-[46ch] text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function KV({ label, children, className }) {
  return (
    <div className={cx('min-w-0', className)}>
      <dt className="text-[0.8125rem] text-ink-3">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{children ?? '—'}</dd>
    </div>
  )
}

// ---------- form ----------

// The label wraps its control, so every input is labelled without wiring ids.
export function Field({ label, hint, error, children, className, required }) {
  return (
    <div className={className}>
      <label className="block">
        {label && (
          <span className="field-label">
            {label}
            {required && <span className="text-bad"> *</span>}
          </span>
        )}
        {children}
      </label>
      {error ? <p className="mt-1 text-[0.8125rem] text-bad">{error}</p> : hint ? <p className="mt-1 text-[0.8125rem] text-ink-3">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} className={cx('input', props.className)} />
})

export function Select({ options, placeholder, className, ...props }) {
  return (
    <select {...props} className={cx('input', className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <option key={v} value={v} disabled={o.disabled}>
            {l}
          </option>
        )
      })}
    </select>
  )
}

export function Textarea(props) {
  return <textarea {...props} className={cx('input', props.className)} />
}

export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer absolute inset-0 cursor-[inherit] appearance-none rounded-[5px] border border-line-strong bg-surface checked:border-cell checked:bg-cell focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cell"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <Check size={13} strokeWidth={3} className="pointer-events-none relative text-white opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="block text-[0.8125rem] text-ink-3">{description}</span>}
      </span>
    </label>
  )
}

export function Segmented({ value, onChange, options, size = 'md' }) {
  return (
    <div className="inline-flex rounded-[8px] border border-line bg-sunken p-0.5" role="radiogroup">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cx(
              'rounded-[6px] font-semibold transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-[0.8125rem]' : 'px-3 py-1.5 text-sm',
              on ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(23_32_51/0.08)]' : 'text-ink-3 hover:text-ink',
            )}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

// ---------- chips ----------

const TONES = {
  neutral: 'bg-sunken text-ink-2',
  cell: 'bg-cell-soft text-cell-deep',
  sun: 'bg-sun-soft text-sun-ink',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  wait: 'bg-wait-soft text-wait',
  outline: 'border border-line text-ink-2',
}

export function Chip({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cx('chip', TONES[tone], className)}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

const TASK_STATUS_META = {
  'To Do': ['neutral', Circle],
  'In Progress': ['cell', CircleDot],
  Waiting: ['wait', Hourglass],
  Blocked: ['bad', OctagonAlert],
  'Under Review': ['sun', Eye],
  Completed: ['good', CheckCircle2],
}

export function TaskStatus({ status }) {
  const [tone, icon] = TASK_STATUS_META[status] || ['neutral', Circle]
  return <Chip tone={tone} icon={icon}>{status}</Chip>
}

const GENERIC_STATUS = {
  good: ['Approved', 'Verified', 'Signed', 'Done', 'Disbursed', 'Credited', 'Feasible', 'Completed', 'Ready', 'Yes', 'won', 'approved', 'Active'],
  cell: ['Submitted', 'Received', 'Sent', 'In progress', 'In review', 'Pending', 'Partially ready', 'open'],
  warn: ['Query raised', 'Returned for correction', 'Feasible with conditions', 'Re-survey required', 'won-pending', 'loss-pending', 'pending'],
  bad: ['Rejected', 'Not feasible', 'Missing', 'lost', 'rejected', 'Blocked'],
}
const ICONS = { good: CheckCircle2, cell: Clock, warn: AlertTriangle, bad: XCircle, neutral: Minus }

export function StatusChip({ value, label }) {
  if (!value) return <span className="text-ink-3">—</span>
  const tone = Object.keys(GENERIC_STATUS).find((k) => GENERIC_STATUS[k].includes(value)) || 'neutral'
  return <Chip tone={tone} icon={ICONS[tone]}>{label || value}</Chip>
}

export function LeadStatus({ status }) {
  const map = {
    open: ['cell', 'Open'],
    'won-pending': ['warn', 'Won pending approval'],
    'loss-pending': ['warn', 'Loss pending approval'],
    won: ['good', 'Won'],
    lost: ['bad', 'Lost'],
    merged: ['neutral', 'Merged'],
  }
  const [tone, label] = map[status] || ['neutral', status]
  return <Chip tone={tone} icon={ICONS[tone]}>{label}</Chip>
}

export function Priority({ value }) {
  const tone = { Urgent: 'bad', High: 'warn', Medium: 'outline', Low: 'outline' }[value]
  return <Chip tone={tone}>{value}</Chip>
}

// ---------- people ----------

const AVATAR_HUES = ['#1e4fd8', '#0f7d6a', '#8a4fc9', '#b4561f', '#2f6f9e', '#6d7a1f', '#a33a6b', '#4a5468']

export function Avatar({ userId, size = 28, className }) {
  const user = useStore((s) => s.users.find((u) => u.id === userId))
  const i = useStore((s) => s.users.findIndex((u) => u.id === userId))
  if (!user) {
    return <span className={cx('grid shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-ink-3', className)} style={{ width: size, height: size }}>?</span>
  }
  return (
    <span
      title={user.name}
      className={cx('grid shrink-0 place-items-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: AVATAR_HUES[i % AVATAR_HUES.length], fontSize: size * 0.38 }}
    >
      {initials(user.name)}
    </span>
  )
}

export function Person({ userId, sub, size = 26 }) {
  const user = useStore((s) => s.users.find((u) => u.id === userId))
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar userId={userId} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{user?.name || 'Unassigned'}</span>
        {sub && <span className="block truncate text-[0.8125rem] text-ink-3">{sub}</span>}
      </span>
    </span>
  )
}

export function UserSelect({ value, onChange, placeholder = 'Select a person', filter, ...rest }) {
  const users = useStore((s) => s.users)
  const list = users.filter((u) => u.active && (!filter || filter(u)))
  return (
    <Select
      {...rest}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      options={list.map((u) => ({ value: u.id, label: `${u.name}, ${u.title.toLowerCase()}` }))}
    />
  )
}

// ---------- overlays ----------

export function Modal({ open, onOpenChange, title, description, children, footer, width = 560 }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[rgb(23_32_51/0.45)]" />
        <Dialog.Content
          className={cx(
            'dialog-content fixed z-50 flex max-h-[92dvh] flex-col bg-surface shadow-[0_24px_60px_-12px_rgb(23_32_51/0.35)] focus:outline-none',
            'inset-x-0 bottom-0 rounded-t-[18px]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px]',
          )}
          style={{ maxWidth: width }}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-2">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="btn btn-ghost btn-icon btn-sm -mr-1.5 -mt-1" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Menu({ trigger, items, align = 'end' }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-[10px] border border-line bg-surface p-1 shadow-[0_12px_32px_-8px_rgb(23_32_51/0.25)]"
        >
          {items.filter(Boolean).map((it, i) =>
            it === '-' ? (
              <DM.Separator key={i} className="my-1 h-px bg-line" />
            ) : (
              <DM.Item
                key={it.label}
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-sunken',
                  it.danger ? 'text-bad' : 'text-ink',
                )}
              >
                {it.icon && <it.icon size={16} className={it.danger ? '' : 'text-ink-3'} />}
                <span className="min-w-0 flex-1">
                  {it.label}
                  {it.hint && <span className="block text-[0.75rem] text-ink-3">{it.hint}</span>}
                </span>
              </DM.Item>
            ),
          )}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  )
}

// ---------- misc ----------

export function Meter({ value, max, tone = 'cell' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken" role="meter" aria-valuenow={value} aria-valuemax={max}>
      <div className={cx('h-full rounded-full', tone === 'sun' ? 'bg-sun' : tone === 'good' ? 'bg-good' : 'bg-cell')} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Callout({ tone = 'warn', icon: Icon = AlertTriangle, title, children, action }) {
  const tones = {
    warn: 'border-[#f1d39a] bg-warn-soft text-warn',
    bad: 'border-[#f0c2be] bg-bad-soft text-bad',
    cell: 'border-[#c7d4f7] bg-cell-soft text-cell-deep',
    good: 'border-[#b8e0c9] bg-good-soft text-good',
  }
  return (
    <div className={cx('flex flex-col gap-3 rounded-[10px] border px-4 py-3 sm:flex-row sm:items-start', tones[tone])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5 text-ink-2">{children}</div>}
      </div>
      {action}
    </div>
  )
}
