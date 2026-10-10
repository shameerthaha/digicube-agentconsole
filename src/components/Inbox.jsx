import { EnvelopeSimple, FileText, Play, CircleNotch, Clock } from '@phosphor-icons/react'
import { t } from '../i18n.js'
import { cx, STATUS_STYLE, fmtTime } from '../lib.js'

const STATUS_KEY = {
  queued: 'queued',
  running: 'running',
  awaiting: 'awaiting',
  dispatched: 'dispatched',
  escalated: 'escalated',
  infoRequested: 'infoRequested',
  rejected: 'rejected',
  approved: 'approved',
}

export default function Inbox({ lang, cases, selectedId, onSelect, onRun }) {
  return (
    <aside className="flex min-h-0 flex-col border-e border-edge bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-3.5 py-2.5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">{t(lang, 'inbox')}</h2>
        <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] text-mute">
          {cases.length} {t(lang, 'newCases')}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cases.map((c) => {
          const selected = c.id === selectedId
          const statusKey = STATUS_KEY[c.status] ?? 'queued'
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cx(
                'cursor-pointer border-b border-edge px-3.5 py-3 transition-colors',
                selected ? 'bg-raised' : 'hover:bg-raised/60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] font-semibold text-info">{c.ref}</span>
                <span className={cx('rounded-full border px-1.5 py-px text-[9.5px] font-semibold', STATUS_STYLE[c.status])}>
                  {t(lang, statusKey)}
                </span>
              </div>

              <div className="mt-1 text-[12.5px] font-semibold leading-snug text-ink">
                {lang === 'ar' ? c.subject_ar : c.subject_en}
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-mute">
                <EnvelopeSimple size={11} className="shrink-0" />
                <span className="truncate font-mono">{c.sender}</span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-mute">
                  <span className="flex items-center gap-1">
                    <FileText size={11} /> 1 {t(lang, 'attachments')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {c.slaHours}h SLA
                  </span>
                  <span className="font-mono">{fmtTime(c.receivedAt)}</span>
                </div>
                {c.status === 'queued' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRun(c.id)
                    }}
                    className="flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-panel transition-transform hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <Play size={10} weight="fill" />
                    {t(lang, 'runAgent')}
                  </button>
                )}
                {c.status === 'running' && <CircleNotch size={13} className="animate-spin text-info" />}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
