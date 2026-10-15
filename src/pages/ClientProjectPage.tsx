import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
    const comment = comments[milestoneId]?.trim() ?? ''
    if (decision === 'changes_requested' && !comment) {
      setActionError('Please add a comment when requesting changes.')
      return
    }
    setActionError(null)
    setSubmittingId(milestoneId)
    const { error: insertError } = await supabase.from('approvals').insert({
      milestone_id: milestoneId,
      decision,
      comment: comment || null,
    })
    setSubmittingId(null)
    if (insertError) {
      setActionError(`Could not submit your decision: ${insertError.message}`)
      return
    }
    setComments((current) => ({ ...current, [milestoneId]: '' }))
    await load()
  }

  if (loading) return <p className="text-sm text-slate-500">Loading project…</p>
  if (error) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load project: {error}</p>
  if (!details) return <section className="space-y-3"><h1 className="text-2xl font-semibold">Project not found</h1><p className="text-sm text-slate-600">This project is unavailable or you don’t have access to it.</p><Link to="/projects" className="inline-block text-sm font-medium underline">Back to projects</Link></section>

  return (
    <section className="space-y-6">
      <div><Link to="/projects" className="text-sm text-slate-600 hover:underline">← Your projects</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{details.project.name}</h1><StatusBadge status={details.project.status} /></div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{details.project.description || 'No project description.'}</p>
      </div>
      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Milestone timeline</h2>
        {details.milestones.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No milestones have been added yet.</p>}
        <ol className="space-y-4">{details.milestones.map((milestone, index) => (
          <li key={milestone.id} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">{index + 1}</span>Milestone</div>
            <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-base font-semibold">{milestone.title}</h3><StatusBadge status={milestone.status} /></div>
            {milestone.due_date && <p className="mt-2 text-sm text-slate-500">Due {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString()}</p>}
            {milestone.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{milestone.description}</p>}

            {milestone.status === 'in_review' && <div className="mt-5 rounded-lg bg-blue-50/70 p-4">
              <label className="block space-y-1.5 text-sm font-medium">Comment <span className="font-normal text-slate-500">(required to request changes)</span>
                <textarea rows={3} value={comments[milestone.id] ?? ''} onChange={(event) => setComments((current) => ({ ...current, [milestone.id]: event.target.value }))} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-slate-500" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={submittingId === milestone.id} onClick={() => void submitDecision(milestone.id, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">{submittingId === milestone.id ? 'Submitting…' : 'Approve'}</button>
                <button type="button" disabled={submittingId === milestone.id} onClick={() => void submitDecision(milestone.id, 'changes_requested')} className="rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50 disabled:opacity-50">Request changes</button></div>
            </div>}

            <div className="mt-5 border-t border-slate-100 pt-4"><h4 className="text-sm font-semibold">Past decisions</h4>
              {milestone.approvals.length === 0 ? <p className="mt-2 text-sm text-slate-500">No decisions yet.</p> : <ol className="mt-3 space-y-3">{milestone.approvals.map((approval) => (
                <li key={approval.id} className="rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={approval.decision} /><time className="text-xs text-slate-500" dateTime={approval.created_at}>{new Date(approval.created_at).toLocaleString()}</time></div>{approval.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{approval.comment}</p>}</li>
              ))}</ol>}
            </div>
          </li>
        ))}</ol>
      </div>
    </section>
  )
}
