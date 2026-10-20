export default function ProgressBar({ approved, total }: { approved: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100)

  return (
    <div className="min-w-32">
      <div className="mb-2 flex justify-between gap-3 text-xs font-medium text-[var(--text-secondary)]">
        <span>{approved} of {total} approved</span>
        <span className="text-[var(--text-primary)]">{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]"
        role="progressbar"
        aria-valuenow={approved}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Milestone progress"
      >
        <div
          className="progress-fill h-full rounded-full bg-[var(--status-approved)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
