import { useState } from 'react'
import { deleteProjectFile, downloadProjectFile, formatFileSize, type ProjectFileWithUploader } from '../lib/projectFiles'
import { debugAction, reportActionError } from '../lib/actionFeedback'

type FileListProps = {
  files: ProjectFileWithUploader[]
  viewerId: string
  isAdmin: boolean
  loading: boolean
  error: string | null
  onRetry: () => void
  onDeleted: () => Promise<void>
}

export default function FileList({ files, viewerId, isAdmin, loading, error, onRetry, onDeleted }: FileListProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function download(file: ProjectFileWithUploader) {
    debugAction('download project file', { project_file_id: file.id, file_name: file.file_name })
    setActionError(null)
    setDownloadingId(file.id)
    try {
      await downloadProjectFile(file)
    } catch (caught) {
      setActionError(`Could not download ${file.file_name}: ${reportActionError('Download project file', caught)}`)
    } finally {
      setDownloadingId(null)
    }
  }

  async function remove(file: ProjectFileWithUploader) {
    debugAction('delete project file', { project_file_id: file.id, file_name: file.file_name })
    if (!window.confirm(`Delete “${file.file_name}” from this project?`)) return
    setActionError(null)
    setDeletingId(file.id)
    try {
      await deleteProjectFile(file)
      await onDeleted()
    } catch (caught) {
      setActionError(`Could not delete ${file.file_name}: ${reportActionError('Delete project file', caught)}`)
    } finally {
      setDeletingId(null)
    }
  }

  function retry() {
    debugAction('retry project file list')
    void onRetry()
  }

  return (
    <section aria-label="Project file list" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--text-primary)]">Shared files</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Files stored privately for this project.</p></div>{!loading && !error && <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs text-[var(--text-muted)]">{files.length} {files.length === 1 ? 'file' : 'files'}</span>}</div>
      {actionError && <p role="alert" className="mt-4 rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-sm text-[var(--status-rejected)]">{actionError}</p>}
      {loading && <p className="mt-4 rounded-xl bg-[var(--canvas)] p-4 text-sm text-[var(--text-muted)]">Loading project files…</p>}
      {!loading && error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-4 text-sm text-[var(--status-rejected)]"><span>Could not load project files: {error}</span><button type="button" onClick={retry} className="rounded-lg border border-[var(--status-rejected-soft)] px-3 py-2 font-semibold">Retry</button></div>}
      {!loading && !error && files.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">No files have been shared on this project yet.</p>}
      {!loading && !error && files.length > 0 && <ul className="mt-4 divide-y divide-[var(--border)]">{files.map((file) => {
        const canDelete = isAdmin || file.uploaded_by === viewerId
        return <li key={file.id} className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="break-all text-sm font-semibold text-[var(--text-primary)]">{file.file_name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(file.size_bytes)} <span aria-hidden="true">·</span> {file.uploader_name} <span aria-hidden="true">·</span> <time dateTime={file.created_at}>{new Date(file.created_at).toLocaleString()}</time></p></div>
          <div className="flex shrink-0 gap-2"><button type="button" disabled={downloadingId === file.id || deletingId !== null} onClick={() => void download(file)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50">{downloadingId === file.id ? 'Preparing…' : 'Download'}</button>{canDelete && <button type="button" disabled={downloadingId !== null || deletingId !== null} onClick={() => void remove(file)} className="rounded-lg border border-[var(--status-rejected-soft)] px-3 py-2 text-xs font-semibold text-[var(--status-rejected)] transition hover:bg-[var(--status-rejected-soft)] disabled:opacity-50">{deletingId === file.id ? 'Deleting…' : 'Delete'}</button>}</div>
        </li>
      })}</ul>}
    </section>
  )
}
