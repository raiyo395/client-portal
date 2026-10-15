type Status = 'active' | 'paused' | 'completed' | 'pending' | 'in_review' | 'approved' | 'changes_requested'

const styles: Record<Status, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  pending: 'bg-slate-100 text-slate-700',
  in_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  changes_requested: 'bg-orange-50 text-orange-700',
}

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{status.replaceAll('_', ' ')}</span>
}
