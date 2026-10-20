import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFoundPage() {
  const { profile } = useAuth()
  const home = profile?.role === 'admin' ? '/admin/projects' : '/projects'

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center sm:px-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">404 · Page not found</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">This page isn’t here</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">The link may be out of date, or the page may have moved.</p>
      <Link to={home} className="mt-6 inline-flex rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-gold)] transition hover:bg-[var(--gold-hover)]">Back to your dashboard</Link>
    </section>
  )
}
