import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import Inbox from './components/Inbox.jsx'
import AgentColumn from './components/AgentColumn.jsx'
import Checkpoint from './components/Checkpoint.jsx'
import AuditBar from './components/AuditBar.jsx'
import { t } from './i18n.js'

const FINAL_STATUS = { approve: 'dispatched', escalate: 'escalated', info: 'infoRequested', reject: 'rejected' }

export default function App() {
  const [lang, setLang] = useState('en')
  const [dark, setDark] = useState(false)
  const [cases, setCases] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [runs, setRuns] = useState({}) // caseId -> run state
  const [audit, setAudit] = useState([])
  const [resolutions, setResolutions] = useState({}) // caseId -> {action, edited, stamped, at}
  const [health, setHealth] = useState({ llm: 'fallback' })
  const esRef = useRef(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetch('/api/cases').then((r) => r.json()).then((d) => {
      setCases(d.cases.map((c) => ({ ...c, status: 'queued' })))
      setSelectedId(d.cases[0]?.id ?? null)
    })
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {})
    fetch('/api/audit').then((r) => r.json()).then((d) => setAudit(d.entries)).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const anyRunning = useMemo(() => Object.values(runs).some((r) => r.status === 'running'), [runs])
  useEffect(() => {
    if (!anyRunning) return
    const iv = setInterval(() => setTick((x) => x + 1), 200)
    return () => clearInterval(iv)
  }, [anyRunning])

  const updateCase = useCallback((id, patch) => {
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const runCase = useCallback(
    (id) => {
      setSelectedId(id)
      if (runs[id]) return
      updateCase(id, { status: 'running' })
      setRuns((r) => ({ ...r, [id]: { status: 'running', steps: {}, order: [], signals: [], startedAt: Date.now() } }))
      const es = new EventSource(`/api/agent/run?caseId=${id}`)
      esRef.current = es
      es.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.event === 'meta') {
          setRuns((r) => ({ ...r, [id]: { ...r[id], llm: msg.llm } }))
        } else if (msg.event === 'step') {
          const s = msg.step
          setRuns((r) => {
            const run = r[id] ?? { steps: {}, order: [], signals: [] }
            const order = run.order.includes(s.id) ? run.order : [...run.order, s.id]
            return { ...r, [id]: { ...run, steps: { ...run.steps, [s.id]: s }, order } }
          })
        } else if (msg.event === 'signal') {
          setRuns((r) => ({ ...r, [id]: { ...r[id], signals: [...(r[id]?.signals ?? []), msg.signal] } }))
        } else if (msg.event === 'audit') {
          setAudit((a) => [...a, msg.entry])
        } else if (msg.event === 'done') {
          es.close()
          setRuns((r) => ({ ...r, [id]: { ...r[id], status: 'done', elapsedMs: msg.elapsedMs, llm: msg.llm } }))
          updateCase(id, { status: 'awaiting' })
        } else if (msg.event === 'error') {
          es.close()
          setRuns((r) => ({ ...r, [id]: { ...r[id], status: 'error' } }))
          updateCase(id, { status: 'queued' })
        }
      }
      es.onerror = () => {
        es.close()
        setRuns((r) => (r[id]?.status === 'running' ? { ...r, [id]: { ...r[id], status: 'error' } } : r))
        updateCase(id, { status: 'queued' })
      }
    },
    [runs, updateCase],
  )

  const officerAction = useCallback(
    async (id, action, edited) => {
      const c = cases.find((x) => x.id === id)
      const run = runs[id]
      const decision = run?.steps?.decide?.output?.action
      const res = await fetch('/api/audit/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caseRef: c.ref, action, outcome: decision, edited: Boolean(edited) }),
      })
      const d = await res.json()
      setAudit(d.chain)
      setResolutions((r) => ({ ...r, [id]: { action, edited: Boolean(edited), stamped: action !== 'reject', at: Date.now() } }))
      updateCase(id, { status: FINAL_STATUS[action] ?? 'approved' })
    },
    [cases, runs, updateCase],
  )

  const kpis = useMemo(() => {
    const resolved = cases.filter((c) => ['dispatched', 'escalated', 'infoRequested', 'approved'].includes(c.status))
    const escal = cases.filter((c) => c.status === 'escalated').length
    const unedited = resolved.filter((c) => !resolutions[c.id]?.edited).length
    const times = Object.values(runs).filter((r) => r.elapsedMs).map((r) => r.elapsedMs)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    return { processed: resolved.length, straight: resolved.length ? Math.round((unedited / resolved.length) * 100) : null, avgMs: avg, escalations: escal }
  }, [cases, runs, resolutions])

  const selected = cases.find((c) => c.id === selectedId)
  const selectedRun = runs[selectedId]
  const selectedResolution = resolutions[selectedId]

  return (
    <div className="flex h-screen flex-col bg-paper text-ink">
      <TopBar lang={lang} setLang={setLang} dark={dark} setDark={setDark} kpis={kpis} llm={health.llm} />
      <div className="border-b border-edge bg-warn-soft px-4 py-1 text-center font-mono text-[10.5px] font-semibold tracking-[0.14em] text-warn">
        {t(lang, 'banner')}
      </div>
      <main className="grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)_24rem]">
        <Inbox lang={lang} cases={cases} selectedId={selectedId} onSelect={setSelectedId} onRun={runCase} />
        <AgentColumn lang={lang} caseRec={selected} run={selectedRun} tick={tick} />
        <Checkpoint
          lang={lang}
          caseRec={selected}
          run={selectedRun}
          resolution={selectedResolution}
          onAction={officerAction}
        />
      </main>
      <AuditBar lang={lang} audit={audit} />
    </div>
  )
}
