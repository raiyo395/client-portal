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
    if (!trimmedName) {
      setFormError('Enter a project name.')
      return
    }
    if (!clientId) {
      setFormError('Choose a client for this project.')
      return
    }
    setSaving(true)
    try {
      await createAdminProject({
        client_id: clientId,
        name: trimmedName,
        description: description.trim() || null,
      })
    } catch (caught) {
      setFormError(`Could not create project: ${caught instanceof Error ? caught.message : 'Network request failed.'}`)
      return
    } finally {
      setSaving(false)
    }
    setName('')
    setDescription('')
    setClientId('')
    setSuccess('Project created successfully.')
    await loadProjects()
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-slate-600">Manage projects across your client portal.</p>
      </div>

      <form onSubmit={createProject} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">New project</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Project name
            <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Client
            <select required value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={clientsLoading || clients.length === 0} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-slate-500 disabled:bg-slate-100">
              <option value="">{clientsLoading ? 'Loading clients…' : clients.length === 0 ? 'No clients available' : 'Select a client'}</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.full_name || 'Unnamed client'}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-500" />
          </label>
        </div>
        {!clientsLoading && clients.length === 0 && !formError && <p className="mt-3 text-sm text-amber-800">No client profiles are available. Create or enable a client account before adding a project.</p>}
        {formError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        {success && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <button type="submit" disabled={saving || clientsLoading || clients.length === 0} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Creating…' : 'Create project'}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All projects</h2>
        {loading && <p className="text-sm text-slate-500">Loading projects…</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load projects: {error}</p>}
        {!loading && !error && projects.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No projects have been created yet.</p>}
        {!loading && !error && projects.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>
                  <th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Milestone progress</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">{projects.map((project: AdminProjectRow) => (
                  <tr key={project.id}>
                    <td className="px-4 py-4"><Link to={`/admin/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">{project.name}</Link>{project.description && <p className="mt-1 max-w-xs truncate text-slate-500">{project.description}</p>}</td>
                    <td className="px-4 py-4 text-slate-700">{project.client_name}</td>
                    <td className="px-4 py-4"><StatusBadge status={project.status} /></td>
                    <td className="px-4 py-4"><ProgressBar approved={project.approved} total={project.milestone_total} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
