import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--gold)] text-[var(--text-on-gold)] hover:bg-[var(--gold-hover)] active:bg-[var(--gold-pressed)]',
    secondary: 'border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
    quiet: 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
    danger: 'border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] text-[var(--status-rejected)] hover:bg-[var(--status-rejected-soft)]',
  }

  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] ${className}`}
      {...props}
    />
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pending' | 'approved' | 'rejected' }) {
  const tones = {
    neutral: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
    pending: 'bg-[var(--status-pending-soft)] text-[var(--status-pending)]',
    approved: 'bg-[var(--status-approved-soft)] text-[var(--status-approved)]',
    rejected: 'bg-[var(--status-rejected-soft)] text-[var(--status-rejected)]',
  }
  const markers = { neutral: '•', pending: '◷', approved: '✓', rejected: '×' }

  return (
    <span className={`inline-flex min-h-7 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tones[tone]}`}>
      <span aria-hidden="true" className="font-bold leading-none">{markers[tone]}</span>
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-xl bg-[var(--surface-hover)] ${className}`} />
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] px-5 py-10 text-center sm:px-8">
      <div aria-hidden="true" className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--text-secondary)]">◎</div>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-[var(--status-rejected-soft)] bg-[var(--status-rejected-soft)] p-5 sm:p-6">
      <p className="text-sm font-semibold text-[var(--status-rejected)]">We couldn’t load this view</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
