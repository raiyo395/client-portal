import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { PROJECT_FILE_ACCEPT, uploadProjectFile, validateProjectFile } from '../lib/projectFiles'

type FileUploaderProps = {
  projectId: string
  userId: string
  onUploaded: () => Promise<void>
}

export default function FileUploader({ projectId, userId, onUploaded }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ id: string; name: string }>>([])
  const [errors, setErrors] = useState<string[]>([])

  async function handleFiles(fileList: FileList | File[]) {
    const candidates = Array.from(fileList)
    const validFiles: File[] = []
    const nextErrors: string[] = []
    for (const file of candidates) {
      const validationError = validateProjectFile(file)
      if (validationError) nextErrors.push(`${file.name}: ${validationError}`)
      else validFiles.push(file)
    }
    setErrors(nextErrors)

    for (const file of validFiles) {
      const id = crypto.randomUUID()
      setUploadingFiles((current) => [...current, { id, name: file.name }])
      try {
        await uploadProjectFile(file, projectId, userId)
        await onUploaded()
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'An unexpected error occurred.'
        setErrors((current) => [...current, `${file.name}: ${message}`])
      } finally {
        setUploadingFiles((current) => current.filter((item) => item.id !== id))
      }
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files
    if (selected?.length) void handleFiles(selected)
    event.currentTarget.value = ''
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files)
  }

  const busy = uploadingFiles.length > 0

  return (
    <section aria-label="Upload project files" className={`rounded-2xl border bg-[#141D17] p-5 transition-colors sm:p-6 ${dragging ? 'border-[#9bbc82] bg-[#19251c]' : 'border-[#223127]'}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={onDrop}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-base font-semibold text-[#e0e9e2]">Project files</h2><p className="mt-1 text-sm text-[#aab8ad]">Share PDFs, images, Office files, ZIPs, and text files up to 10 MB.</p></div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl bg-[#203d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4c3a] disabled:cursor-wait disabled:opacity-50">{busy ? 'Uploading…' : 'Choose files'}</button>
        <input ref={inputRef} className="sr-only" type="file" accept={PROJECT_FILE_ACCEPT} multiple onChange={onFileInput} />
      </div>
      <p className="mt-4 rounded-xl border border-dashed border-[#35473a] px-4 py-5 text-center text-xs text-[#9aa99e]">Or drag and drop files here</p>
      {uploadingFiles.length > 0 && <ul aria-live="polite" className="mt-3 space-y-2">{uploadingFiles.map((file) => <li key={file.id} className="text-xs text-[#b7d39f]">Uploading {file.name}…</li>)}</ul>}
      {errors.length > 0 && <ul role="alert" className="mt-3 space-y-2 rounded-xl border border-[#56382d] bg-[#39251f] p-3 text-sm text-[#e0a182]">{errors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>}
    </section>
  )
}
