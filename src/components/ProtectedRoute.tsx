import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { debugAction, reportActionError } from '../lib/actionFeedback'

export default function ProtectedRoute({ adminOnly = false, clientOnly = false }: { adminOnly?: boolean; clientOnly?: boolean }) {
  const { session, profile, loading, retryProfile, signOut } = useAuth()
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function handleRecoverySignOut() {
    debugAction('profile recovery sign out')
    setSigningOut(true)
    setRecoveryMessage(null)
    try {
      const message = await signOut()
      if (message) setRecoveryMessage(`Could not sign out: ${message}`)
    } catch (caught) {
      setRecoveryMessage(`Could not sign out: ${reportActionError('Profile recovery sign out', caught)}`)
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B08] text-[#aab8ad]">
        Loading...
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070B08] px-4 py-10 text-[#e0e9e2]">
        <section className="page-enter w-full max-w-lg rounded-3xl border border-[#223127] bg-[#141D17] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa99e]">Account setup</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">We couldn’t load your profile</h1>
          <p className="mt-3 text-sm leading-6 text-[#aab8ad]">Your sign-in is still active, but your portal profile is missing or temporarily unavailable. Try again, or sign out and contact your project administrator if this continues.</p>
          {recoveryMessage && <p role="alert" className="mt-4 rounded-xl border border-[#56382d] bg-[#39251f] p-3 text-sm text-[#e0a182]">{recoveryMessage}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => { debugAction('retry profile fetch'); setRecoveryMessage(null); retryProfile() }} className="rounded-xl bg-[#203d30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4c3a]">Retry</button>
            <button type="button" disabled={signingOut} onClick={() => void handleRecoverySignOut()} className="rounded-xl border border-[#223127] px-4 py-2.5 text-sm font-semibold text-[#c4d2c8] transition hover:bg-[#223127] disabled:opacity-50">{signingOut ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </section>
      </main>
    )
  }
  if (adminOnly && profile.role !== 'admin') return <Navigate to="/projects" replace />
  if (clientOnly && profile.role !== 'client') return <Navigate to={profile.role === 'admin' ? '/admin/projects' : '/projects'} replace />

  return <Outlet />
}
