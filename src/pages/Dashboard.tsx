import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile, loading } = useAuth()

  if (loading) return <p className="text-sm text-slate-500">Loading your account…</p>
  if (!profile) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account profile could not be loaded. Please sign out and sign in again.</p>
  }
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/projects'} replace />
}
