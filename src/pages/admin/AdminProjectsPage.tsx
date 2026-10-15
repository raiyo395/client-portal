import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../../components/ProgressBar'
import StatusBadge from '../../components/StatusBadge'
import { createAdminProject, fetchAdminProjects, fetchClientProfiles, type AdminProjectRow } from '../../lib/adminProjects'
import type { Profile } from '../../types'

type ClientOption = Pick<Profile, 'id' | 'full_name'>

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProjectRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
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
      setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchClientProfiles()
      .then((profiles) => { if (!cancelled) setClients(profiles) })
      .catch((caught: unknown) => {
        if (!cancelled) setFormError(caught instanceof Error ? `Could not load clients: ${caught.message}` : 'Could not load clients.')
      })
      .finally(() => { if (!cancelled) setClientsLoading(false) })
    void fetchAdminProjects()
      .then((rows) => { if (!cancelled) setProjects(rows) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadProjects])

  async function createProject(event: FormEvent<HTMLFormElement>) {
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
      setFormError(`Could not create project: ${caught instanceof Error ? caught.message : 'Network request failed.'}`)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = projects.filter((project) => project.status === 'active').length
  const completeCount = projects.filter((project) => project.status === 'completed').length

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#aab8ad]">Admin workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#e0e9e2] sm:text-[2.15rem]">Projects</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#adbbb0]">A clear view of every client engagement, its current status, and what’s been delivered.</p></div>
        <span className="rounded-full border border-[#223127] bg-[#141D17] px-3 py-1.5 text-xs font-medium text-[#b3c0b5]">{projects.length} total projects</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: 'All projects', value: projects.length, note: 'Across your workspace' }, { label: 'Active', value: activeCount, note: 'Currently in progress' }, { label: 'Completed', value: completeCount, note: 'Successfully delivered' }].map((stat, index) => (
          <article key={stat.label} className="relative overflow-hidden rounded-2xl border border-[#223127] bg-[#141D17] p-5">
            <div className={`absolute inset-y-0 left-0 w-1 ${index === 1 ? 'bg-[#9bbc82]' : index === 2 ? 'bg-[#71846f]' : 'bg-[#c8ef8d]'}`} />
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#aab8ad]">{stat.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-[#e0e9e2]">{stat.value}</p><p className="mt-1 text-xs text-[#9aa99e]">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="order-2 space-y-4 xl:order-1">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-[#e0e9e2]">All projects</h2><p className="mt-1 text-xs text-[#9aa99e]">Select a project to manage its milestones.</p></div><span className="text-xs font-medium text-[#aab8ad]">{projects.length} records</span></div>
          {loading && <div className="rounded-2xl border border-[#223127] bg-[#141D17] p-8 text-sm text-[#aab8ad]">Loading projects…</div>}
          {error && <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-4 text-sm text-[#e0a182]">Could not load projects: {error}</p>}
          {!loading && !error && projects.length === 0 && <div className="rounded-2xl border border-dashed border-[#223127] bg-[#141D17] px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#141D17] text-xl text-[#a7c68f]">⌁</span><h3 className="mt-4 font-semibold text-[#d5e1d7]">A fresh start</h3><p className="mt-1 text-sm text-[#aab8ad]">Create a project to begin tracking client work.</p></div>}
          {!loading && !error && projects.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{projects.map((project) => (
            <article key={project.id} style={{ animationDelay: `${Math.min(projects.indexOf(project), 6) * 65}ms` }} className="motion-card page-enter group rounded-2xl border border-[#223127] bg-[#141D17] p-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9aa99e]">Client project</p><Link to={`/admin/projects/${project.id}`} className="mt-1.5 block truncate text-base font-semibold text-[#e0e9e2] decoration-[#a6c191] underline-offset-4 group-hover:underline">{project.name}</Link></div><StatusBadge status={project.status} /></div>
              <p className="mt-3 flex items-center gap-2 text-xs text-[#aab8ad]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#141D17] text-[10px] font-bold uppercase text-[#b7d39f]">{project.client_name.charAt(0)}</span>{project.client_name}</p>
              {project.description && <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#aab8ad]">{project.description}</p>}
              <div className="mt-5 border-t border-[#223127] pt-4"><ProgressBar approved={project.approved} total={project.milestone_total} /></div>
            </article>
          ))}</div>}
        </section>

        <aside className="order-1 xl:sticky xl:top-8 xl:order-2">
          <form onSubmit={createProject} className="motion-card overflow-hidden rounded-2xl border border-[#223127] bg-[#141D17] shadow-[0_12px_34px_-24px_rgba(0,0,0,0.6)]">
            <div className="border-b border-[#223127] px-5 py-5 sm:px-6"><div className="flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#141D17] text-lg text-[#b7d39f]">＋</div><span className="rounded-full bg-[#354631] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#b7d39f]">Quick create</span></div><h2 className="mt-4 text-lg font-semibold tracking-tight text-[#e0e9e2]">Start a project</h2><p className="mt-1 text-xs leading-5 text-[#aab8ad]">Set up a new client workspace in a few details.</p></div>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Project name<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Brand refresh" className="portal-input" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Client<select required value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={clientsLoading || clients.length === 0} className="portal-input disabled:cursor-not-allowed disabled:bg-[#141D17]">{clients.map((client) => <option key={client.id} value={client.id}>{client.full_name || 'Unnamed client'}</option>)}<option value="">{clientsLoading ? 'Loading clients…' : clients.length === 0 ? 'No clients available' : 'Choose a client'}</option></select></label>
              <label className="block space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Description <span className="font-normal text-[#9aa99e]">· optional</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you working on together?" className="portal-input resize-y" /></label>
              {!clientsLoading && clients.length === 0 && !formError && <p className="text-xs leading-5 text-[#e5c678]">No client profiles are available yet. Add a client account first.</p>}
              {formError && <p role="alert" className="rounded-lg border border-[#56382d] bg-[#39251f] p-3 text-xs leading-5 text-[#e0a182]">{formError}</p>}
              {success && <p role="status" className="rounded-lg border border-[#3e5640] bg-[#141D17] p-3 text-xs text-[#b6d59f]">{success}</p>}
              <button type="submit" disabled={saving || clientsLoading || clients.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#203d30] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a4c3a] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Creating project…' : 'Create project'}<span aria-hidden="true">→</span></button>
            </div>
          </form>
        </aside>
      </div>
    </section>
  )
}
