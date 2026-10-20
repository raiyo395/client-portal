import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../../components/ProgressBar'
import StatusBadge from '../../components/StatusBadge'
import { createAdminProject, fetchAdminProjects, fetchClientProfiles, type AdminProjectRow } from '../../lib/adminProjects'
import { debugAction, reportActionError } from '../../lib/actionFeedback'
import type { Profile } from '../../types'

type ClientOption = Pick<Profile, 'id' | 'full_name'>

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProjectRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [clientLoadError, setClientLoadError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState('')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjects(await fetchAdminProjects())
    } catch (caught) {
      setError(reportActionError('Load projects', caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchClientProfiles()
      .then((profiles) => { if (!cancelled) setClients(profiles) })
      .catch((caught: unknown) => {
        if (!cancelled) setClientLoadError(reportActionError('Load client profiles', caught))
      })
      .finally(() => { if (!cancelled) setClientsLoading(false) })
    void fetchAdminProjects()
      .then((rows) => { if (!cancelled) setProjects(rows) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(reportActionError('Load projects', caught))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadProjects])

  async function createProject(event: FormEvent<HTMLFormElement>) {
    debugAction('add project', { name, description, client_id: clientId })
    event.preventDefault()
    setFormError(null)
    setSuccess(null)
    const trimmedName = name.trim()
    if (!trimmedName) return setFormError('Enter a project name.')
    if (!clientId) return setFormError('Choose a client for this project.')
    setSaving(true)
    try {
      await createAdminProject({ client_id: clientId, name: trimmedName, description: description.trim() || null })
      setName('')
      setDescription('')
      setClientId('')
      setSuccess('Project created successfully.')
      await loadProjects()
    } catch (caught) {
      setFormError(`Could not create project: ${reportActionError('Create project', caught)}`)
    } finally {
      setSaving(false)
    }
  }

  async function retryClientProfiles() {
    debugAction('retry client profile list')
    setClientsLoading(true)
    setClientLoadError(null)
    try {
      setClients(await fetchClientProfiles())
    } catch (caught) {
      setClientLoadError(reportActionError('Load client profiles', caught))
    } finally {
      setClientsLoading(false)
    }
  }

  const activeCount = projects.filter((project) => project.status === 'active').length
  const completeCount = projects.filter((project) => project.status === 'completed').length

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Admin workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[2.15rem]">Projects</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">A clear view of every client engagement, its current status, and what’s been delivered.</p></div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">{projects.length} total projects</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: 'All projects', value: projects.length, note: 'Across your workspace' }, { label: 'Active', value: activeCount, note: 'Currently in progress' }, { label: 'Completed', value: completeCount, note: 'Successfully delivered' }].map((stat, index) => (
          <article key={stat.label} className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className={`absolute inset-y-0 left-0 w-1 ${index === 1 ? 'bg-[var(--surface-hover)]' : index === 2 ? 'bg-[var(--surface-hover)]' : 'bg-[var(--surface-hover)]'}`} />
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">{stat.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{stat.value}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="order-2 space-y-4 xl:order-1">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">All projects</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Select a project to manage its milestones.</p></div><span className="text-xs font-medium text-[var(--text-muted)]">{projects.length} records</span></div>
          {loading && <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-sm text-[var(--text-muted)]">Loading projects…</div>}
          {error && <p role="alert" className="rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-4 text-sm text-[var(--status-rejected)]">Could not load projects: {error}</p>}
          {!loading && !error && projects.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--card)] text-xl text-[var(--text-muted)]">⌁</span><h3 className="mt-4 font-semibold text-[var(--text-primary)]">A fresh start</h3><p className="mt-1 text-sm text-[var(--text-muted)]">Create a project to begin tracking client work.</p></div>}
          {!loading && !error && projects.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{projects.map((project) => (
            <article key={project.id} style={{ animationDelay: `${Math.min(projects.indexOf(project), 6) * 65}ms` }} className="motion-card page-enter group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[var(--text-muted)]">Client project</p><Link to={`/admin/projects/${project.id}`} className="mt-1.5 block truncate text-base font-semibold text-[var(--text-primary)] decoration-[var(--text-muted)] underline-offset-4 group-hover:underline">{project.name}</Link></div><StatusBadge status={project.status} /></div>
              <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--card)] text-[10px] font-bold uppercase text-[var(--text-muted)]">{project.client_name.charAt(0)}</span>{project.client_name}</p>
              {project.description && <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--text-muted)]">{project.description}</p>}
              <div className="mt-5 border-t border-[var(--border)] pt-4"><ProgressBar approved={project.approved} total={project.milestone_total} /></div>
            </article>
          ))}</div>}
        </section>

        <aside className="order-1 xl:sticky xl:top-8 xl:order-2">
          <form onSubmit={createProject} className="motion-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_12px_34px_-24px_var(--canvas)]">
            <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6"><div className="flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--card)] text-lg text-[var(--text-muted)]">＋</div><span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Quick create</span></div><h2 className="mt-4 text-lg font-semibold tracking-tight text-[var(--text-primary)]">Start a project</h2><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Set up a new client workspace in a few details.</p></div>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Project name<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Brand refresh" className="portal-input" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Client<select required value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={clientsLoading || Boolean(clientLoadError) || clients.length === 0} className="portal-input disabled:cursor-not-allowed disabled:bg-[var(--canvas)]"><option value="">{clientsLoading ? 'Loading clients…' : clientLoadError ? 'Could not load clients' : clients.length === 0 ? 'No clients available' : 'Choose a client'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.full_name || 'Unnamed client'}</option>)}</select></label>
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Description <span className="font-normal text-[var(--text-muted)]">· optional</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you working on together?" className="portal-input resize-y" /></label>
              {clientLoadError && <div role="alert" className="rounded-lg border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-xs leading-5 text-[var(--status-rejected)]"><p>Could not load clients: {clientLoadError}</p><button type="button" onClick={() => void retryClientProfiles()} disabled={clientsLoading} className="mt-2 rounded-md border border-[var(--status-rejected-soft)] px-2.5 py-1.5 font-semibold disabled:opacity-50">{clientsLoading ? 'Loading clients…' : 'Retry client list'}</button></div>}
              {!clientsLoading && !clientLoadError && clients.length === 0 && <p className="text-xs leading-5 text-[var(--status-pending)]">No clients yet. Ask a client to sign up first.</p>}
              {formError && <p role="alert" className="rounded-lg border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-xs leading-5 text-[var(--status-rejected)]">{formError}</p>}
              {success && <p role="status" className="rounded-lg border border-[var(--status-approved-soft)] bg-[var(--card)] p-3 text-xs text-[var(--status-approved)]">{success}</p>}
              <button type="submit" disabled={saving || clientsLoading || clients.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[var(--text-on-gold)] shadow-sm transition hover:bg-[var(--gold-hover)] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Creating project…' : 'Create project'}<span aria-hidden="true">→</span></button>
            </div>
          </form>
        </aside>
      </div>
    </section>
  )
}
