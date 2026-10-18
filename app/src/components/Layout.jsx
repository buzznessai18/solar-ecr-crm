import * as Dialog from '@radix-ui/react-dialog'
import {
  Bell, CheckSquare, ClipboardCheck, FolderOpen, FolderKanban, History, LayoutGrid, LogOut, Menu as MenuIcon, Plus, RotateCcw, Search, Settings, UserRound, Users, X,
} from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMe, useStore } from '@/lib/store'
import { cx, isAdmin, taskBuckets, visibleLeads, visibleProjects, visibleTasks } from '@/lib/utils'
import { Avatar, Menu } from './ui'
import { NewLeadDialog } from './dialogs/NewLeadDialog'

function useNav() {
  const me = useMe()
  const state = useStore()
  const tasks = visibleTasks(state, me).filter((t) => t.assignee === me.id || isAdmin(me))
  const overdue = taskBuckets(tasks).overdue.length
  const pending = state.approvals.filter((a) => a.status === 'pending' && (isAdmin(me) || a.requestedBy === me.id)).length
  return [
    { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/leads', label: 'Leads', icon: Users },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: isAdmin(me) ? 'Tasks' : 'My tasks', icon: CheckSquare, badge: overdue, badgeTone: 'bad', badgeLabel: `${overdue} overdue` },
    { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, badge: pending, badgeTone: 'sun', badgeLabel: `${pending} pending` },
    { to: '/drive', label: 'Drive folders', icon: FolderOpen },
    'divider',
    isAdmin(me) && { to: '/activity', label: 'Activity log', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ].filter(Boolean)
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#1E4FD8" />
        <g fill="#fff">
          <rect x="6" y="9" width="6" height="6" rx="1" />
          <rect x="13" y="9" width="6" height="6" rx="1" />
          <rect x="20" y="9" width="6" height="6" rx="1" fill="#F5A800" />
          <rect x="6" y="17" width="6" height="6" rx="1" />
          <rect x="13" y="17" width="6" height="6" rx="1" />
          <rect x="20" y="17" width="6" height="6" rx="1" opacity=".4" />
        </g>
      </svg>
      <div className="leading-tight">
        <p className="text-[0.9375rem] font-bold text-ink">Ecorays</p>
        <p className="text-[0.75rem] text-ink-3">Project tracker</p>
      </div>
    </div>
  )
}

function NavList({ onNavigate }) {
  const items = useNav()
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map((it, i) =>
        it === 'divider' ? (
          <div key={i} className="mx-2 my-3 h-px bg-line" />
        ) : (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'group relative flex items-center gap-3 rounded-[8px] px-3 py-2 text-[0.9375rem] font-medium transition-colors',
                isActive ? 'bg-cell-soft text-cell-deep' : 'text-ink-2 hover:bg-sunken hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <it.icon size={18} className={isActive ? 'text-cell' : 'text-ink-3 group-hover:text-ink-2'} />
                <span className="flex-1">{it.label}</span>
                {it.badge > 0 && (
                  <span
                    aria-label={it.badgeLabel}
                    className={cx(
                      'min-w-[1.375rem] rounded-full px-1.5 text-center text-[0.75rem] font-bold leading-5',
                      it.badgeTone === 'bad' ? 'bg-bad text-white' : 'bg-sun text-[#3a2a00]',
                    )}
                  >
                    {it.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function UserMenu() {
  const me = useMe()
  const users = useStore((s) => s.users)
  const signIn = useStore((s) => s.signIn)
  const signOut = useStore((s) => s.signOut)
  const resetDemo = useStore((s) => s.resetDemo)
  const nav = useNavigate()
  const others = users.filter((u) => u.active && u.id !== me.id)
  return (
    <Menu
      trigger={
        <button className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 hover:bg-sunken sm:pr-3" aria-label="Account menu">
          <Avatar userId={me.id} size={32} />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold text-ink">{me.name}</span>
            <span className="block text-[0.75rem] text-ink-3">{isAdmin(me) ? 'Admin' : me.title}</span>
          </span>
        </button>
      }
      items={[
        { label: 'Your profile', icon: UserRound, onSelect: () => nav('/settings') },
        '-',
        ...others.slice(0, 6).map((u) => ({
          label: `View as ${u.name}`,
          hint: u.role === 'admin' ? 'Admin' : u.title,
          icon: Users,
          onSelect: () => {
            signIn(u.id)
            nav('/')
          },
        })),
        '-',
        { label: 'Reset demo data', icon: RotateCcw, onSelect: () => resetDemo() },
        { label: 'Sign out', icon: LogOut, onSelect: () => signOut() },
      ]}
    />
  )
}

function useSearch(q) {
  const state = useStore()
  const me = useMe()
  return useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const digits = s.replace(/\D/g, '')
    const nm = (id) => state.users.find((u) => u.id === id)?.name.toLowerCase() || ''
    const hit = (r) =>
      [r.id, r.client, r.contact, r.businessName, r.consumerNo, r.email, r.address, nm(r.owner), r.status, r.substage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)) ||
      (digits.length >= 4 && String(r.phone).replace(/\D/g, '').includes(digits))
    const projects = visibleProjects(state, me).filter(hit).slice(0, 6).map((p) => ({ kind: 'Project', id: p.id, title: p.client, sub: `${p.id}, ${p.substage}`, to: `/projects/${p.id}` }))
    const leads = visibleLeads(state, me).filter((l) => !l.projectId).filter(hit).slice(0, 6).map((l) => ({ kind: 'Lead', id: l.id, title: l.contact, sub: `${l.id}, ${l.substage}`, to: `/leads/${l.id}` }))
    return [...projects, ...leads]
  }, [q, state, me])
}

function SearchBox({ autoFocus, onDone }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useSearch(q)
  const nav = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName))) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (r) => {
    nav(r.to)
    setQ('')
    setOpen(false)
    onDone?.()
  }

  return (
    <div className="relative w-full">
      <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && results[active]) go(results[active])
          if (e.key === 'Escape') { setOpen(false); ref.current?.blur() }
        }}
        placeholder="Search client, phone, project ID, consumer no."
        className="input !min-h-[2.5rem] !rounded-[10px] !border-line bg-paper !pl-9 pr-10"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        aria-label="Search records"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 text-[0.75rem] text-ink-3 md:block">/</kbd>
      {open && q.trim().length >= 2 && (
        <div id="search-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_16px_40px_-12px_rgb(23_32_51/0.3)]">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-3">No records match “{q}”. Try a phone number or project ID.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left', i === active && 'bg-sunken')}
              >
                <span className={cx('chip shrink-0', r.kind === 'Project' ? 'bg-cell-soft text-cell-deep' : 'bg-sunken text-ink-2')}>{r.kind}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{r.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function Layout() {
  const [drawer, setDrawer] = useState(false)
  const [mSearch, setMSearch] = useState(false)
  const [newLead, setNewLead] = useState(false)
  const loc = useLocation()
  const main = useRef(null)

  useEffect(() => {
    main.current?.scrollTo?.(0, 0)
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto rounded-[12px] border border-line bg-paper p-3">
          <p className="text-[0.8125rem] font-semibold text-ink">Demo mode</p>
          <p className="mt-0.5 text-[0.75rem] leading-snug text-ink-3">Data is mock and saved in this browser. Switch people from the account menu to see role-based access.</p>
        </div>
      </aside>

      {/* mobile drawer */}
      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[rgb(23_32_51/0.45)] lg:hidden" />
          <Dialog.Content className="drawer-content fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-6 bg-surface px-3 py-5 lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
            <div className="flex items-center justify-between">
              <Brand />
              <Dialog.Close className="btn btn-ghost btn-icon btn-sm" aria-label="Close menu"><X size={18} /></Dialog.Close>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button className="btn btn-ghost btn-icon -ml-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <MenuIcon size={20} />
            </button>
            <div className="lg:hidden"><span className="font-bold">Ecorays</span></div>
            <div className="hidden max-w-[520px] flex-1 md:block">
              <SearchBox />
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setMSearch(true)} aria-label="Search">
                <Search size={19} />
              </button>
              <NavLink to="/tasks" className="btn btn-ghost btn-icon" aria-label="Due and overdue tasks">
                <Bell size={19} />
              </NavLink>
              <button className="btn btn-primary hidden sm:inline-flex" onClick={() => setNewLead(true)}>
                <Plus size={17} /> New lead
              </button>
              <button className="btn btn-primary btn-icon sm:hidden" onClick={() => setNewLead(true)} aria-label="New lead">
                <Plus size={19} />
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <main id="main" ref={main} className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          <Suspense fallback={<p className="py-20 text-center text-sm text-ink-3">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* mobile search */}
      <Dialog.Root open={mSearch} onOpenChange={setMSearch}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[rgb(23_32_51/0.45)]" />
          <Dialog.Content className="fixed inset-x-0 top-0 z-50 bg-surface p-4">
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Description className="sr-only">Search leads and projects</Dialog.Description>
            <div className="flex items-center gap-2">
              <SearchBox autoFocus onDone={() => setMSearch(false)} />
              <Dialog.Close className="btn btn-ghost btn-sm">Cancel</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick">
        {[
          ['/', 'Home', LayoutGrid, true],
          ['/leads', 'Leads', Users],
          ['/projects', 'Projects', FolderKanban],
          ['/tasks', 'Tasks', CheckSquare],
          ['/approvals', 'Approvals', ClipboardCheck],
        ].map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-semibold', isActive ? 'text-cell' : 'text-ink-3')}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NewLeadDialog open={newLead} onOpenChange={setNewLead} />
    </div>
  )
}
