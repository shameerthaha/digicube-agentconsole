export const cx = (...xs) => xs.filter(Boolean).join(' ')

export function maskValue(value) {
  // Emirates ID: 784-1985-4029173-6 -> 784-****-*******-6
  if (/^784-\d{4}-\d{7}-\d$/.test(value)) {
    const last = value.slice(-1)
    return `784-****-*******-${last}`
  }
  // Phone: +971-50-482-7714 -> +971-**-***-7714
  if (/^\+971-\d{2}-\d{3}-\d{4}$/.test(value)) {
    return `+971-**-***-${value.slice(-4)}`
  }
  return value
}

export function fmtClock(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}.${Math.floor((ms % 1000) / 100)}s`
}

export function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const SCOPE_STYLE = {
  'READ-ONLY': 'bg-info-soft text-info',
  'LLM-READ': 'bg-info-soft text-info',
  RULES: 'bg-accent-soft text-accent-ink',
  'LLM-REASON': 'bg-accent-soft text-accent-ink',
  'DRAFT-ONLY': 'bg-warn-soft text-warn',
  WRITE: 'bg-fail-soft text-fail',
  HUMAN: 'bg-raised text-ink-2',
}

export const STATUS_STYLE = {
  queued: 'bg-raised text-mute border-edge-2',
  running: 'bg-info-soft text-info border-info/30',
  awaiting: 'bg-warn-soft text-warn border-warn/30',
  approved: 'bg-accent-soft text-accent-ink border-accent/30',
  dispatched: 'bg-accent-soft text-accent-ink border-accent/30',
  escalated: 'bg-fail-soft text-fail border-fail/30',
  infoRequested: 'bg-info-soft text-info border-info/30',
  rejected: 'bg-fail-soft text-fail border-fail/30',
}
