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
    <section aria-label="Project file list" className="rounded-2xl border border-[#223127] bg-[#141D17] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#e0e9e2]">Shared files</h2><p className="mt-1 text-sm text-[#aab8ad]">Files stored privately for this project.</p></div>{!loading && !error && <span className="rounded-full bg-[#223127] px-3 py-1 text-xs text-[#b7d39f]">{files.length} {files.length === 1 ? 'file' : 'files'}</span>}</div>
      {actionError && <p role="alert" className="mt-4 rounded-xl border border-[#56382d] bg-[#39251f] p-3 text-sm text-[#e0a182]">{actionError}</p>}
      {loading && <p className="mt-4 rounded-xl bg-[#070B08] p-4 text-sm text-[#aab8ad]">Loading project files…</p>}
      {!loading && error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#56382d] bg-[#39251f] p-4 text-sm text-[#e0a182]"><span>Could not load project files: {error}</span><button type="button" onClick={retry} className="rounded-lg border border-[#8f604a] px-3 py-2 font-semibold">Retry</button></div>}
      {!loading && !error && files.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#35473a] p-6 text-center text-sm text-[#9aa99e]">No files have been shared on this project yet.</p>}
      {!loading && !error && files.length > 0 && <ul className="mt-4 divide-y divide-[#223127]">{files.map((file) => {
        const canDelete = isAdmin || file.uploaded_by === viewerId
        return <li key={file.id} className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="break-all text-sm font-semibold text-[#e0e9e2]">{file.file_name}</p><p className="mt-1 text-xs text-[#9aa99e]">{formatFileSize(file.size_bytes)} <span aria-hidden="true">·</span> {file.uploader_name} <span aria-hidden="true">·</span> <time dateTime={file.created_at}>{new Date(file.created_at).toLocaleString()}</time></p></div>
          <div className="flex shrink-0 gap-2"><button type="button" disabled={downloadingId === file.id || deletingId !== null} onClick={() => void download(file)} className="rounded-lg border border-[#35473a] px-3 py-2 text-xs font-semibold text-[#c4d2c8] transition hover:bg-[#223127] disabled:opacity-50">{downloadingId === file.id ? 'Preparing…' : 'Download'}</button>{canDelete && <button type="button" disabled={downloadingId !== null || deletingId !== null} onClick={() => void remove(file)} className="rounded-lg border border-[#56382d] px-3 py-2 text-xs font-semibold text-[#e0a182] transition hover:bg-[#39251f] disabled:opacity-50">{deletingId === file.id ? 'Deleting…' : 'Delete'}</button>}</div>
        </li>
      })}</ul>}
    </section>
  )
}
