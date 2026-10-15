import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Mark() {
  return <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl bg-[#c8ef8d] text-sm font-black tracking-tight text-[#19372d]">CP</span>
}

function NavIcon({ kind }: { kind: 'grid' | 'briefcase' }) {
  return kind === 'grid' ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><rect x="2.25" y="5.75" width="15.5" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 5.75V4.5A1.75 1.75 0 0 1 8.75 2.75h2.5A1.75 1.75 0 0 1 13 4.5v1.25M2.5 10h15M8 10v1.5h4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
}

export default function Layout() {
  const { profile, session, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.full_name?.trim() || session?.user.email || 'User'
  const initials = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
  const navItems = isAdmin
    ? [{ label: 'Overview', to: '/admin/projects', icon: 'grid' as const }]
    : [{ label: 'My projects', to: '/projects', icon: 'briefcase' as const }]

  return (
    <div className="min-h-screen bg-[#070B08] text-[#e0e9e2] md:flex">
      <aside className="hidden w-[252px] shrink-0 flex-col bg-[#17332a] px-5 py-6 text-white md:flex">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-1 py-1">
          <Mark />
          <span><span className="block text-sm font-semibold tracking-wide">Client Portal</span><span className="mt-0.5 block text-[11px] text-[#aebfb1]">Project workspace</span></span>
        </Link>
        <div className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#93a79a]">Workspace</div>
        <nav aria-label="Main navigation" className="mt-3 space-y-1">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-[#294b3d] font-medium text-[#c8ef8d]' : 'text-[#cfdbd2] hover:bg-[#214236] hover:text-white'}`}>
            <NavIcon kind={item.icon} />{item.label}
          </NavLink>)}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#223127] bg-[#1c3c30] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c8ef8d] text-xs font-semibold text-[#19372d]">{initials}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{displayName}</span><span className="mt-0.5 block text-xs capitalize text-[#aebfb1]">{profile?.role ?? 'Member'}</span></span>
          </div>
          <button type="button" onClick={() => void signOut()} className="mt-4 w-full rounded-lg border border-[#223127] px-3 py-2 text-left text-xs font-medium text-[#cfdbd2] transition hover:border-[#789082] hover:text-white">Log out <span aria-hidden="true" className="float-right">↗</span></button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[#223127] bg-[#141D17] px-4 py-3.5 sm:px-7 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5"><Mark /><span className="text-sm font-semibold">Client Portal</span></Link>
            <button type="button" onClick={() => void signOut()} className="rounded-lg border border-[#223127] px-3 py-2 text-xs font-medium text-[#c4d2c8]">Log out</button>
          </div>
          <nav aria-label="Main navigation" className="mt-3 flex gap-2 overflow-x-auto">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive ? 'bg-[#223127] text-[#c8ef8d]' : 'text-[#aab8ad] hover:bg-[#141D17]'}`}>{item.label}</NavLink>)}
          </nav>
        </header>
        <main className="page-enter mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
