import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  SealCheck, PencilSimple, XCircle, CircleNotch, Stamp,
  ShieldCheck, UserCheck,
} from '@phosphor-icons/react'
import { t } from '../i18n.js'
import { cx, fmtTime } from '../lib.js'

const DECISION_TONE = {
  approve_ready: 'border-accent/50 bg-accent-soft text-accent-ink',
  request_info: 'border-info/50 bg-info-soft text-info',
  escalate: 'border-fail/50 bg-fail-soft text-fail',
}
const DECISION_LABEL = { approve_ready: 'approveReady', request_info: 'requestInfo', escalate: 'escalate' }
const PRIMARY_ACTION = {
  approve_ready: { action: 'approve', label: 'approveSend', tone: 'bg-accent text-white hover:bg-accent-ink' },
  request_info: { action: 'info', label: 'sendNotice', tone: 'bg-info text-white' },
  escalate: { action: 'escalate', label: 'confirmEscalation', tone: 'bg-fail text-white' },
}

export default function Checkpoint({ lang, caseRec, run, resolution, onAction }) {
  const [tab, setTab] = useState('note')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    setTab('note')
    setEditing(false)
    setRejecting(false)
    setRejectReason('')
  }, [caseRec?.id])

  const done = run?.status === 'done'
  const decide = run?.steps?.decide?.output
  const draft = run?.steps?.draft?.output
  const busy = run?.status === 'running'

  const primary = decide ? PRIMARY_ACTION[decide.action] : null
  const emailBody = tab === 'ar' ? draft?.email_ar : draft?.email_en

  const submit = (action) => {
    onAction(caseRec.id, action, editing && action === primary.action ? editText !== emailBody : false)
    setEditing(false)
    setRejecting(false)
  }

  return (
    <aside className="flex min-h-0 flex-col border-s border-edge bg-panel">
      <div className="flex items-center gap-2 border-b border-edge px-3.5 py-2.5">
        <ShieldCheck size={14} className="text-accent" />
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">{t(lang, 'checkpoint')}</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {!done && (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
            {busy ? <CircleNotch size={22} className="animate-spin text-info" /> : <UserCheck size={26} className="text-edge-2" />}
            <p className="max-w-[230px] text-[12px] font-semibold text-ink-2">
              {busy ? t(lang, 'checkpointWaiting') : t(lang, 'checkpointEmpty')}
            </p>
            {!busy && <p className="max-w-[240px] text-[11px] text-mute">{t(lang, 'awaitingOfficerDesc')}</p>}
          </div>
        )}

        {done && decide && draft && (
          <div className="space-y-3">
            <div className={cx('rounded-lg border px-3 py-2.5', DECISION_TONE[decide.action])}>
              <div className="text-[12px] font-bold">{t(lang, DECISION_LABEL[decide.action])}</div>
              <div className="mt-0.5 text-[10.5px] leading-relaxed opacity-90">
                {lang === 'ar' ? decide.reason_ar : decide.reason_en}
              </div>
            </div>

            {/* draft memo card */}
            <div className="relative overflow-hidden rounded-lg border border-edge bg-raised">
              <div className="flex border-b border-edge">
                {[
                  ['note', t(lang, 'decisionNote')],
                  ['en', `${t(lang, 'replyEmail')} · EN`],
                  ['ar', `${t(lang, 'replyEmail')} · AR`],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => { setTab(k); setEditing(false) }}
                    className={cx(
                      'flex-1 px-2 py-2 text-[10.5px] font-bold transition-colors',
                      tab === k ? 'bg-panel text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'bg-raised text-mute hover:text-ink',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-3">
                {tab === 'note' && (
                  <p className="text-[12px] leading-relaxed text-ink-2">
                    {lang === 'ar' ? draft.decision_note_ar : draft.decision_note_en}
                  </p>
                )}
                {tab !== 'note' && (
                  <div dir={tab === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="mb-1.5 border-b border-edge pb-1.5 font-mono text-[10.5px] text-mute">
                      {draft.email_subject}
                    </div>
                    {editing ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={11}
                        className="w-full resize-none rounded-md border border-edge-2 bg-panel p-2 text-[11.5px] leading-relaxed text-ink focus:border-accent focus:outline-none"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink-2">{emailBody}</p>
                    )}
                  </div>
                )}
              </div>

              {/* approved stamp */}
              <AnimatePresence>
                {resolution?.stamped && (
                  <div key="stamp" className="stamp-slam pointer-events-none absolute end-6 top-16">
                    <div className="stamp-face px-4 py-2 text-center">
                      <div className="text-[17px] font-black tracking-[0.22em]">
                        {resolution.action === 'escalate' ? 'ESCALATED' : resolution.action === 'info' ? 'NOTICE SENT' : 'APPROVED'}
                      </div>
                      <div className="text-[8.5px] font-bold tracking-[0.3em]">AL ZAFRA EDA</div>
                      <div className="mt-0.5 font-mono text-[8px]">{caseRec.ref} · {fmtTime(resolution.at)}</div>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {resolution ? (
              <div className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-[11px] text-ink-2">
                <SealCheck size={14} weight="fill" className={resolution.action === 'reject' ? 'text-fail' : 'text-accent'} />
                <span>
                  {t(lang, 'stampedBy')} <span className="font-bold">Officer R. Al Qasimi</span>
                  {resolution.edited && <span className="ms-1 rounded bg-warn-soft px-1 py-px text-[9px] font-bold text-warn">{t(lang, 'edited')}</span>}
                </span>
                <span className="ms-auto font-mono text-[9.5px] text-mute">{fmtTime(resolution.at)}</span>
              </div>
            ) : (
              <>
                {rejecting ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t(lang, 'rejectReason')}
                      rows={2}
                      className="w-full resize-none rounded-md border border-edge-2 bg-raised p-2 text-[11.5px] focus:border-fail focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submit('reject')}
                        className="flex-1 rounded-md bg-fail px-3 py-2 text-[11.5px] font-bold text-white transition-transform active:scale-[0.98]"
                      >
                        {t(lang, 'reject')}
                      </button>
                      <button
                        onClick={() => setRejecting(false)}
                        className="rounded-md border border-edge-2 px-3 py-2 text-[11.5px] font-semibold text-mute"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => submit(primary.action)}
                      className={cx(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-[11.5px] font-bold transition-transform hover:scale-[1.01] active:scale-[0.98]',
                        primary.tone,
                      )}
                    >
                      <Stamp size={14} weight="fill" />
                      {t(lang, primary.label)}
                    </button>
                    {tab !== 'note' && (
                      <button
                        onClick={() => { setEditing(true); setEditText(emailBody) }}
                        className="flex items-center gap-1 rounded-md border border-edge-2 bg-raised px-3 py-2 text-[11.5px] font-semibold text-ink-2 transition-colors hover:border-edge"
                        title={t(lang, 'edit')}
                      >
                        <PencilSimple size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setRejecting(true)}
                      className="flex items-center gap-1 rounded-md border border-edge-2 bg-raised px-3 py-2 text-[11.5px] font-semibold text-fail transition-colors hover:border-fail/40"
                      title={t(lang, 'reject')}
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                )}
                {editing && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-warn">
                    <PencilSimple size={11} />
                    {lang === 'ar' ? 'سيُسجل التعديل في سلسلة التدقيق' : 'edits are recorded in the audit chain'}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
