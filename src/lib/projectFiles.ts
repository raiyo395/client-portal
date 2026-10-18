import { supabase } from './supabase'
import type { Profile, ProjectFile } from '../types'

export const MAX_PROJECT_FILE_SIZE = 10 * 1024 * 1024
export const PROJECT_FILE_ACCEPT = '.pdf,.png,.jpg,.webp,.docx,.xlsx,.zip,.txt'

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain',
}

export type ProjectFileWithUploader = ProjectFile & { uploader_name: string }

export function validateProjectFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const expectedMimeType = MIME_BY_EXTENSION[extension]
  if (!expectedMimeType) return 'Choose a PDF, PNG, JPG, WEBP, DOCX, XLSX, ZIP, or TXT file.'
  const isZipMimeAlias = extension === 'zip' && file.type === 'application/x-zip-compressed'
  if (file.type && file.type !== expectedMimeType && !isZipMimeAlias) return 'The selected file type does not match its extension.'
  if (file.size <= 0) return 'The file is empty.'
  if (file.size > MAX_PROJECT_FILE_SIZE) return 'Each file must be 10 MB or smaller.'
  return null
}

export async function fetchProjectFiles(projectId: string, viewerId: string): Promise<ProjectFileWithUploader[]> {
  const { data, error } = await supabase.from('project_files')
    .select('id, project_id, uploaded_by, file_name, storage_path, size_bytes, mime_type, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const files = (data ?? []) as unknown as ProjectFile[]
  if (files.length === 0) return []

  const uploaderIds = [...new Set(files.map((file) => file.uploaded_by))]
  const { data: profileData, error: profileError } = await supabase.from('profiles')
    .select('id, full_name')
    .in('id', uploaderIds)
  if (profileError) throw profileError
  const profiles = (profileData ?? []) as Pick<Profile, 'id' | 'full_name'>[]
  const names = new Map(profiles.map((profile) => [profile.id, profile.full_name?.trim() || 'Project team']))

  return files.map((file) => ({
    ...file,
    uploader_name: file.uploaded_by === viewerId ? 'You' : names.get(file.uploaded_by) ?? 'Project team',
  }))
}

export async function uploadProjectFile(file: File, projectId: string, userId: string): Promise<void> {
  const validationError = validateProjectFile(file)
  if (validationError) throw new Error(validationError)

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = MIME_BY_EXTENSION[extension]
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'file'
  const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from('project-files').upload(storagePath, file, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  })
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const { error: insertError } = await supabase.from('project_files').insert({
    project_id: projectId,
    uploaded_by: userId,
    file_name: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    mime_type: mimeType,
  })
  if (!insertError) return

  const { error: cleanupError } = await supabase.storage.from('project-files').remove([storagePath])
  if (cleanupError) {
    throw new Error(`Could not save file details: ${insertError.message}. The uploaded object could not be removed: ${cleanupError.message}`)
  }
  throw new Error(`Could not save file details: ${insertError.message}. The uploaded object was removed.`)
}

export async function downloadProjectFile(file: ProjectFile): Promise<void> {
  const { data, error } = await supabase.storage.from('project-files')
    .createSignedUrl(file.storage_path, 60, { download: file.file_name })
  if (error) throw error
  window.location.assign(data.signedUrl)
}

export async function deleteProjectFile(file: ProjectFile): Promise<void> {
  const { error: storageError } = await supabase.storage.from('project-files').remove([file.storage_path])
  if (storageError) throw new Error(`Could not remove the stored file: ${storageError.message}`)

  const { error: rowError } = await supabase.from('project_files').delete().eq('id', file.id)
  if (rowError) throw new Error(`The stored file was removed, but its file record could not be deleted: ${rowError.message}`)
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
