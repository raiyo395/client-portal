import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge'
import ProjectFilesSection from '../../components/ProjectFilesSection'
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

  useEffect(() => {
    let cancelled = false
    void fetchAdminProjectDetails(id)
      .then((result) => { if (!cancelled) setDetails(result) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

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

  if (loading) return <p className="rounded-2xl border border-[#223127] bg-[#141D17] p-6 text-sm text-[#aab8ad]">Loading project…</p>
  if (error) return <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-4 text-sm text-[#e0a182]">Could not load project: {error}</p>
  if (!details) return <section className="rounded-2xl border border-[#223127] bg-[#141D17] p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa99e]">Admin workspace</p><h1 className="mt-3 text-2xl font-semibold text-[#e0e9e2]">Project not found</h1><p className="mt-2 text-sm text-[#aab8ad]">This project may have been removed or the link may be incorrect.</p><Link to="/admin/projects" className="mt-5 inline-flex text-sm font-semibold text-[#b7d39f] underline underline-offset-4">Back to projects</Link></section>

  return (
    <section className="space-y-7">
      <div className="rounded-[24px] border border-[#223127] bg-[#141D17] p-5 sm:p-7">
        <Link to="/admin/projects" className="text-xs font-semibold text-[#aab8ad] hover:text-[#c9d7cd]">← All projects</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa99e]">Project details</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#e0e9e2]">{details.project.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#aab8ad]">{details.project.description || 'No project description.'}</p></div>
          <label className="flex items-center gap-3 rounded-xl bg-[#141D17] px-4 py-3 text-xs font-semibold text-[#c4d2c8]">Project status
          <select aria-label="Project status" value={details.project.status} disabled={savingProject} onChange={(event) => { void updateProjectStatus(event.target.value as Project['status']) }} className="rounded-lg border border-[#223127] bg-[#141D17] px-3 py-2 text-sm capitalize text-[#d5e1d7]">
            <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
          </select>
          </label>
        </div>
      </div>

      {actionError && <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-3 text-sm text-[#e0a182]">{actionError}</p>}

      <ProjectFilesSection projectId={details.project.id} />

      <form onSubmit={addMilestone} className="rounded-2xl border border-[#223127] bg-[#141D17] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#aab8ad]">Keep things moving</p><h2 className="mt-1 text-lg font-semibold text-[#e0e9e2]">Add a milestone</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#141D17] text-lg text-[#b7d39f]">＋</span></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. First design review" className="portal-input" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Due date <span className="font-normal text-[#9aa99e]">· optional</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="portal-input" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[#c4d2c8] sm:col-span-2">Description <span className="font-normal text-[#9aa99e]">· optional</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful context for your client" className="portal-input resize-y" /></label>
        </div>
        <button type="submit" disabled={addingMilestone} className="mt-4 rounded-xl bg-[#203d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4c3a] disabled:opacity-50">{addingMilestone ? 'Adding…' : 'Add milestone'} <span aria-hidden="true">→</span></button>
      </form>

      <div className="space-y-4">
        <div><h2 className="text-lg font-semibold tracking-tight text-[#e0e9e2]">Milestones</h2><p className="mt-1 text-xs text-[#aab8ad]">Ordered by project sequence.</p></div>
        {details.milestones.length === 0 && <p className="rounded-2xl border border-dashed border-[#223127] bg-[#141D17] p-8 text-center text-sm text-[#aab8ad]">No milestones yet. Add one above to get started.</p>}
        <div className="space-y-4">{details.milestones.map((milestone) => (
          <article key={milestone.id} className="motion-card rounded-2xl border border-[#223127] bg-[#141D17] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
                {milestone.due_date && <p className="mt-2 text-xs font-medium text-[#9aa99e]">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
                {milestone.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#aab8ad]">{milestone.description}</p>}
              </div>
              <div className="flex gap-2">
                {(milestone.status === 'pending' || milestone.status === 'changes_requested') && <button type="button" onClick={() => void setInReview(milestone)} className="rounded-xl bg-[#416c4b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#355c3e]">Send for review <span aria-hidden="true">→</span></button>}
                <button type="button" onClick={() => void deleteMilestone(milestone)} className="rounded-xl border border-[#56382d] px-3 py-2 text-xs font-semibold text-[#e0a182] transition hover:bg-[#39251f]">Delete</button>
              </div>
            </div>
              <div className="mt-5 border-t border-[#223127] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#aab8ad]">Approval history</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-[#9aa99e]">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-xl bg-[#223127] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><span className="text-xs text-[#9aa99e]">{approval.author_name} · {new Date(approval.created_at).toLocaleString()}</span></div>
                  {approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-[#bfcdc2]">{approval.comment}</p>}
                </li>
              ))}</ol>}
            </div>
          </article>
        ))}</div>
      </div>
    </section>
  )
}
