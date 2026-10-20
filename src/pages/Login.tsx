import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { debugAction, reportActionError } from '../lib/actionFeedback'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    debugAction(mode === 'login' ? 'sign in' : 'sign up', { email, full_name: mode === 'signup' ? fullName.trim() : undefined })
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      const result = mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, fullName.trim())
      if (result) setError(result)
      else if (mode === 'signup') {
        setInfo('Account created. Check your email to confirm, then log in.')
        setMode('login')
      }
    } catch (caught) {
      setError(reportActionError(mode === 'login' ? 'Sign in' : 'Sign up', caught))
    } finally {
      setSubmitting(false)
    }
  }

  function toggleMode() {
    const nextMode = mode === 'login' ? 'signup' : 'login'
    debugAction('switch sign-in mode', { next_mode: nextMode })
    setMode(nextMode)
    setError(null)
    setInfo(null)
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] p-4 sm:p-6 lg:grid lg:place-items-center">
      <div className="page-enter mx-auto grid min-h-[min(760px,calc(100vh-3rem))] w-full max-w-5xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-[0_28px_90px_-42px_var(--canvas)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[var(--nav)] p-10 text-[var(--text-primary)] lg:flex xl:p-12">
          <div aria-hidden="true" className="absolute -right-24 -top-16 h-80 w-80 rounded-full border border-[var(--border)]" /><div aria-hidden="true" className="absolute -right-8 top-0 h-64 w-64 rounded-full border border-[var(--border)]" /><div aria-hidden="true" className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[var(--surface-hover)]/[0.07]" />
          <div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-hover)] text-sm font-black text-[var(--text-primary)]">CP</span><span className="text-sm font-semibold tracking-wide">Client Portal</span></div>
          <div className="relative max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Thoughtful work, clearly shared</p><h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-[-0.045em] xl:text-[3.2rem]">Good work moves forward together.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-[var(--text-muted)]">One calm place to follow progress, share feedback, and keep every project moving.</p>
            <div className="mt-9 space-y-3">{['See every milestone at a glance', 'Review work when it’s ready', 'Keep decisions and notes together'].map((line, index) => <div key={line} className="flex items-center gap-3 text-xs text-[var(--text-muted)]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--surface-hover)] text-[10px] text-[var(--text-primary)]">0{index + 1}</span>{line}</div>)}</div>
          </div>
          <p className="relative text-[11px] text-[var(--text-muted)]">A better view of the work we do together.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-9 flex items-center gap-2.5 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface-hover)] text-xs font-black text-[var(--text-primary)]">CP</span><span className="text-sm font-semibold text-[var(--text-primary)]">Client Portal</span></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{mode === 'login' ? 'Pick up where your projects left off.' : 'Join your team’s shared project workspace.'}</p>

            <div className="mt-8 space-y-4">
              {mode === 'signup' && <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Full name<input autoComplete="name" className="portal-input" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>}
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Email address<input autoComplete="email" className="portal-input" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-[var(--text-muted)]">Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="portal-input" type="password" placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-3 text-sm text-[var(--status-rejected)]">{error}</p>}
            {info && <p role="status" className="mt-4 rounded-xl border border-[var(--status-approved-soft)] bg-[var(--card)] p-3 text-sm text-[var(--status-approved)]">{info}</p>}
            <button type="submit" disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[var(--text-on-gold)] shadow-sm transition hover:bg-[var(--gold-hover)] active:bg-[var(--gold-pressed)] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">{mode === 'login' ? 'New to the portal?' : 'Already have an account?'} <button type="button" onClick={toggleMode} className="font-semibold text-[var(--text-primary)] underline decoration-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)]">{mode === 'login' ? 'Create an account' : 'Sign in instead'}</button></p>
          </form>
        </section>
      </div>
    </main>
  )
}
