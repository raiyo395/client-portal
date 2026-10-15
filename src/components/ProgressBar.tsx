export default function ProgressBar({ approved, total }: { approved: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100)
  return (
    <div className="min-w-32">
      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-600">
        <span>{approved} / {total} approved</span><span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={approved} aria-valuemin={0} aria-valuemax={total} aria-label="Milestone progress">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
