import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { fetchClientProjects, type ClientProjectRow } from '../lib/clientProjects'

export default function ClientProjectsPage() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<ClientProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!profile) return
    void fetchClientProjects(profile.id)
      .then((rows) => { if (!cancelled) setProjects(rows) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profile])

  const active = projects.filter((project) => project.status === 'active').length
  const approved = projects.reduce((sum, project) => sum + project.approved, 0)

  return (
    <section className="space-y-8">
      <header className="relative overflow-hidden rounded-[26px] bg-[#203d30] px-6 py-7 text-white sm:px-9 sm:py-9">
        <div aria-hidden="true" className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-2 -top-12 h-48 w-48 rounded-full border border-white/10" />
        <div className="relative max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8d8c4]">Client workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your projects</h1><p className="mt-3 text-sm leading-6 text-[#d0ddd3]">Everything we’re building together, gathered in one place.</p></div>
        <div className="relative mt-7 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{active} active</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{approved} milestones approved</span></div>
      </header>

      <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight text-[#e0e9e2]">Project overview</h2><p className="mt-1 text-xs text-[#aab8ad]">Choose a project to see the timeline and review milestones.</p></div>{!loading && projects.length > 0 && <span className="text-xs font-medium text-[#aab8ad]">{projects.length} total</span>}</div>
      {loading && <div className="rounded-2xl border border-[#223127] bg-[#141D17] p-8 text-sm text-[#aab8ad]">Loading your projects…</div>}
      {error && <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-4 text-sm text-[#e0a182]">Could not load projects: {error}</p>}
      {!loading && !error && projects.length === 0 && <div className="rounded-2xl border border-dashed border-[#223127] bg-[#141D17] px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#141D17] text-xl text-[#a7c68f]">✳</span><h3 className="mt-4 font-semibold text-[#d5e1d7]">Your workspace is ready</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#aab8ad]">When a project is assigned to you, it will appear here with its latest progress.</p></div>}
      {!loading && !error && projects.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{projects.map((project, index) => (
        <Link key={project.id} to={`/projects/${project.id}`} style={{ animationDelay: `${Math.min(index, 6) * 65}ms` }} className="motion-card page-enter group relative overflow-hidden rounded-2xl border border-[#223127] bg-[#141D17] p-5 shadow-[0_7px_25px_-21px_rgba(0,0,0,0.55)] sm:p-6">
          <span aria-hidden="true" className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#141D17] transition group-hover:scale-125" />
          <div className="relative flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#141D17] text-sm font-semibold text-[#b7d39f]">{String(index + 1).padStart(2, '0')}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa99e]">Project</p><h3 className="mt-1 text-base font-semibold text-[#e0e9e2] group-hover:text-[#b7d39f]">{project.name}</h3></div></div><StatusBadge status={project.status} /></div>
          <p className="relative mt-4 min-h-10 text-sm leading-5 text-[#aab8ad]">{project.description || 'Your project details and milestones are ready to explore.'}</p>
          <div className="relative mt-5 rounded-xl bg-[#223127] p-4"><ProgressBar approved={project.approved} total={project.milestone_total} /></div>
          <div className="relative mt-4 flex items-center justify-between text-[11px] text-[#9aa99e]"><span>Started {new Date(project.created_at).toLocaleDateString()}</span><span className="font-semibold text-[#b7d39f]">View project <span aria-hidden="true">↗</span></span></div>
        </Link>
      ))}</div>}
    </section>
  )
}
