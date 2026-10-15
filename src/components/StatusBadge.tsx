type Status = 'active' | 'paused' | 'completed' | 'pending' | 'in_review' | 'approved' | 'changes_requested'

const styles: Record<Status, string> = {
  active: 'bg-[#233729] text-[#b6d59f]',
  paused: 'bg-[#3a311e] text-[#e5c678]',
  completed: 'bg-[#223127] text-[#b3bfb5]',
  pending: 'bg-[#223127] text-[#b3bfb5]',
  in_review: 'bg-[#1e3034] text-[#9acbd5]',
  approved: 'bg-[#233729] text-[#b6d59f]',
  changes_requested: 'bg-[#3a2921] text-[#e0a182]',
}

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ${styles[status]}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status.replaceAll('_', ' ')}</span>
}
