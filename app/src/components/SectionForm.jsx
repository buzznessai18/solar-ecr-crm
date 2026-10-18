import { useState } from 'react'
import { cx, fmtDate } from '@/lib/utils'
import { Field, Input, KV, Select, StatusChip, Textarea, UserSelect } from './ui'
import { useUserName } from '@/lib/store'

// A small form that shows values read-only for people without edit rights,
// and inline inputs with an explicit save for those who have them.
export function SectionForm({ fields, value, editable, onSave, cols = 2, saveLabel = 'Save changes' }) {
  const [draft, setDraft] = useState(value)
  const name = useUserName()
  // Reset the draft when the saved value changes (after a save elsewhere).
  const [prev, setPrev] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setDraft(value)
  }
  const dirty = fields.some((f) => (draft?.[f.key] ?? '') !== (value?.[f.key] ?? ''))
  const visible = fields.filter((f) => !f.hidden)

  if (!editable) {
    return (
      <dl className={cx('grid gap-x-6 gap-y-4', cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : '')}>
        {visible.map((f) => (
          <KV key={f.key} label={f.label} className={f.wide ? 'sm:col-span-full' : ''}>
            {f.type === 'date' ? fmtDate(value?.[f.key]) : f.type === 'user' ? name(value?.[f.key]) : f.status ? <StatusChip value={value?.[f.key]} /> : value?.[f.key] || '—'}
          </KV>
        ))}
      </dl>
    )
  }

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e?.target ? e.target.value : e }))
  const save = () => {
    const patch = {}
    fields.forEach((f) => {
      if ((draft?.[f.key] ?? '') !== (value?.[f.key] ?? '')) patch[f.key] = f.type === 'number' ? Number(draft[f.key]) : draft[f.key]
    })
    const changed = fields.filter((f) => f.key in patch).map((f) => `${f.label.toLowerCase()}: ${f.type === 'user' ? name(patch[f.key]) : patch[f.key] || 'cleared'}`)
    onSave(patch, changed.join('; '))
  }

  return (
    <div>
      <div className={cx('grid gap-4', cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : '')}>
        {visible.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint} className={f.wide ? 'sm:col-span-full' : ''}>
            {f.type === 'select' ? (
              <Select value={draft?.[f.key] || ''} onChange={set(f.key)} options={f.options} placeholder={f.placeholder} />
            ) : f.type === 'textarea' ? (
              <Textarea rows={2} className="!min-h-[3.5rem]" value={draft?.[f.key] || ''} onChange={set(f.key)} />
            ) : f.type === 'user' ? (
              <UserSelect value={draft?.[f.key]} onChange={set(f.key)} filter={f.filter} />
            ) : (
              <Input type={f.type || 'text'} value={draft?.[f.key] ?? ''} onChange={set(f.key)} step={f.step} min={f.min} />
            )}
          </Field>
        ))}
      </div>
      {dirty && (
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn btn-secondary" onClick={() => setDraft(value)}>Discard</button>
          <button className="btn btn-primary" onClick={save}>{saveLabel}</button>
        </div>
      )}
    </div>
  )
}
