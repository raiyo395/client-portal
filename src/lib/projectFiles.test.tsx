import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectFile } from '../types'

type ErrorResult = { error: Error | null }
type DownloadResult = { data: Blob | null; error: Error | null }
type UploadOptions = { cacheControl: string; contentType: string; upsert: boolean }

const mocks = vi.hoisted(() => ({
  upload: vi.fn<(path: string, file: File, options: UploadOptions) => Promise<ErrorResult>>(),
  download: vi.fn<(path: string) => Promise<DownloadResult>>(),
  remove: vi.fn<(paths: string[]) => Promise<ErrorResult>>(),
  insert: vi.fn<(row: Record<string, unknown>) => Promise<ErrorResult>>(),
  deleteEq: vi.fn<(column: string, id: string) => Promise<ErrorResult>>(),
  from: vi.fn<(table: string) => unknown>(),
  storageFrom: vi.fn<(bucket: string) => unknown>(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}))

import {
  deleteProjectFile,
  downloadProjectFile,
  formatFileSize,
  MAX_PROJECT_FILE_SIZE,
  uploadProjectFile,
  validateProjectFile,
} from './projectFiles'

const projectFile: ProjectFile = {
  id: 'file-1',
  project_id: 'project-1',
  uploaded_by: 'admin-1',
  file_name: 'Screenshot 2026-10-19 162123.png',
  storage_path: 'project-1/object-uuid-Screenshot_2026-10-19_162123.png',
  size_bytes: 12,
  mime_type: 'image/png',
  created_at: '2026-10-19T16:21:23.000Z',
}

describe('project file storage utilities', () => {
  beforeEach(() => {
    mocks.upload.mockResolvedValue({ error: null })
    mocks.download.mockResolvedValue({ data: new Blob(['image']), error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.deleteEq.mockResolvedValue({ error: null })
    mocks.from.mockImplementation(() => ({
      insert: mocks.insert,
      delete: () => ({ eq: mocks.deleteEq }),
    }))
    mocks.storageFrom.mockReturnValue({
      upload: mocks.upload,
      download: mocks.download,
      remove: mocks.remove,
    })
  })

  it('validates file extension, MIME type, empty files, and the 10 MB limit', () => {
    expect(validateProjectFile(new File(['x'], 'image.png', { type: 'image/png' }))).toBeNull()
    expect(validateProjectFile(new File(['x'], 'image.exe', { type: 'application/octet-stream' }))).toMatch(/Choose a PDF/)
    expect(validateProjectFile(new File(['x'], 'image.png', { type: 'text/plain' }))).toMatch(/does not match/)
    expect(validateProjectFile(new File([], 'empty.png', { type: 'image/png' }))).toMatch(/empty/)
    expect(validateProjectFile(new File([new Uint8Array(MAX_PROJECT_FILE_SIZE + 1)], 'large.png', { type: 'image/png' }))).toMatch(/10 MB or smaller/)
  })

  it('uploads with the project folder prefix and a sanitized screenshot filename', async () => {
    const file = new File(['pixels'], 'Screenshot 2026-10-19 162123 (final)!.png', { type: 'image/png' })

    await uploadProjectFile(file, 'project-1', 'admin-1')

    expect(mocks.storageFrom).toHaveBeenCalledWith('project-files')
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^project-1\/[0-9a-f-]+-Screenshot_2026-10-19_162123_final.png$/i),
      file,
      { cacheControl: '3600', contentType: 'image/png', upsert: false },
    )
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'project-1',
      uploaded_by: 'admin-1',
      file_name: file.name,
      storage_path: expect.stringMatching(/^project-1\//),
    }))
  })

  it('removes the uploaded object when saving its metadata fails', async () => {
    mocks.insert.mockResolvedValueOnce({ error: new Error('row insert rejected') })

    await expect(uploadProjectFile(new File(['x'], 'design.png', { type: 'image/png' }), 'project-1', 'admin-1'))
      .rejects.toThrow(/row insert rejected.*uploaded object was removed/i)
    expect(mocks.remove).toHaveBeenCalledWith([expect.stringMatching(/^project-1\//)])
  })

  it('downloads using the decoded full storage path and the original display filename', async () => {
    vi.useFakeTimers()
    const createObjectUrl = vi.fn(() => 'blob:test-download')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadProjectFile({ ...projectFile, storage_path: 'project-1/folder%2Fscreen.png' })
    await vi.runOnlyPendingTimersAsync()

    expect(mocks.download).toHaveBeenCalledWith('project-1/folder/screen.png')
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test-download')
  })

  it('surfaces a NoSuchKey response instead of masking the Storage error', async () => {
    const noSuchKey = Object.assign(new Error('Object not found'), { code: 'NoSuchKey' })
    mocks.download.mockResolvedValueOnce({ data: null, error: noSuchKey })

    await expect(downloadProjectFile(projectFile)).rejects.toBe(noSuchKey)
    expect(mocks.download).toHaveBeenCalledWith(projectFile.storage_path)
  })

  it('does not delete the metadata row if Storage object removal fails', async () => {
    mocks.remove.mockResolvedValueOnce({ error: new Error('storage delete denied') })

    await expect(deleteProjectFile(projectFile)).rejects.toThrow('storage delete denied')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('formats file sizes for bytes, kilobytes, and megabytes', () => {
    expect(formatFileSize(10)).toBe('10 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})
