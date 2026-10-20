import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge'
import ProjectFilesSection from '../../components/ProjectFilesSection'
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { fetchAdminProjectDetails, type AdminProjectDetails, type MilestoneWithApprovals } from '../../lib/adminProjectDetails'
import { debugAction, reportActionError } from '../../lib/actionFeedback'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'

export default function AdminProjectDetailPage() {
  const { id = '' } = useParams()
  const [details, setDetails] = useState<AdminProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [savingProject, setSavingProject] = useState(false)
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [milestoneActionId, setMilestoneActionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetails(await fetchAdminProjectDetails(id))
    } catch (caught) {
      setError(reportActionError('Load admin project details', caught))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    void fetchAdminProjectDetails(id)
      .then((result) => { if (!cancelled) setDetails(result) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(reportActionError('Load admin project details', caught))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function updateProjectStatus(status: Project['status']) {
    debugAction('change project status', { project_id: details?.project.id, status })
    if (!details) return
    setSavingProject(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const { data, error: updateError } = await supabase.from('projects').update({ status })
        .eq('id', details.project.id).select('id').maybeSingle()
      if (updateError) throw updateError
      if (!data) throw new Error('No project was updated. Refresh the page and try again.')
      setDetails({ ...details, project: { ...details.project, status } })
      setActionSuccess('Project status updated.')
    } catch (caught) {
      setActionError(`Could not update project status: ${reportActionError('Change project status', caught)}`)
    } finally {
      setSavingProject(false)
    }
  }

  async function addMilestone(event: FormEvent<HTMLFormElement>) {
    debugAction('add milestone', { project_id: details?.project.id, title, description, due_date: dueDate })
    event.preventDefault()
    if (!details) return
    setAddingMilestone(true)
    setActionError(null)
    setActionSuccess(null)
    const sortOrder = details.milestones.reduce((maximum, milestone) => Math.max(maximum, milestone.sort_order), 0) + 1
    try {
      const { error: insertError } = await supabase.from('milestones').insert({
        project_id: details.project.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        sort_order: sortOrder,
      })
      if (insertError) throw insertError
      setTitle('')
      setDescription('')
      setDueDate('')
      await load()
      setActionSuccess('Milestone added.')
    } catch (caught) {
      setActionError(`Could not add milestone: ${reportActionError('Add milestone', caught)}`)
    } finally {
      setAddingMilestone(false)
    }
  }

  async function setInReview(milestone: MilestoneWithApprovals) {
    debugAction('send milestone for review', { milestone_id: milestone.id })
    setActionError(null)
    setActionSuccess(null)
    setMilestoneActionId(milestone.id)
    try {
      const { data, error: updateError } = await supabase.from('milestones').update({ status: 'in_review' })
        .eq('id', milestone.id).in('status', ['pending', 'changes_requested']).select('id').maybeSingle()
      if (updateError) throw updateError
      if (!data) throw new Error('No milestone was updated. It may already have changed status; refresh and try again.')
      await load()
      setActionSuccess('Milestone sent for review.')
    } catch (caught) {
      setActionError(`Could not send milestone for review: ${reportActionError('Send milestone for review', caught)}`)
    } finally {
      setMilestoneActionId(null)
    }
  }

  async function deleteMilestone(milestone: MilestoneWithApprovals) {
    debugAction('delete milestone', { milestone_id: milestone.id, title: milestone.title })
    if (!window.confirm(`Delete “${milestone.title}”? This also removes its approval history.`)) return
    setActionError(null)
    setActionSuccess(null)
    setMilestoneActionId(milestone.id)
    try {
      const { data, error: deleteError } = await supabase.from('milestones').delete()
        .eq('id', milestone.id).select('id').maybeSingle()
      if (deleteError) throw deleteError
      if (!data) throw new Error('No milestone was deleted. Refresh the page and try again.')
      await load()
      setActionSuccess('Milestone deleted.')
    } catch (caught) {
      setActionError(`Could not delete milestone: ${reportActionError('Delete milestone', caught)}`)
    } finally {
      setMilestoneActionId(null)
    }
  }

  if (loading) return <section aria-label="Loading project details" className="space-y-5"><Skeleton className="h-36" /><Skeleton className="h-32" /><Skeleton className="h-48" /><Skeleton className="h-52" /></section>
  if (error) return <ErrorState message={`Could not load project: ${error}`} onRetry={() => void load()} />
  if (!details) return <EmptyState title="Project not found" description="This project may have been removed or the link may be incorrect." action={<Link to="/admin/projects" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]">Back to projects</Link>} />

  return (
    <section className="space-y-7">
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
        <Link to="/admin/projects" className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-muted)]">← All projects</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Project details</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{details.project.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{details.project.description || 'No project description.'}</p></div>
          <label className="flex items-center gap-3 rounded-xl bg-[var(--card)] px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Project status
          <select aria-label="Project status" value={details.project.status} disabled={savingProject} onChange={(event) => { void updateProjectStatus(event.target.value as Project['status']) }} className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm capitalize text-[var(--text-primary)]">
            <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
          </select>
          </label>
        </div>
      </div>

      {actionError && <p role="alert" className="rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-sm text-[var(--status-rejected)]">{actionError}</p>}
      {actionSuccess && <p role="status" className="rounded-xl border border-[var(--status-approved-soft)] bg-[var(--card)] p-3 text-sm text-[var(--status-approved)]">{actionSuccess}</p>}

      <ProjectFilesSection projectId={details.project.id} />

      <form onSubmit={addMilestone} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Keep things moving</p><h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Add a milestone</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--card)] text-lg text-[var(--text-muted)]">＋</span></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. First design review" className="portal-input" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Due date <span className="font-normal text-[var(--text-muted)]">· optional</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="portal-input" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">Description <span className="font-normal text-[var(--text-muted)]">· optional</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful context for your client" className="portal-input resize-y" /></label>
        </div>
        <Button type="submit" disabled={addingMilestone} className="mt-4">{addingMilestone ? 'Adding…' : 'Add milestone'} <span aria-hidden="true">→</span></Button>
      </form>

      <div className="space-y-4">
        <div><h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Milestones</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Ordered by project sequence.</p></div>
        {details.milestones.length === 0 && <EmptyState title="No milestones yet" description="Add the first milestone above to give your client a clear next step." />}
        <div className="space-y-4">{details.milestones.map((milestone) => (
          <article key={milestone.id} style={milestone.status === 'in_review' ? { backgroundColor: 'var(--feature)', borderColor: 'var(--feature-border)' } : undefined} className="motion-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
                {milestone.due_date && <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
                {milestone.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{milestone.description}</p>}
              </div>
              <div className="flex gap-2">
                {(milestone.status === 'pending' || milestone.status === 'changes_requested') && <Button variant="secondary" disabled={milestoneActionId !== null} onClick={() => void setInReview(milestone)}>{milestoneActionId === milestone.id ? 'Sending…' : 'Send for review'} <span aria-hidden="true">→</span></Button>}
                <Button variant="danger" disabled={milestoneActionId !== null} onClick={() => void deleteMilestone(milestone)}>{milestoneActionId === milestone.id ? 'Deleting…' : 'Delete'}</Button>
              </div>
            </div>
              <div className="mt-5 border-t border-[var(--border)] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--text-muted)]">Approval history</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-[var(--text-muted)]">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-xl bg-[var(--surface-hover)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><span className="text-xs text-[var(--text-muted)]">{approval.author_name} · {new Date(approval.created_at).toLocaleString()}</span></div>
                  {approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{approval.comment}</p>}
                </li>
              ))}</ol>}
            </div>
          </article>
        ))}</div>
      </div>
    </section>
  )
}
