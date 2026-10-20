import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile, loading } = useAuth()

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading your account…</p>
  if (!profile) {
    return <p className="rounded-lg border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-4 text-sm text-[var(--status-rejected)]">Your account profile could not be loaded. Please sign out and sign in again.</p>
  }
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/projects'} replace />
}
