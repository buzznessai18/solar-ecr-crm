import { AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DISTRICTS, LEAD_SOURCES } from '@/lib/config'
import { useMe, useStore } from '@/lib/store'
import { daysFromToday, findDuplicates, isAdmin } from '@/lib/utils'
import { Field, Input, Modal, Segmented, Select, Textarea, UserSelect } from '../ui'

const blank = () => ({
  type: 'residential',
  contact: '',
  businessName: '',
  phone: '',
  email: '',
  source: 'Website',
  referrer: '',
  address: '',
  district: 'North Goa',
  taluka: 'Bardez',
  consumerNo: '',
  estimatedKw: '',
  owner: '',
  nextAction: 'Call to schedule first meeting',
  nextActionDate: daysFromToday(1),
})

export function NewLeadDialog({ open, onOpenChange }) {
  const me = useMe()
  const state = useStore()
  const createLead = useStore((s) => s.createLead)
  const nav = useNavigate()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState({})
  const [confirmDup, setConfirmDup] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const admin = isAdmin(me)

  const dups = useMemo(() => findDuplicates(state, f), [state, f])

  const close = (v) => {
    onOpenChange(v)
    if (!v) {
      setF(blank())
      setErrors({})
      setConfirmDup(false)
    }
  }

  const submit = (e) => {
    e?.preventDefault()
    const err = {}
    if (!f.contact.trim()) err.contact = 'Enter the contact name.'
    if (f.type === 'commercial' && !f.businessName.trim()) err.businessName = 'Enter the business name.'
    if (String(f.phone).replace(/\D/g, '').length < 10) err.phone = 'Enter a 10-digit phone number.'
    if (!f.address.trim()) err.address = 'Enter the site address.'
    if (f.source === 'Referral' && !f.referrer.trim()) err.referrer = 'Referral leads need the referrer’s name.'
    if (admin && !f.owner) err.owner = 'Assign an owner. Admin-created leads must have one.'
    if (!f.nextAction.trim()) err.nextAction = 'Enter the next action.'
    setErrors(err)
    if (Object.keys(err).length) return
    if (dups.length && !confirmDup) {
      setConfirmDup(true)
      return
    }
    const id = createLead({ ...f, contact: f.contact.trim(), owner: admin ? f.owner : me.id })
    toast.success('Lead created', { description: `${id} is assigned to ${state.users.find((u) => u.id === (admin ? f.owner : me.id))?.name}.` })
    close(false)
    nav(`/leads/${id}`)
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="New lead"
      description={admin ? 'Add a prospect or referral and assign an owner.' : 'Add a prospect or referral. You will be its owner.'}
      width={640}
      footer={
        <>
          <button className="btn btn-secondary" onClick={() => close(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{confirmDup ? 'Create anyway' : 'Create lead'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Segmented value={f.type} onChange={set('type')} options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]} />
        </div>
        {f.type === 'commercial' && (
          <Field label="Business name" required error={errors.businessName} className="sm:col-span-2">
            <Input value={f.businessName} onChange={set('businessName')} aria-invalid={!!errors.businessName} placeholder="Registered business or institution" />
          </Field>
        )}
        <Field label={f.type === 'commercial' ? 'Site contact' : 'Contact name'} required error={errors.contact}>
          <Input value={f.contact} onChange={set('contact')} aria-invalid={!!errors.contact} autoComplete="off" />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <Input value={f.phone} onChange={set('phone')} inputMode="tel" aria-invalid={!!errors.phone} placeholder="98xxx xxxxx" />
        </Field>
        <Field label="Email" hint="Optional">
          <Input type="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field label="Electricity consumer number" hint="Optional; helps duplicate checks">
          <Input value={f.consumerNo} onChange={set('consumerNo')} />
        </Field>
        <Field label="Source">
          <Select value={f.source} onChange={set('source')} options={LEAD_SOURCES} />
        </Field>
        <Field label="Referred by" required={f.source === 'Referral'} error={errors.referrer} hint={f.source === 'Referral' ? undefined : 'Only for referrals'}>
          <Input value={f.referrer} onChange={set('referrer')} disabled={f.source !== 'Referral'} aria-invalid={!!errors.referrer} />
        </Field>
        <Field label="Site address" required error={errors.address} className="sm:col-span-2">
          <Textarea rows={2} className="!min-h-[3.5rem]" value={f.address} onChange={set('address')} aria-invalid={!!errors.address} />
        </Field>
        <Field label="District">
          <Select value={f.district} onChange={(e) => setF((x) => ({ ...x, district: e.target.value, taluka: DISTRICTS[e.target.value][0] }))} options={Object.keys(DISTRICTS)} />
        </Field>
        <Field label="Taluka">
          <Select value={f.taluka} onChange={set('taluka')} options={DISTRICTS[f.district]} />
        </Field>
        <Field label="Estimated capacity (kWp)" hint="Optional">
          <Input type="number" min="0" step="0.5" value={f.estimatedKw} onChange={set('estimatedKw')} />
        </Field>
        {admin ? (
          <Field label="Owner" required error={errors.owner}>
            <UserSelect value={f.owner} onChange={set('owner')} aria-invalid={!!errors.owner} />
          </Field>
        ) : (
          <Field label="Owner" hint="Leads you create are yours by default.">
            <Input value={me.name} disabled />
          </Field>
        )}
        <Field label="Next action" required error={errors.nextAction}>
          <Input value={f.nextAction} onChange={set('nextAction')} aria-invalid={!!errors.nextAction} />
        </Field>
        <Field label="Next action date">
          <Input type="date" value={f.nextActionDate} onChange={set('nextActionDate')} />
        </Field>

        {dups.length > 0 && (
          <div className="sm:col-span-2 rounded-[10px] border border-[#f1d39a] bg-warn-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <AlertTriangle size={17} /> {dups.length === 1 ? 'This may be a duplicate' : `${dups.length} possible duplicates`}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              {dups.map((d) => (
                <li key={d.record.id}>
                  <span className="font-semibold text-ink">{d.record.client || d.record.contact}</span> ({d.kind} {d.record.id}) matches on {d.reasons.join(' and ')}.
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.8125rem] text-ink-3">
              {confirmDup ? 'Select Create anyway to keep both. An admin can merge them later; history is kept.' : 'Check the existing record before creating a new one.'}
            </p>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
