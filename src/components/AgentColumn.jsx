import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  CheckCircle, XCircle, Warning, CircleNotch, Terminal, ArrowRight,
  Lightning, Link, PaperPlaneTilt, Robot,
} from '@phosphor-icons/react'
import DocViewer from './DocViewer.jsx'
import { t } from '../i18n.js'
import { cx, maskValue, fmtClock, SCOPE_STYLE } from '../lib.js'

const DECISION_TONE = {
  approve_ready: 'bg-accent-soft text-accent-ink border-accent/40',
  request_info: 'bg-info-soft text-info border-info/40',
  escalate: 'bg-fail-soft text-fail border-fail/40',
}
const DECISION_LABEL = { approve_ready: 'approveReady', request_info: 'requestInfo', escalate: 'escalatedTo' }
const RULE_ICON = { pass: CheckCircle, fail: XCircle, warn: Warning }
const RULE_TONE = { pass: 'text-accent', fail: 'text-fail', warn: 'text-warn' }

function StepShell({ step, lang, children }) {
  const running = step.status === 'running'
  const title = lang === 'ar' ? step.title_ar : step.title_en
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-edge bg-raised p-3"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink font-mono text-[9px] font-bold text-panel">
          {step.index + 1}
        </span>
        <span className="text-[12px] font-bold">{title}</span>
        <span className="ms-auto flex items-center gap-1.5">
          <span className="rounded bg-panel px-1.5 py-0.5 font-mono text-[9.5px] text-mute">{step.tool}</span>
          <span className={cx('rounded px-1.5 py-0.5 font-mono text-[9px] font-bold', SCOPE_STYLE[step.scope])}>
            {step.scope}
          </span>
          {running ? (
            <CircleNotch size={14} className="animate-spin text-info" />
          ) : (
            <CheckCircle size={14} weight="fill" className="text-accent" />
          )}
        </span>
      </div>
      {running ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-mute">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
          <span className="font-mono">executing...</span>
        </div>
      ) : (
        <div className="mt-2">
          {children}
          <div className="mt-2 flex items-center gap-2 font-mono text-[9.5px] text-mute">
            <span>{step.durationMs}ms</span>
            {step.outHash && (
              <span className="flex items-center gap-1">
                out <span className="text-ink-2">{step.outHash}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function IngestOut({ o, lang }) {
  const pct = Math.round((o.confidence ?? 0) * 100)
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-bold text-info">
          {lang === 'ar' ? o.label_ar : o.label_en}
        </span>
        <span className="font-mono text-[10px] text-mute">{o.case_type}</span>
        <span className="ms-auto flex items-center gap-1.5">
          <span className="text-[10px] text-mute">{t(lang, 'confidence')}</span>
          <span className="relative h-1.5 w-20 rounded-full bg-edge">
            <span
              className={cx('absolute start-0 top-0 h-full rounded-full', pct >= 80 ? 'bg-accent' : 'bg-fail')}
              style={{ width: `${pct}%` }}
            />
            <span className="absolute top-[-2px] h-[10px] w-px bg-fail" style={{ insetInlineStart: '80%' }} />
          </span>
          <span className={cx('font-mono text-[11px] font-bold', pct >= 80 ? 'text-accent-ink' : 'text-fail')}>{pct}%</span>
        </span>
      </div>
      {o.summary_en && <div className="mt-1.5 text-[11px] leading-relaxed text-ink-2">{o.summary_en}</div>}
    </div>
  )
}

function ExtractOut({ o, lang, litKey, setLitKey }) {
  return (
    <div>
      <div className="overflow-hidden rounded-md border border-edge">
        {o.fields?.map((f) => (
          <button
            key={f.key}
            onClick={() => setLitKey(f.key)}
            className={cx(
              'flex w-full items-center gap-2 border-b border-edge px-2 py-1 text-start text-[11px] last:border-0 transition-colors hover:bg-mark',
              litKey === f.key && 'bg-mark',
            )}
          >
            <span className="w-28 shrink-0 truncate text-mute">{lang === 'ar' ? f.label_ar : f.label_en}</span>
            <span className="min-w-0 flex-1 truncate font-mono font-semibold text-ink">
              {f.pii ? maskValue(f.value) : f.value}
            </span>
            <span className="font-mono text-[9.5px] text-mute">{Math.round(f.confidence * 100)}%</span>
            <Link size={11} className={cx('shrink-0', litKey === f.key ? 'text-accent' : 'text-edge-2')} />
          </button>
        ))}
      </div>
      <div className="mt-1 font-mono text-[9.5px] text-mute">
        {o.fields?.length} {t(lang, 'fieldsExtracted')} · {lang === 'ar' ? 'انقر على حقل لإظهار مصدره في المستند' : 'click a field to locate its source in the document'}
      </div>
    </div>
  )
}

function RulesOut({ o, lang }) {
  return (
    <div className="space-y-1">
      {o.rules?.map((r) => {
        const Icon = RULE_ICON[r.result]
        return (
          <div key={r.id} className="flex items-start gap-2 text-[11px]">
            <Icon size={14} weight="fill" className={cx('mt-0.5 shrink-0', RULE_TONE[r.result])} />
            <div className="min-w-0 flex-1">
              <span className="font-semibold">{lang === 'ar' ? r.label_ar : r.label_en}</span>
              <span className="ms-1.5 text-mute">{lang === 'ar' ? r.detail_ar : r.detail_en}</span>
            </div>
            <span
              className={cx(
                'shrink-0 rounded px-1 py-px font-mono text-[8.5px] font-bold',
                r.result === 'pass' && 'bg-accent-soft text-accent-ink',
                r.result === 'warn' && 'bg-warn-soft text-warn',
                r.result === 'fail' && 'bg-fail-soft text-fail',
              )}
            >
              {t(lang, r.result)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RecordsOut({ o, lang }) {
  return (
    <div className="space-y-1.5">
      {[
        ['registry_api', o.registry],
        ['payments_api', o.payments],
      ].map(([name, payload]) => (
        <details key={name} className="group rounded-md border border-edge bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 font-mono text-[10px] text-ink-2">
            <ArrowRight size={10} className="transition-transform group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:rotate-90" />
            {name}
            <span className="ms-auto text-mute">200 OK · {JSON.stringify(payload).length}B</span>
          </summary>
          <pre className="max-h-36 overflow-auto border-t border-edge px-2 py-1.5 font-mono text-[9.5px] leading-relaxed text-mute">
            {JSON.stringify(payload, null, 1)}
          </pre>
        </details>
      ))}
    </div>
  )
}

function DecideOut({ o, lang }) {
  return (
    <div className={cx('rounded-md border px-2.5 py-2', DECISION_TONE[o.action])}>
      <div className="flex items-center gap-2 text-[12px] font-bold">
        <Lightning size={13} weight="fill" />
        {t(lang, DECISION_LABEL[o.action])}
      </div>
      <div className="mt-1 text-[11px] leading-relaxed opacity-90">{lang === 'ar' ? o.reason_ar : o.reason_en}</div>
      {o.missing_en?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[10.5px]">
          {(lang === 'ar' ? o.missing_ar : o.missing_en).map((m) => (
            <li key={m} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DraftOut({ o, lang }) {
  const note = lang === 'ar' ? o.decision_note_ar : o.decision_note_en
  return (
    <div className="space-y-1.5">
      <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-2">{note}</p>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-warn">
        <PaperPlaneTilt size={11} />
        {lang === 'ar' ? 'مسودة بانتظار اعتماد الضابط - لم تُرسل' : 'staged for officer approval - nothing sent'}
      </div>
    </div>
  )
}

function RouteOut({ o, lang }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded bg-panel px-2 py-0.5 font-mono text-[10px] text-ink-2">{o.filed_to}</span>
      <ArrowRight size={11} className="text-mute rtl:-scale-x-100" />
      <span className="rounded bg-ink px-2 py-0.5 font-mono text-[10px] font-bold text-panel">{o.queue}</span>
      <span className="font-mono text-[9.5px] text-mute">SLA {o.sla_hours}h</span>
    </div>
  )
}

export default function AgentColumn({ lang, caseRec, run, tick }) {
  const [litKey, setLitKey] = useState(null)
  const feedRef = useRef(null)

  const fields = run?.steps?.extract?.output?.fields

  // Sequential provenance sweep: as extraction lands, light each evidence span.
  useEffect(() => {
    if (!fields?.length) return
    const timers = fields.map((f, i) => setTimeout(() => setLitKey(f.key), i * 190))
    const clear = setTimeout(() => setLitKey(null), fields.length * 190 + 900)
    return () => { timers.forEach(clearTimeout); clearTimeout(clear) }
  }, [fields])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [run?.order?.length, run?.status, run?.signals?.length])

  const elapsed = useMemo(() => {
    if (!run?.startedAt) return null
    return run.elapsedMs ?? Date.now() - run.startedAt
  }, [run?.startedAt, run?.elapsedMs, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex min-h-0 flex-col bg-paper">
      <div className="flex items-center gap-3 border-b border-edge bg-panel px-4 py-2">
        <span className="font-mono text-[11px] font-bold text-info">{caseRec?.ref ?? '·'}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-2">
          {caseRec ? (lang === 'ar' ? caseRec.subject_ar : caseRec.subject_en) : ''}
        </span>
        {elapsed != null && (
          <span className="flex items-center gap-2 font-mono text-[10.5px] text-mute">
            <span className={cx('font-bold tabular-nums', run?.status === 'running' ? 'text-info' : 'text-accent-ink')}>
              {fmtClock(elapsed)}
            </span>
            <span className="text-edge-2">|</span>
            <span>
              {t(lang, 'vsBaseline')} <span className="line-through">25:00</span>
            </span>
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 basis-[46%] flex-col border-b border-edge">
          {caseRec ? (
            <DocViewer
              lang={lang}
              docText={caseRec.docText}
              fields={fields}
              litKey={litKey}
              authority={lang === 'ar' ? caseRec.authority_ar : caseRec.authority_en}
            />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-edge bg-panel px-3.5 py-2">
            <Robot size={13} className="text-mute" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2">{t(lang, 'agentRun')}</span>
          </div>
          <div ref={feedRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {!run && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Terminal size={26} className="text-edge-2" />
                <p className="max-w-[240px] text-[12px] font-semibold text-ink-2">{t(lang, 'selectCase')}</p>
                <p className="max-w-[260px] text-[11px] text-mute">{t(lang, 'selectCaseHint')}</p>
              </div>
            )}
            {run?.order.map((id) => {
              const step = run.steps[id]
              const o = step.output ?? {}
              return (
                <div key={id}>
                  <StepShell step={step} lang={lang}>
                    {id === 'ingest' && <IngestOut o={o} lang={lang} />}
                    {id === 'extract' && <ExtractOut o={o} lang={lang} litKey={litKey} setLitKey={setLitKey} />}
                    {id === 'rules' && <RulesOut o={o} lang={lang} />}
                    {id === 'records' && <RecordsOut o={o} lang={lang} />}
                    {id === 'decide' && <DecideOut o={o} lang={lang} />}
                    {id === 'draft' && <DraftOut o={o} lang={lang} />}
                    {id === 'route' && <RouteOut o={o} lang={lang} />}
                  </StepShell>
                  {id === 'records' &&
                    run.signals.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2"
                      >
                        <Lightning size={14} weight="fill" className="mt-0.5 shrink-0 text-warn" />
                        <div>
                          <div className="text-[11px] font-bold text-warn">
                            {t(lang, 'crossCaseSignal')} · {lang === 'ar' ? s.label_ar : s.label_en}
                          </div>
                          <div className="text-[10.5px] text-ink-2">{lang === 'ar' ? s.detail_ar : s.detail_en}</div>
                        </div>
                        <span className="ms-auto rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] text-info">{s.relatedRef}</span>
                      </motion.div>
                    ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
