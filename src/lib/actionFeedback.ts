type ErrorRecord = {
  message?: unknown
  code?: unknown
}

function asErrorRecord(error: unknown): ErrorRecord | null {
  if (typeof error !== 'object' || error === null) return null
  return error as ErrorRecord
}

export function debugAction(action: string, values?: unknown): void {
  if (import.meta.env.DEV) console.log(`${action} clicked`, values)
}

export function reportActionError(action: string, error: unknown): string {
  console.error(`${action} failed`, error)

  const record = asErrorRecord(error)
  const message = error instanceof Error
    ? error.message
    : typeof record?.message === 'string'
      ? record.message
      : 'An unexpected error occurred.'
  const code = typeof record?.code === 'string' ? record.code : null
  return `${message}${code ? ` (code: ${code})` : ''}`
}
