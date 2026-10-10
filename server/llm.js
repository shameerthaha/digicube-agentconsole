import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'
// AGENT_LLM_MODE: 'live' (call Claude, default) | 'replay' (serve captured
// outputs only - zero API spend, for public deployments)
const MODE = process.env.AGENT_LLM_MODE || 'live'
// Hard cap on live calls per warm instance - bounds spend even if the
// deployment URL leaks. Set AGENT_LLM_BUDGET=0 to disable live calls.
const BUDGET = process.env.AGENT_LLM_BUDGET != null ? Number(process.env.AGENT_LLM_BUDGET) : 60
let spent = 0

const cachePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed', 'live-cache.json')
let cache = null
function liveCache() {
  if (cache == null) {
    try {
      cache = JSON.parse(readFileSync(cachePath, 'utf8'))
    } catch {
      cache = {}
    }
  }
  return cache
}

export function llmAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}
export function llmModel() {
  return MODEL
}
// 'live' | 'replay' | 'fallback' - drives the top-bar badge
export function llmMode() {
  if (MODE === 'replay') return 'replay'
  return llmAvailable() ? 'live' : 'fallback'
}
export function llmSpend() {
  return { spent, budget: BUDGET }
}

// Returns parsed JSON object, or null (replay miss, no key, over budget,
// network error, bad JSON). Callers fall back to canned outputs on null.
export async function callClaudeJSON({ cacheKey, system, user, maxTokens = 2048 }) {
  if (MODE === 'replay') return liveCache()[cacheKey] ?? null
  if (!llmAvailable() || spent >= BUDGET) return null
  spent += 1
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.content ?? []).map((c) => c.text ?? '').join('')
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export const CLASSIFY_SYSTEM = `You are a document intake agent for a government licensing authority.
Read the inward correspondence and respond with ONE JSON object only, no prose:
{
  "case_type": "snake_case",
  "label_en": "short English label",
  "label_ar": "short Arabic label",
  "confidence": 0.0-1.0,
  "language": "en|ar|mixed",
  "summary_en": "one sentence",
  "fields": [
    {
      "key": "snake_case",
      "label_en": "field name",
      "label_ar": "اسم الحقل",
      "value": "extracted value",
      "confidence": 0.0-1.0,
      "evidence": "a VERBATIM substring copied from the document that supports this value",
      "pii": true
    }
  ]
}
Rules: evidence must be an exact substring of the document, never invented.
Mark pii=true for Emirates ID numbers and phone numbers. Extract 6-10 fields:
licence/reference numbers, legal names, activities, dates, fees, people, IDs.`

export const DRAFT_SYSTEM = `You draft decisions for a government licensing officer.
Respond with ONE JSON object only:
{
  "decision_note_en": "officer-facing note, 2-3 sentences, plain English",
  "decision_note_ar": "same note in formal Arabic",
  "email_subject": "short subject line",
  "email_en": "reply email to the applicant in English",
  "email_ar": "same email in formal Arabic"
}
Rules: formal government register, no promises beyond the decision given,
reference the case ref, sign as the directorate. Never send - an officer approves.`
