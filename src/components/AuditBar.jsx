import { useState } from 'react'
import { CaretUp, CaretDown, Link as LinkIcon, ShieldCheck, DownloadSimple, XCircle } from '@phosphor-icons/react'
import { t } from '../i18n.js'
import { cx, fmtTime, SCOPE_STYLE } from '../lib.js'

export default function AuditBar({ lang, audit }) {
  const [open, setOpen] = useState(false)
  const [verify, setVerify] = useState(null)

  const last = audit[audit.length - 1]

  const doVerify = async () => {
    const r = await fetch('/api/audit/verify').then((x) => x.json()).catch(() => ({ valid: false }))
    setVerify(r)
    setTimeout(() => setVerify(null), 5000)
  }

  const doExport = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), chain: audit }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `digicube-audit-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <footer className="shrink-0 border-t border-edge bg-panel">
      <div className="flex h-9 items-center gap-3 px-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2"
        >
          <LinkIcon size={13} className="text-accent" />
          {t(lang, 'audit')}
          {open ? <CaretDown size={11} /> : <CaretUp size={11} />}
        </button>
        <span className="font-mono text-[10px] text-mute">
          {audit.length} · {last ? `last ${last.hash}` : 'empty'}
        </span>
        {verify && (
          <span className={cx('flex items-center gap-1 text-[10.5px] font-bold', verify.valid ? 'text-accent-ink' : 'text-fail')}>
            {verify.valid ? <ShieldCheck size={13} weight="fill" /> : <XCircle size={13} weight="fill" />}
            {verify.valid ? `${t(lang, 'chainValid')} (${verify.count})` : `${t(lang, 'chainBroken')} #${verify.brokenAt}`}
          </span>
        )}
        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={doVerify}
            className="flex items-center gap-1 rounded-md border border-edge-2 bg-raised px-2 py-1 text-[10px] font-semibold text-ink-2 hover:border-accent/50"
          >
            <ShieldCheck size={11} /> {t(lang, 'verify')}
          </button>
          <button
            onClick={doExport}
            className="flex items-center gap-1 rounded-md border border-edge-2 bg-raised px-2 py-1 text-[10px] font-semibold text-ink-2 hover:border-accent/50"
          >
            <DownloadSimple size={11} /> {t(lang, 'export')}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-44 overflow-auto border-t border-edge">
          <table className="w-full font-mono text-[10px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-start text-mute">
                {[t(lang, 'seq'), t(lang, 'time'), 'case', t(lang, 'actor'), t(lang, 'action'), t(lang, 'scope'), t(lang, 'inHash'), t(lang, 'outHash'), t(lang, 'prevHash'), t(lang, 'hash'), t(lang, 'approver')].map((h) => (
                  <th key={h} className="border-b border-edge px-2.5 py-1.5 text-start font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.seq} className="border-b border-edge/60 hover:bg-raised">
                  <td className="px-2.5 py-1 text-mute">{e.seq}</td>
                  <td className="px-2.5 py-1 text-mute">{fmtTime(e.ts)}</td>
                  <td className="px-2.5 py-1 text-info">{e.caseRef}</td>
                  <td className="px-2.5 py-1 font-semibold text-ink">{e.actor}</td>
                  <td className="px-2.5 py-1 text-ink-2">{e.action}</td>
                  <td className="px-2.5 py-1">
                    {e.scope && <span className={cx('rounded px-1 py-px text-[8.5px] font-bold', SCOPE_STYLE[e.scope])}>{e.scope}</span>}
                  </td>
                  <td className="px-2.5 py-1 text-mute">{e.inHash ?? '·'}</td>
                  <td className="px-2.5 py-1 text-ink-2">{e.outHash ?? '·'}</td>
                  <td className="px-2.5 py-1 text-mute">{e.prevHash}</td>
                  <td className="px-2.5 py-1 font-bold text-accent-ink">{e.hash}</td>
                  <td className="px-2.5 py-1 text-mute">{e.approver ?? '·'}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-4 text-center text-mute">
                    {lang === 'ar' ? 'لا قيود بعد - شغّل الوكيل على معاملة' : 'No entries yet - run the agent on a case'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </footer>
  )
}
