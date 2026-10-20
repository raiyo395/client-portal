import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import ProjectFilesSection from '../components/ProjectFilesSection'
import StatusBadge from '../components/StatusBadge'
import { fetchClientProjectDetails, type ClientProjectDetails } from '../lib/clientProjects'
import { debugAction, reportActionError } from '../lib/actionFeedback'
import { supabase } from '../lib/supabase'
import type { Approval } from '../types'

export default function ClientProjectPage() {
  const { id = '' } = useParams()
  const [details, setDetails] = useState<ClientProjectDetails | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetails(await fetchClientProjectDetails(id))
    } catch (caught) {
      setError(reportActionError('Load client project details', caught))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    void fetchClientProjectDetails(id)
      .then((result) => { if (!cancelled) setDetails(result) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(reportActionError('Load client project details', caught))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function submitDecision(milestoneId: string, decision: Approval['decision']) {
    debugAction(decision === 'approved' ? 'approve milestone' : 'request milestone changes', { milestone_id: milestoneId, comment: comments[milestoneId] ?? '' })
    const milestone = details?.milestones.find((item) => item.id === milestoneId)
    if (!milestone || milestone.status !== 'in_review') {
      await load()
      setActionError('This milestone is no longer awaiting review. Its latest status has been refreshed.')
      return
    }
    const comment = comments[milestoneId]?.trim() ?? ''
    if (decision === 'changes_requested' && !comment) {
      setActionError('Please add a comment when requesting changes.')
      return
    }
    setActionError(null)
    setActionSuccess(null)
    setSubmittingId(milestoneId)
    try {
      const { error: insertError } = await supabase.from('approvals').insert({
        milestone_id: milestoneId,
        decision,
        comment: comment || null,
      })
      if (insertError) {
        const errorMessage = reportActionError('Submit milestone decision', insertError)
        await load()
        setActionError(`We couldn’t save this decision: ${errorMessage}. The milestone may already have a decision or may no longer be in review. Its latest status has been refreshed.`)
        return
      }
      setComments((current) => ({ ...current, [milestoneId]: '' }))
      await load()
      setActionSuccess(decision === 'approved' ? 'Milestone approved.' : 'Changes requested.')
    } catch (caught) {
      setActionError(`We couldn’t save this decision: ${reportActionError('Submit milestone decision', caught)}`)
    } finally {
      setSubmittingId(null)
    }
  }

  const approvedCount = details?.milestones.filter((milestone) => milestone.status === 'approved').length ?? 0

  if (loading) return <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)]">Loading project…</p>
  if (error) return <p role="alert" className="rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-4 text-sm text-[var(--status-rejected)]">Could not load project: {error}</p>
  if (!details) return <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Client workspace</p><h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Project not found</h1><p className="mt-2 text-sm text-[var(--text-muted)]">This project is unavailable or you don’t have access to it.</p><Link to="/projects" className="mt-5 inline-flex text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4">Back to projects</Link></section>

  return (
    <section className="space-y-7">
      <header className="relative overflow-hidden rounded-[26px] bg-[var(--card)] px-5 py-6 text-[var(--text-primary)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-8 -top-12 h-52 w-52 rounded-full border border-[var(--border)]" />
        <Link to="/projects" className="relative text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Your projects</Link>
        <div className="relative mt-5 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{details.project.name}</h1><StatusBadge status={details.project.status} /></div>
        <p className="relative mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{details.project.description || 'No project description.'}</p>
        <div className="relative mt-6 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4"><ProgressBar approved={approvedCount} total={details.milestones.length} /></div>
      </header>
      {actionError && <p role="alert" className="rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-sm text-[var(--status-rejected)]">{actionError}</p>}
      {actionSuccess && <p role="status" className="rounded-xl border border-[var(--status-approved-soft)] bg-[var(--card)] p-3 text-sm text-[var(--status-approved)]">{actionSuccess}</p>}
      <ProjectFilesSection projectId={details.project.id} />
      <div className="space-y-4">
        <div><h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Milestone timeline</h2><p className="mt-1 text-xs text-[var(--text-muted)]">A shared view of what’s done and what’s next.</p></div>
        {details.milestones.length === 0 && <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">No milestones have been added yet.</p>}
        <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-[var(--surface-hover)]">{details.milestones.map((milestone, index) => (
          <li key={milestone.id} style={milestone.status === 'in_review' ? { animationDelay: `${Math.min(index, 6) * 65}ms`, backgroundColor: 'var(--feature)', borderColor: 'var(--feature-border)' } : { animationDelay: `${Math.min(index, 6) * 65}ms` }} className="motion-card page-enter relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:ml-10 sm:p-6 before:absolute before:-left-[31px] before:top-7 before:hidden before:h-3 before:w-3 before:rounded-full before:border-[3px] before:border-[var(--card)] before:bg-[var(--surface-hover)] before:content-[''] sm:before:block">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"><span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card)] text-xs font-semibold text-[var(--text-muted)] sm:absolute sm:-left-[47px] sm:top-4">{String(index + 1).padStart(2, '0')}</span>Milestone</div>
            <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-base font-semibold text-[var(--text-primary)]">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
            {milestone.due_date && <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
            {milestone.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{milestone.description}</p>}

            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)] p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">Your review</p>
              {milestone.status !== 'in_review' && <p className="mt-2 text-sm text-[var(--text-muted)]">Review actions become available when this milestone is in review.</p>}
              <label className="mt-3 block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Comment <span className="font-normal text-[var(--text-muted)]">· required to request changes</span>
                <textarea rows={3} disabled={milestone.status !== 'in_review' || submittingId !== null} value={comments[milestone.id] ?? ''} onChange={(event) => setComments((current) => ({ ...current, [milestone.id]: event.target.value }))} placeholder="Share a note for the project team" className="portal-input resize-y bg-[var(--canvas)] disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={submittingId !== null || milestone.status !== 'in_review'} onClick={() => void submitDecision(milestone.id, 'approved')} className="rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-gold)] transition hover:bg-[var(--gold-hover)] active:bg-[var(--gold-pressed)] disabled:cursor-not-allowed disabled:opacity-50">{submittingId === milestone.id ? 'Submitting…' : 'Approve'} <span aria-hidden="true">✓</span></button>
                <button type="button" disabled={submittingId !== null || milestone.status !== 'in_review'} onClick={() => void submitDecision(milestone.id, 'changes_requested')} className="rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--status-rejected)] transition hover:bg-[var(--status-rejected-soft)] disabled:cursor-not-allowed disabled:opacity-50">{submittingId === milestone.id ? 'Submitting…' : 'Request changes'}</button></div>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4"><h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--text-muted)]">Past decisions</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-[var(--text-muted)]">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-xl bg-[var(--surface-hover)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><time className="text-xs text-[var(--text-muted)]" dateTime={approval.created_at}>{new Date(approval.created_at).toLocaleString()}</time></div>{approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[var(--text-muted)]">{approval.comment}</p>}</li>
              ))}</ol>}
            </div>
          </li>
        ))}</ol>
      </div>
    </section>
  )
}
