const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

export function llmAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}
export function llmModel() {
  return MODEL
}

// Returns parsed JSON object, or null (missing key, network error, bad JSON).
// Callers fall back to canned outputs on null.
export async function callClaudeJSON({ system, user, maxTokens = 2048 }) {
  if (!llmAvailable()) return null
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
