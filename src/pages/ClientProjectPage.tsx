import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import ProjectFilesSection from '../components/ProjectFilesSection'
import StatusBadge from '../components/StatusBadge'
import { fetchClientProjectDetails, type ClientProjectDetails } from '../lib/clientProjects'
import { supabase } from '../lib/supabase'
import type { Approval } from '../types'

export default function ClientProjectPage() {
  const { id = '' } = useParams()
  const [details, setDetails] = useState<ClientProjectDetails | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetails(await fetchClientProjectDetails(id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    void fetchClientProjectDetails(id)
      .then((result) => { if (!cancelled) setDetails(result) })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function submitDecision(milestoneId: string, decision: Approval['decision']) {
    const milestone = details?.milestones.find((item) => item.id === milestoneId)
    if (!milestone || milestone.status !== 'in_review') {
      setActionError('This milestone is no longer awaiting review. Refresh the page to see its latest status.')
      return
    }
    const comment = comments[milestoneId]?.trim() ?? ''
    if (decision === 'changes_requested' && !comment) {
      setActionError('Please add a comment when requesting changes.')
      return
    }
    setActionError(null)
    setSubmittingId(milestoneId)
    try {
      const { error: insertError } = await supabase.from('approvals').insert({
        milestone_id: milestoneId,
        decision,
        comment: comment || null,
      })
      if (insertError) {
        setActionError('We couldn’t save this decision. The milestone may already have a decision or may no longer be in review. Refresh the page to see its latest status.')
        return
      }
      setComments((current) => ({ ...current, [milestoneId]: '' }))
      await load()
    } catch (caught) {
      setActionError(caught instanceof Error ? `We couldn’t save this decision: ${caught.message}` : 'We couldn’t save this decision. Please try again.')
    } finally {
      setSubmittingId(null)
    }
  }

  const approvedCount = details?.milestones.filter((milestone) => milestone.status === 'approved').length ?? 0

  if (loading) return <p className="rounded-2xl border border-[#223127] bg-[#141D17] p-6 text-sm text-[#aab8ad]">Loading project…</p>
  if (error) return <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-4 text-sm text-[#e0a182]">Could not load project: {error}</p>
  if (!details) return <section className="rounded-2xl border border-[#223127] bg-[#141D17] p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa99e]">Client workspace</p><h1 className="mt-3 text-2xl font-semibold text-[#e0e9e2]">Project not found</h1><p className="mt-2 text-sm text-[#aab8ad]">This project is unavailable or you don’t have access to it.</p><Link to="/projects" className="mt-5 inline-flex text-sm font-semibold text-[#b7d39f] underline underline-offset-4">Back to projects</Link></section>

  return (
    <section className="space-y-7">
      <header className="relative overflow-hidden rounded-[26px] bg-[#203d30] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-8 -top-12 h-52 w-52 rounded-full border border-white/10" />
        <Link to="/projects" className="relative text-xs font-semibold text-[#d1dfd1] hover:text-white">← Your projects</Link>
        <div className="relative mt-5 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{details.project.name}</h1><StatusBadge status={details.project.status} /></div>
        <p className="relative mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#d0ddd3]">{details.project.description || 'No project description.'}</p>
        <div className="relative mt-6 max-w-sm rounded-xl border border-white/10 bg-black/10 p-4"><ProgressBar approved={approvedCount} total={details.milestones.length} /></div>
      </header>
      {actionError && <p role="alert" className="rounded-xl border border-[#56382d] bg-[#39251f] p-3 text-sm text-[#e0a182]">{actionError}</p>}
      <ProjectFilesSection projectId={details.project.id} />
      <div className="space-y-4">
        <div><h2 className="text-lg font-semibold tracking-tight text-[#e0e9e2]">Milestone timeline</h2><p className="mt-1 text-xs text-[#aab8ad]">A shared view of what’s done and what’s next.</p></div>
        {details.milestones.length === 0 && <p className="rounded-2xl border border-dashed border-[#223127] bg-[#141D17] p-8 text-center text-sm text-[#aab8ad]">No milestones have been added yet.</p>}
        <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-[#223127]">{details.milestones.map((milestone, index) => (
          <li key={milestone.id} style={{ animationDelay: `${Math.min(index, 6) * 65}ms` }} className="motion-card page-enter relative rounded-2xl border border-[#223127] bg-[#141D17] p-5 sm:ml-10 sm:p-6 before:absolute before:-left-[31px] before:top-7 before:hidden before:h-3 before:w-3 before:rounded-full before:border-[3px] before:border-[#141D17] before:bg-[#9bbc82] before:content-[''] sm:before:block">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa99e]"><span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#141D17] text-xs font-semibold text-[#b7d39f] sm:absolute sm:-left-[47px] sm:top-4">{String(index + 1).padStart(2, '0')}</span>Milestone</div>
            <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-base font-semibold text-[#e0e9e2]">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
            {milestone.due_date && <p className="mt-2 text-xs font-medium text-[#9aa99e]">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
            {milestone.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#aab8ad]">{milestone.description}</p>}

            <div className="mt-5 rounded-2xl border border-[#223127] bg-[#141D17] p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#b7d39f]">Your review</p>
              {milestone.status !== 'in_review' && <p className="mt-2 text-sm text-[#9aa99e]">Review actions become available when this milestone is in review.</p>}
              <label className="mt-3 block space-y-1.5 text-xs font-semibold text-[#c4d2c8]">Comment <span className="font-normal text-[#9aa99e]">· required to request changes</span>
                <textarea rows={3} disabled={milestone.status !== 'in_review' || submittingId !== null} value={comments[milestone.id] ?? ''} onChange={(event) => setComments((current) => ({ ...current, [milestone.id]: event.target.value }))} placeholder="Share a note for the project team" className="portal-input resize-y bg-[#141D17] disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={submittingId !== null || milestone.status !== 'in_review'} onClick={() => void submitDecision(milestone.id, 'approved')} className="rounded-xl bg-[#416c4b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#355c3e] disabled:cursor-not-allowed disabled:opacity-50">{submittingId === milestone.id ? 'Submitting…' : 'Approve'} <span aria-hidden="true">✓</span></button>
                <button type="button" disabled={submittingId !== null || milestone.status !== 'in_review'} onClick={() => void submitDecision(milestone.id, 'changes_requested')} className="rounded-xl border border-[#594535] bg-[#141D17] px-4 py-2.5 text-sm font-semibold text-[#e0a182] transition hover:bg-[#3a2e20] disabled:cursor-not-allowed disabled:opacity-50">{submittingId === milestone.id ? 'Submitting…' : 'Request changes'}</button></div>
            </div>

            <div className="mt-5 border-t border-[#223127] pt-4"><h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#aab8ad]">Past decisions</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-[#9aa99e]">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-xl bg-[#223127] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><time className="text-xs text-[#9aa99e]" dateTime={approval.created_at}>{new Date(approval.created_at).toLocaleString()}</time></div>{approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#bfcdc2]">{approval.comment}</p>}</li>
              ))}</ol>}
            </div>
          </li>
        ))}</ol>
      </div>
    </section>
  )
}
