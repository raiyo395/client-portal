import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge'
import { fetchAdminProjectDetails, type AdminProjectDetails, type MilestoneWithApprovals } from '../../lib/adminProjectDetails'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'

export default function AdminProjectDetailPage() {
  const { id = '' } = useParams()
  const [details, setDetails] = useState<AdminProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingProject, setSavingProject] = useState(false)
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetails(await fetchAdminProjectDetails(id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function updateProjectStatus(status: Project['status']) {
    if (!details) return
    setSavingProject(true)
    setActionError(null)
    const { error: updateError } = await supabase.from('projects').update({ status }).eq('id', details.project.id)
    setSavingProject(false)
    if (updateError) {
      setActionError(`Could not update project status: ${updateError.message}`)
      return
    }
    setDetails({ ...details, project: { ...details.project, status } })
  }

  async function addMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!details) return
    setAddingMilestone(true)
    setActionError(null)
    const sortOrder = details.milestones.reduce((maximum, milestone) => Math.max(maximum, milestone.sort_order), 0) + 1
    const { error: insertError } = await supabase.from('milestones').insert({
      project_id: details.project.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      sort_order: sortOrder,
    })
    setAddingMilestone(false)
    if (insertError) {
      setActionError(`Could not add milestone: ${insertError.message}`)
      return
    }
    setTitle('')
    setDescription('')
    setDueDate('')
    await load()
  }

  async function setInReview(milestone: MilestoneWithApprovals) {
    setActionError(null)
    const { error: updateError } = await supabase.from('milestones').update({ status: 'in_review' })
      .eq('id', milestone.id).in('status', ['pending', 'changes_requested'])
    if (updateError) {
      setActionError(`Could not send milestone for review: ${updateError.message}`)
      return
    }
    await load()
  }

  async function deleteMilestone(milestone: MilestoneWithApprovals) {
    if (!window.confirm(`Delete “${milestone.title}”? This also removes its approval history.`)) return
    setActionError(null)
    const { error: deleteError } = await supabase.from('milestones').delete().eq('id', milestone.id)
    if (deleteError) {
      setActionError(`Could not delete milestone: ${deleteError.message}`)
      return
    }
    await load()
  }

  if (loading) return <p className="text-sm text-slate-500">Loading project…</p>
  if (error) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load project: {error}</p>
  if (!details) return <section className="space-y-3"><h1 className="text-2xl font-semibold">Project not found</h1><p className="text-sm text-slate-600">This project may have been removed or the link may be incorrect.</p><Link to="/admin/projects" className="inline-block text-sm font-medium underline">Back to projects</Link></section>

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to="/admin/projects" className="text-sm text-slate-600 hover:underline">← All projects</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight">{details.project.name}</h1><p className="mt-1 text-sm text-slate-600">{details.project.description || 'No project description.'}</p></div>
        <label className="flex items-center gap-2 text-sm font-medium">Project status
          <select aria-label="Project status" value={details.project.status} disabled={savingProject} onChange={(event) => { void updateProjectStatus(event.target.value as Project['status']) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 capitalize">
            <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
          </select>
        </label>
      </div>

      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

      <form onSubmit={addMilestone} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Add milestone</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-medium">Due date <span className="font-normal text-slate-500">(optional)</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Description <span className="font-normal text-slate-500">(optional)</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
        </div>
        <button type="submit" disabled={addingMilestone} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{addingMilestone ? 'Adding…' : 'Add milestone'}</button>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Milestones</h2>
        {details.milestones.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No milestones yet. Add one above to get started.</p>}
        <div className="space-y-4">{details.milestones.map((milestone) => (
          <article key={milestone.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
                {milestone.due_date && <p className="mt-2 text-sm text-slate-500">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
                {milestone.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{milestone.description}</p>}
              </div>
              <div className="flex gap-2">
                {(milestone.status === 'pending' || milestone.status === 'changes_requested') && <button type="button" onClick={() => void setInReview(milestone)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">Send for review</button>}
                <button type="button" onClick={() => void deleteMilestone(milestone)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete</button>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold">Approval history</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-slate-500">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><span className="text-xs text-slate-500">{approval.author_name} · {new Date(approval.created_at).toLocaleString()}</span></div>
                  {approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{approval.comment}</p>}
                </li>
              ))}</ol>}
            </div>
          </article>
        ))}</div>
      </div>
    </section>
  )
}
