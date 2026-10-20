import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectFile } from '../types'

const mocks = vi.hoisted(() => ({
  download: vi.fn<(file: ProjectFile) => Promise<void>>(),
  remove: vi.fn<(file: ProjectFile) => Promise<void>>(),
}))

vi.mock('../lib/projectFiles', () => ({
  deleteProjectFile: mocks.remove,
  downloadProjectFile: mocks.download,
  formatFileSize: (sizeBytes: number) => `${sizeBytes} B`,
}))

vi.mock('../lib/actionFeedback', () => ({
  debugAction: vi.fn(),
  reportActionError: (_action: string, error: unknown) => {
    console.error(`${_action} failed`, error)
    if (error instanceof Error) {
      const code = 'code' in error && typeof error.code === 'string' ? ` (code: ${error.code})` : ''
      return `${error.message}${code}`
    }
    return 'Unexpected error'
  },
}))

import FileList from './FileList'

const file: ProjectFile & { uploader_name: string } = {
  id: 'file-1',
  project_id: 'project-1',
  uploaded_by: 'admin-1',
  file_name: 'Screenshot 2026-10-19 162123.png',
  storage_path: 'project-1/file-1-Screenshot_2026-10-19_162123.png',
  size_bytes: 12,
  mime_type: 'image/png',
  created_at: '2026-10-19T16:21:23.000Z',
  uploader_name: 'Project admin',
}

describe('FileList', () => {
  beforeEach(() => {
    mocks.download.mockResolvedValue(undefined)
    mocks.remove.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('lets a client download but does not render delete controls', () => {
    render(<FileList files={[file]} isAdmin={false} loading={false} error={null} onRetry={() => undefined} onDeleted={async () => undefined} />)

    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows the full NoSuchKey error when download fails', async () => {
    mocks.download.mockRejectedValueOnce(Object.assign(new Error('Object not found'), { code: 'NoSuchKey' }))
    render(<FileList files={[file]} isAdmin={false} loading={false} error={null} onRetry={() => undefined} onDeleted={async () => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not download Screenshot 2026-10-19 162123.png: Object not found (code: NoSuchKey)')
  })

  it('renders delete controls for admins and refreshes after deletion', async () => {
    const onDeleted = vi.fn(async () => undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<FileList files={[file]} isAdmin loading={false} error={null} onRetry={() => undefined} onDeleted={onDeleted} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(mocks.remove).toHaveBeenCalledWith(file)
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(onDeleted).toHaveBeenCalledOnce()
  })
})
