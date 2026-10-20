import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  upload: vi.fn<(file: File, projectId: string, userId: string) => Promise<void>>(),
}))

vi.mock('../lib/projectFiles', () => ({
  PROJECT_FILE_ACCEPT: '.pdf,.png,.jpg,.webp,.docx,.xlsx,.zip,.txt',
  validateProjectFile: (file: File) => file.name.endsWith('.pdf') ? null : 'Choose a PDF file.',
  uploadProjectFile: mocks.upload,
}))

vi.mock('../lib/actionFeedback', () => ({
  debugAction: vi.fn(),
  reportActionError: (_action: string, error: unknown) => error instanceof Error ? error.message : 'Unexpected error',
}))

import FileUploader from './FileUploader'

describe('FileUploader', () => {
  beforeEach(() => {
    mocks.upload.mockResolvedValue(undefined)
  })

  it('uploads accepted files and refreshes the file list', async () => {
    const onUploaded = vi.fn(async () => undefined)
    const file = new File(['content'], 'brief.pdf', { type: 'application/pdf' })
    const { container } = render(<FileUploader projectId="project-1" userId="admin-1" onUploaded={onUploaded} />)
    const input = container.querySelector('input[type="file"]')

    expect(input).toBeInstanceOf(HTMLInputElement)
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file, 'project-1', 'admin-1'))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce())
    expect(await screen.findByRole('button', { name: 'Choose files' })).toBeEnabled()
  })

  it('shows validation errors without calling Supabase upload', async () => {
    const file = new File(['content'], 'script.exe', { type: 'application/octet-stream' })
    const { container } = render(<FileUploader projectId="project-1" userId="admin-1" onUploaded={async () => undefined} />)
    const input = container.querySelector('input[type="file"]')

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('script.exe: Choose a PDF file.')
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('shows upload failures to the user and recovers its button state', async () => {
    mocks.upload.mockRejectedValueOnce(new Error('Storage upload failed'))
    const file = new File(['content'], 'brief.pdf', { type: 'application/pdf' })
    const { container } = render(<FileUploader projectId="project-1" userId="admin-1" onUploaded={async () => undefined} />)
    const input = container.querySelector('input[type="file"]')

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('brief.pdf: Storage upload failed')
    expect(await screen.findByRole('button', { name: 'Choose files' })).toBeEnabled()
  })
})
