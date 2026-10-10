import { useEffect, useMemo, useRef } from 'react'
import { FileText } from '@phosphor-icons/react'
import { t } from '../i18n.js'
import { cx } from '../lib.js'

// Splits docText into segments, marking each field's verbatim evidence span.
function segment(docText, fields) {
  const ranges = []
  for (const f of fields ?? []) {
    if (!f.evidence) continue
    let idx = docText.indexOf(f.evidence)
    if (idx === -1) {
      const lower = docText.toLowerCase()
      idx = lower.indexOf(f.evidence.toLowerCase())
    }
    if (idx !== -1) ranges.push({ start: idx, end: idx + f.evidence.length, key: f.key })
  }
  ranges.sort((a, b) => a.start - b.start)
  const segs = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start < cursor) continue
    if (r.start > cursor) segs.push({ text: docText.slice(cursor, r.start) })
    segs.push({ text: docText.slice(r.start, r.end), mark: r.key })
    cursor = r.end
  }
  if (cursor < docText.length) segs.push({ text: docText.slice(cursor) })
  return segs
}

export default function DocViewer({ lang, docText, fields, litKey, authority }) {
  const segs = useMemo(() => segment(docText, fields), [docText, fields])
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!litKey || !bodyRef.current) return
    bodyRef.current.querySelector(`mark[data-key="${litKey}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [litKey])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-edge bg-panel px-3.5 py-2">
        <FileText size={13} className="text-mute" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2">{t(lang, 'document')}</span>
        <span className="ms-auto font-mono text-[10px] text-mute">{authority}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" ref={bodyRef}>
        <div className="doc-paper relative mx-auto max-w-[560px] rounded-sm border border-edge px-7 py-6 shadow-[0_1px_2px_oklch(0.3_0.02_90/0.08),0_8px_24px_oklch(0.3_0.02_90/0.07)]">
          {segs.map((s, i) =>
            s.mark ? (
              <mark key={i} data-key={s.mark} className={cx('ev', litKey === s.mark && 'lit')}>
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
