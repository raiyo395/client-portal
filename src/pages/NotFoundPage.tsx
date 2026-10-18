import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFoundPage() {
  const { profile } = useAuth()
  const home = profile?.role === 'admin' ? '/admin/projects' : '/projects'

  return (
    <section className="rounded-3xl border border-[#223127] bg-[#141D17] px-6 py-12 text-center sm:px-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa99e]">404 · Page not found</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#e0e9e2]">This page isn’t here</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#aab8ad]">The link may be out of date, or the page may have moved.</p>
      <Link to={home} className="mt-6 inline-flex rounded-xl bg-[#203d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4c3a]">Back to your dashboard</Link>
    </section>
  )
}
