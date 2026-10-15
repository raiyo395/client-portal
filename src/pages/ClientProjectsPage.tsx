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
    if (!profile) {
      return
    }
    void fetchClientProjects(profile.id)
      .then((rows) => { if (!cancelled) setProjects(rows) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profile])

  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Your projects</h1><p className="mt-1 text-sm text-slate-600">Follow progress and review project milestones.</p></div>
      {loading && <p className="text-sm text-slate-500">Loading projects…</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load projects: {error}</p>}
      {!loading && !error && projects.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No projects have been assigned to you yet.</p>}
      {!loading && !error && projects.length > 0 && <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => (
        <Link key={project.id} to={`/projects/${project.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{project.name}</h2><StatusBadge status={project.status} /></div>
          <p className="mt-2 min-h-10 text-sm text-slate-600">{project.description || 'No description provided.'}</p>
          <div className="mt-4"><ProgressBar approved={project.approved} total={project.milestone_total} /></div>
          <p className="mt-4 text-xs text-slate-500">Created {new Date(project.created_at).toLocaleDateString()}</p>
        </Link>
      ))}</div>}
    </section>
  )
}
