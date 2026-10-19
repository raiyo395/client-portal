export default function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-2 border-[#223127] border-t-emerald-400" />
    </div>
  )
}
