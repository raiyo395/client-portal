import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchProjectFiles, type ProjectFileWithUploader } from '../lib/projectFiles'
import FileList from './FileList'
import FileUploader from './FileUploader'

export default function ProjectFilesSection({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const [files, setFiles] = useState<ProjectFileWithUploader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      setFiles(await fetchProjectFiles(projectId, profile.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [profile, projectId])

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    void fetchProjectFiles(projectId, profile.id)
      .then((rows) => { if (!cancelled) { setFiles(rows); setError(null) } })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'An unexpected error occurred.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profile, projectId])

  if (!profile) return null

  return (
    <section className="space-y-4">
      <FileUploader projectId={projectId} userId={profile.id} onUploaded={load} />
      <FileList files={files} viewerId={profile.id} isAdmin={profile.role === 'admin'} loading={loading} error={error} onRetry={load} onDeleted={load} />
    </section>
  )
}
