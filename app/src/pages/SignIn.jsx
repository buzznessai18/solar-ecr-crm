import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { STAGES } from '@/lib/config'
import { useStore } from '@/lib/store'
import { cx } from '@/lib/utils'
import { Avatar } from '@/components/ui'

export default function SignIn() {
  const users = useStore((s) => s.users)
  const signIn = useStore((s) => s.signIn)
  const [pick, setPick] = useState('u-rhea')
  const active = users.filter((u) => u.active)

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-10 flex items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="8" fill="#1E4FD8" />
              <g fill="#fff"><rect x="6" y="9" width="6" height="6" rx="1" /><rect x="13" y="9" width="6" height="6" rx="1" /><rect x="20" y="9" width="6" height="6" rx="1" fill="#F5A800" /><rect x="6" y="17" width="6" height="6" rx="1" /><rect x="13" y="17" width="6" height="6" rx="1" /><rect x="20" y="17" width="6" height="6" rx="1" opacity=".4" /></g>
            </svg>
            <div className="leading-tight">
              <p className="font-bold">Ecorays Renewables</p>
              <p className="text-sm text-ink-3">Project tracker</p>
            </div>
          </div>

          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">Every rooftop, from first call to handover.</h1>
          <p className="mt-3 max-w-[44ch] text-ink-2">Sign in with your company Google account to see the leads, projects and tasks assigned to you.</p>

          <fieldset className="mt-8">
            <legend className="field-label">Choose a demo account</legend>
            <div className="mt-1 grid gap-1.5" role="radiogroup">
              {active.map((u) => (
                <label
                  key={u.id}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors',
                    pick === u.id ? 'border-cell bg-cell-soft' : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <input type="radio" name="acct" value={u.id} checked={pick === u.id} onChange={() => setPick(u.id)} className="sr-only" />
                  <Avatar userId={u.id} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{u.name}</span>
                    <span className="block truncate text-[0.8125rem] text-ink-3">{u.email}</span>
                  </span>
                  <span className={cx('chip', u.role === 'admin' ? 'bg-sun-soft text-sun-ink' : 'bg-sunken text-ink-2')}>{u.role === 'admin' ? 'Admin' : u.team}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem]" onClick={() => signIn(pick)}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#fff" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /></svg>
            Continue with Google
          </button>
          <p className="mt-4 flex items-start gap-2 text-[0.8125rem] text-ink-3">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            Demo only. No real sign-in happens; data is mock and stays in this browser.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-cell-deep lg:block">
        <div className="absolute inset-0 grid grid-cols-6 gap-[6px] p-[6px] opacity-[0.35]" aria-hidden>
          {Array.from({ length: 60 }).map((_, i) => <span key={i} className="rounded-[3px] bg-cell" />)}
        </div>
        <div className="relative flex h-full flex-col justify-center px-14 py-16">
          <p className="mb-6 text-sm font-medium text-[#b9c8f5]">The Ecorays project journey</p>
          <ol className="max-w-[420px] space-y-[6px]">
            {STAGES.map((s, i) => (
              <li key={s.key} className={cx('flex items-center gap-4 rounded-[8px] px-4 py-2.5', i === 6 ? 'bg-sun text-[#3a2a00]' : i < 6 ? 'bg-[#1a3c98] text-white' : 'bg-[#0f2766] text-[#b9c8f5]')}>
                <span className="w-5 text-right text-sm font-bold tabular-nums opacity-70">{i + 1}</span>
                <span className="font-semibold">{s.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
