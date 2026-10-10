import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAgent } from './agent.js'
import { getChain, verifyChain, appendAudit } from './audit.js'
import { llmAvailable, llmModel } from './llm.js'

function resolveSeedDir() {
  const local = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed')
  return existsSync(local) ? local : path.join(process.cwd(), 'seed')
}
const seedDir = resolveSeedDir()
const seed = JSON.parse(readFileSync(path.join(seedDir, 'cases.json'), 'utf8'))
const OFFICER = 'Officer R. Al Qasimi'

function json(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { resolve({}) }
    })
  })
}

export function agentApiMiddleware(req, res, next) {
  let url = new URL(req.url, 'http://local')
  // Serverless single-function entry: /handler?r=<route>&<params>
  if ((url.pathname === '/handler' || url.pathname === '/api/handler') && url.searchParams.get('r')) {
    const r = url.searchParams.get('r').replace(/^\/+/, '')
    url.searchParams.delete('r')
    const rest = url.searchParams.toString()
    url = new URL('/' + r + (rest ? '?' + rest : ''), 'http://local')
  }
  const p = url.pathname

  if (req.method === 'GET' && p === '/health') {
    return json(res, { ok: true, llm: llmAvailable() ? 'live' : 'fallback', model: llmModel() })
  }

  if (req.method === 'GET' && p === '/cases') {
    const cases = seed.cases.map((c) => ({
      ...c,
      authority_en: seed.authority_en,
      authority_ar: seed.authority_ar,
      docText: readFileSync(path.join(seedDir, 'docs', c.doc), 'utf8'),
    }))
    return json(res, { cases })
  }

  if (req.method === 'GET' && p === '/agent/run') {
    const caseRec = seed.cases.find((c) => c.id === url.searchParams.get('caseId'))
    if (!caseRec) return json(res, { error: 'unknown case' }, 404)
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
    runAgent(caseRec, send)
      .catch((err) => send({ event: 'error', message: String(err) }))
      .finally(() => res.end())
    return
  }

  if (req.method === 'GET' && p === '/audit') {
    return json(res, { entries: getChain() })
  }

  if (req.method === 'GET' && p === '/audit/verify') {
    return json(res, verifyChain())
  }

  if (req.method === 'POST' && p === '/audit/action') {
    return readBody(req).then((body) => {
      const { caseRef, action, outcome, edited } = body
      const entries = []
      entries.push(
        appendAudit({
          caseRef,
          actor: 'officer.alqasimi',
          action: `officer_${action}`,
          scope: 'HUMAN',
          approver: OFFICER,
          output: { decision: action, edited: Boolean(edited) },
        }),
      )
      const followups = {
        approve: [
          { actor: 'comms_gateway', action: 'response_dispatched', scope: 'WRITE', detail: 'Applicant reply email released to outbound queue' },
          { actor: 'case_record', action: 'status_final', scope: 'WRITE', detail: `Case closed - ${outcome ?? 'approved'}` },
        ],
        escalate: [
          { actor: 'case_router', action: 'routed_senior_queue', scope: 'WRITE', detail: 'Case assigned to senior officer queue' },
        ],
        info: [
          { actor: 'comms_gateway', action: 'deficiency_notice_sent', scope: 'WRITE', detail: 'Missing-document notice released to outbound queue' },
          { actor: 'case_record', action: 'status_pending_applicant', scope: 'WRITE', detail: 'Awaiting applicant documents - 30 day window' },
        ],
        reject: [
          { actor: 'case_record', action: 'returned_to_queue', scope: 'WRITE', detail: 'Officer rejected agent draft - manual handling' },
        ],
      }
      for (const f of followups[action] ?? []) {
        entries.push(appendAudit({ caseRef, actor: f.actor, action: f.action, scope: f.scope, detail: f.detail, approver: OFFICER }))
      }
      json(res, { entries, chain: getChain() })
    })
  }

  next()
}
