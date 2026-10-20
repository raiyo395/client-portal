import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { fetchClientProjects, type ClientProjectRow } from '../lib/clientProjects'

export default function ClientProjectsPage() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<ClientProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

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
  }, [profile, retryToken])

  const active = projects.filter((project) => project.status === 'active').length
  const approved = projects.reduce((sum, project) => sum + project.approved, 0)
  const retry = () => {
    setLoading(true)
    setError(null)
    setRetryToken((value) => value + 1)
  }

  return (
    <section className="space-y-7 sm:space-y-8">
      {loading ? (
        <>
          <Skeleton className="h-40 rounded-[var(--radius-card)] sm:h-44" />
          <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
        </>
      ) : error ? (
        <ErrorState message={`Could not load projects: ${error}`} onRetry={retry} />
      ) : (
        <>
          <header className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Client workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">Your projects</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">A focused view of progress, decisions, and what comes next.</p>
            </div>

            {projects.length > 0 && (
              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--text-primary)]">
                    <svg viewBox="0 0 20 20" fill="none" className="size-5"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Review queue</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Awaiting your approval</h2>
                    <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">Open a project to see milestones ready for your review.</p>
                  </div>
                </div>
                <Link to={`/projects/${projects[0].id}`} className="inline-flex min-h-11 items-center justify-center gap-2 self-stretch rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 focus-visible:outline-offset-2 sm:self-auto">
                  Review project <span aria-hidden="true">→</span>
                </Link>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4 sm:p-5"><p className="text-xs font-medium text-[var(--text-secondary)]">Projects</p><p className="mt-2 text-2xl font-semibold tracking-tight">{projects.length}</p></Card>
              <Card className="p-4 sm:p-5"><p className="text-xs font-medium text-[var(--text-secondary)]">Active</p><p className="mt-2 text-2xl font-semibold tracking-tight">{active}</p></Card>
              <Card className="p-4 sm:p-5"><p className="text-xs font-medium text-[var(--text-secondary)]">Milestones approved</p><p className="mt-2 text-2xl font-semibold tracking-tight">{approved}</p></Card>
            </div>
          </header>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Project overview</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Select a project for its timeline, files, and review actions.</p>
            </div>
            {projects.length > 0 && <span className="shrink-0 text-xs text-[var(--text-secondary)]">{projects.length} total</span>}
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="When a project is assigned to you, its progress and milestones will appear here."
              action={<Button variant="secondary" onClick={retry}>Refresh projects</Button>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  aria-label={`Open ${project.name}`}
                  className="motion-card group block min-w-0 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:bg-white/[0.025] focus-visible:outline-offset-4 sm:p-6"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-secondary)]">Project</p>
                      <h3 className="mt-1 truncate text-base font-semibold text-[var(--text-primary)]">{project.name}</h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-4 min-h-10 text-sm leading-5 text-[var(--text-secondary)]">{project.description || 'Project details and milestones are ready to explore.'}</p>
                  <div className="mt-5 rounded-xl border border-[var(--border)] bg-black/10 p-4">
                    <ProgressBar approved={project.approved} total={project.milestone_total} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span>Started {new Date(project.created_at).toLocaleDateString()}</span>
                    <span className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--text-primary)]">View project <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
