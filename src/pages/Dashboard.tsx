import { useAuth } from '../context/AuthContext'

// Placeholder: next step replaces this with the real projects list
export default function Dashboard() {
  const { profile, session, signOut } = useAuth()

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {profile?.full_name ?? session?.user.email}
        </h1>
        <button onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          Log out
        </button>
      </div>
      <p className="mt-2 text-slate-600">
        Role: <span className="font-medium">{profile?.role ?? 'unknown'}</span>
      </p>
    </div>
  )
}