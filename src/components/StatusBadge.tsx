import { Badge } from './ui'

type Status = 'active' | 'paused' | 'completed' | 'pending' | 'in_review' | 'approved' | 'changes_requested'

const tones: Record<Status, 'neutral' | 'pending' | 'approved' | 'rejected'> = {
  active: 'neutral',
  paused: 'neutral',
  completed: 'neutral',
  pending: 'pending',
  in_review: 'pending',
  approved: 'approved',
  changes_requested: 'rejected',
}

export default function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={tones[status]}>{status.replaceAll('_', ' ')}</Badge>
}
