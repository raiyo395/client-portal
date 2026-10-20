import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { debugAction, reportActionError } from '../lib/actionFeedback'
import { Badge, Button } from './ui'

function Mark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-hover)] text-xs font-bold tracking-wide text-[var(--text-primary)]">
      CP
    </span>
  )
}

function NavIcon({ kind }: { kind: 'grid' | 'briefcase' }) {
  return kind === 'grid' ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-[18px]"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-[18px]"><rect x="2.25" y="5.75" width="15.5" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 5.75V4.5A1.75 1.75 0 0 1 8.75 2.75h2.5A1.75 1.75 0 0 1 13 4.5v1.25M2.5 10h15M8 10v1.5h4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
}

export default function Layout() {
  const { profile, session, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.full_name?.trim() || session?.user.email || 'User'
  const initials = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
  const navItems = isAdmin
    ? [{ label: 'Projects', to: '/admin/projects', icon: 'grid' as const }]
    : [{ label: 'My projects', to: '/projects', icon: 'briefcase' as const }]

  async function handleSignOut() {
    debugAction('sign out', { user_id: session?.user.id })
    setLoggingOut(true)
    setSignOutError(null)
    try {
      const message = await signOut()
      if (message) setSignOutError(message)
    } catch (caught) {
      setSignOutError(reportActionError('Sign out', caught))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--nav)] px-4 py-5 md:flex">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl px-2 focus-visible:outline-offset-2">
          <Mark />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">Client Portal</span><span className="mt-0.5 block text-xs text-[var(--text-secondary)]">Project workspace</span></span>
        </Link>

        <p className="mb-2 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-[var(--gold)] text-[var(--text-on-gold)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}>
            <NavIcon kind={item.icon} />{item.label}
          </NavLink>)}
        </nav>

        <div className="mt-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)]">{initials}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{displayName}</span><span className="mt-1 block"><Badge>{profile?.role ?? 'Member'}</Badge></span></span>
          </div>
          {signOutError && <p role="alert" className="mt-3 text-xs leading-5 text-[var(--status-rejected)]">Could not log out: {signOutError}</p>}
          <Button variant="secondary" disabled={loggingOut} onClick={() => void handleSignOut()} className="mt-3 w-full">
            {loggingOut ? 'Logging out…' : 'Log out'}
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[var(--border)] bg-[var(--nav)] px-4 py-3 sm:px-6 md:hidden">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-xl"><Mark /><span className="truncate text-sm font-semibold">Client Portal</span></Link>
            <Button variant="secondary" disabled={loggingOut} onClick={() => void handleSignOut()} className="min-w-24 px-3 text-xs">
              {loggingOut ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
            <nav aria-label="Main navigation" className="min-w-0 flex-1">
              {navItems.map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-[var(--gold)] text-[var(--text-on-gold)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                <NavIcon kind={item.icon} />{item.label}
              </NavLink>)}
            </nav>
            <span className="max-w-[42%] truncate text-right text-xs text-[var(--text-secondary)]" title={displayName}>{displayName}</span>
          </div>
          {signOutError && <p role="alert" className="mt-2 text-xs text-[var(--status-rejected)]">Could not log out: {signOutError}</p>}
        </header>
        <main className="page-enter mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
