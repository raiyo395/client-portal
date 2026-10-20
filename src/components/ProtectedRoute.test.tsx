import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }))

vi.mock('../context/AuthContext', () => ({ useAuth: mocks.useAuth }))
vi.mock('../lib/actionFeedback', () => ({ debugAction: vi.fn(), reportActionError: vi.fn(() => 'Unexpected error') }))

import ProtectedRoute from './ProtectedRoute'

function authValue({
  session = null,
  profile = null,
  loading = false,
  retryProfile = vi.fn(),
  signOut = vi.fn(async () => null),
}: {
  session?: unknown
  profile?: unknown
  loading?: boolean
  retryProfile?: ReturnType<typeof vi.fn>
  signOut?: ReturnType<typeof vi.fn>
} = {}) {
  return { session, profile, loading, retryProfile, signOut, signIn: vi.fn(), signUp: vi.fn() }
}

function renderGuard(path: '/admin-only' | '/client-only', roleGuard: 'adminOnly' | 'clientOnly') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/projects" element={<p>Client dashboard</p>} />
        <Route path="/admin/projects" element={<p>Admin dashboard</p>} />
        <Route element={<ProtectedRoute {...(roleGuard === 'adminOnly' ? { adminOnly: true } : { clientOnly: true })} />}>
          <Route path={path} element={<p>Protected content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue(authValue())
  })

  it('shows a loading state while auth is resolving', () => {
    mocks.useAuth.mockReturnValue(authValue({ loading: true }))
    renderGuard('/admin-only', 'adminOnly')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    mocks.useAuth.mockReturnValue(authValue())
    renderGuard('/admin-only', 'adminOnly')
    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })

  it('redirects clients away from admin routes', () => {
    mocks.useAuth.mockReturnValue(authValue({
      session: { user: { id: 'client-1' } },
      profile: { id: 'client-1', full_name: 'Client', role: 'client' },
    }))
    renderGuard('/admin-only', 'adminOnly')
    expect(screen.getByText('Client dashboard')).toBeInTheDocument()
  })

  it('redirects admins away from client routes', () => {
    mocks.useAuth.mockReturnValue(authValue({
      session: { user: { id: 'admin-1' } },
      profile: { id: 'admin-1', full_name: 'Admin', role: 'admin' },
    }))
    renderGuard('/client-only', 'clientOnly')
    expect(screen.getByText('Admin dashboard')).toBeInTheDocument()
  })

  it('shows profile recovery and retries profile loading when selected', () => {
    const retryProfile = vi.fn()
    mocks.useAuth.mockReturnValue(authValue({ session: { user: { id: 'client-1' } }, retryProfile }))
    renderGuard('/client-only', 'clientOnly')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByRole('heading', { name: 'We couldn’t load your profile' })).toBeInTheDocument()
    expect(retryProfile).toHaveBeenCalledOnce()
  })
})
