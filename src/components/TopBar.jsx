import { Cube, Sun, Moon, Lightning, Timer, CheckCircle, WarningOctagon } from '@phosphor-icons/react'
import { t } from '../i18n.js'
import { cx, fmtClock } from '../lib.js'

function Kpi({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="flex items-center gap-2 border-s border-edge ps-3 first:border-0 first:ps-0">
      <Icon size={15} weight="duotone" className={cx('shrink-0', tone ?? 'text-mute')} />
      <div className="leading-tight">
        <div className="font-mono text-[13px] font-semibold text-ink tabular-nums">{value}</div>
        <div className="text-[10px] text-mute">{label}{sub ? <span className="text-edge-2"> · {sub}</span> : null}</div>
      </div>
    </div>
  )
}

export default function TopBar({ lang, setLang, dark, setDark, kpis, llm }) {
  const live = llm === 'live'
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-edge bg-panel px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-panel">
          <Cube size={18} weight="duotone" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13.5px] font-bold tracking-tight">{t(lang, 'appName')}</div>
          <div className="truncate text-[10.5px] text-mute">{t(lang, 'appSub')}</div>
        </div>
      </div>

      <div className="mx-auto flex items-center gap-4">
        <Kpi icon={CheckCircle} label={t(lang, 'processed')} value={String(kpis.processed)} tone="text-accent" />
        <Kpi
          icon={Lightning}
          label={t(lang, 'straightThrough')}
          value={kpis.straight == null ? '·' : `${kpis.straight}%`}
          tone="text-accent"
        />
        <Kpi
          icon={Timer}
          label={t(lang, 'avgAgent')}
          value={kpis.avgMs ? fmtClock(kpis.avgMs) : '·'}
          sub={`${t(lang, 'baseline')} 25:00`}
          tone="text-info"
        />
        <Kpi icon={WarningOctagon} label={t(lang, 'escalations')} value={String(kpis.escalations)} tone="text-fail" />
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
            live ? 'border-accent/40 bg-accent-soft text-accent-ink' : 'border-warn/40 bg-warn-soft text-warn',
          )}
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'bg-accent' : 'bg-warn', live && 'animate-pulse')} />
          {live ? t(lang, 'llmLive') : t(lang, 'llmFallback')}
        </span>

        <div className="flex overflow-hidden rounded-md border border-edge-2 text-[11px] font-semibold">
          {['en', 'ar'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cx(
                'px-2.5 py-1 transition-colors',
                lang === l ? 'bg-ink text-panel' : 'bg-raised text-mute hover:text-ink',
              )}
            >
              {l === 'en' ? 'EN' : 'عربي'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setDark(!dark)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-edge-2 bg-raised text-mute transition-colors hover:text-ink"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  )
}
