// Records real Claude outputs for all seed cases into seed/live-cache.json.
// Run once with a key, then deploy with AGENT_LLM_MODE=replay so the public
// demo replays captured runs with zero API spend.
//
//   ANTHROPIC_API_KEY=... npm run capture
//   or: npm run capture  (reads .env automatically)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { policyEngine } from './tools.js'
import { callClaudeJSON, CLASSIFY_SYSTEM, DRAFT_SYSTEM } from './llm.js'
import { classifyUser, draftUser, computeDecision } from './agent.js'

const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed')
const seed = JSON.parse(readFileSync(path.join(seedDir, 'cases.json'), 'utf8'))
const cachePath = path.join(seedDir, 'live-cache.json')

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set - capture needs a live key')
  process.exit(1)
}

const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}

for (const c of seed.cases) {
  const docText = readFileSync(path.join(seedDir, 'docs', c.doc), 'utf8')
  process.stdout.write(`${c.id} (${c.ref}) `)

  const cls = await callClaudeJSON({
    system: CLASSIFY_SYSTEM,
    user: classifyUser(c, docText),
    maxTokens: 2000,
  })
  if (!cls) {
    console.log('- classify failed, skipping')
    continue
  }
  cache[`classify:${c.id}`] = cls

  const decision = computeDecision({ confidence: cls.confidence }, policyEngine(c.id).rules)
  const draft = await callClaudeJSON({
    system: DRAFT_SYSTEM,
    user: draftUser(c, decision, { fields: cls.fields }, { rules: policyEngine(c.id).rules }),
    maxTokens: 2400,
  })
  if (draft) cache[`draft:${c.id}`] = draft

  console.log(`- captured (type=${cls.case_type}, conf=${cls.confidence}, action=${decision.action})`)
}

writeFileSync(cachePath, JSON.stringify(cache, null, 2))
console.log(`\nWrote ${Object.keys(cache).length} entries to seed/live-cache.json`)
console.log('Deploy with AGENT_LLM_MODE=replay to serve these with zero API spend.')
