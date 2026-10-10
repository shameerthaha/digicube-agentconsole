import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { policyEngine, registryApi, paymentsApi, fileToCaseRecord } from './tools.js'
import { appendAudit } from './audit.js'
import { llmAvailable, callClaudeJSON, CLASSIFY_SYSTEM, DRAFT_SYSTEM } from './llm.js'

function resolveSeedDir() {
  const local = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed')
  return existsSync(local) ? local : path.join(process.cwd(), 'seed')
}
const seedDir = resolveSeedDir()
const CANNED = JSON.parse(readFileSync(path.join(seedDir, 'canned.json'), 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STEP_DEFS = [
  { id: 'ingest', tool: 'document_parser', scope: 'READ-ONLY', title_en: 'Read & classify document', title_ar: 'قراءة المستند وتصنيفه' },
  { id: 'extract', tool: 'field_extractor', scope: 'LLM-READ', title_en: 'Extract key fields', title_ar: 'استخراج الحقول الرئيسية' },
  { id: 'rules', tool: 'policy_engine', scope: 'RULES', title_en: 'Check against rules', title_ar: 'التحقق من القواعد' },
  { id: 'records', tool: 'registry_api + payments_api', scope: 'READ-ONLY', title_en: 'Look up records', title_ar: 'البحث في السجلات' },
  { id: 'decide', tool: 'agent_reasoner', scope: 'LLM-REASON', title_en: 'Decide', title_ar: 'اتخاذ القرار' },
  { id: 'draft', tool: 'composer', scope: 'DRAFT-ONLY', title_en: 'Draft output', title_ar: 'صياغة المخرجات' },
  { id: 'route', tool: 'case_router', scope: 'WRITE', title_en: 'Route to officer queue', title_ar: 'التحويل إلى قائمة الضابط' },
]

export async function runAgent(caseRec, send) {
  const runId = 'run-' + Math.random().toString(36).slice(2, 9)
  const t0 = Date.now()
  const canned = CANNED[caseRec.id]
  const docText = readFileSync(path.join(seedDir, 'docs', caseRec.doc), 'utf8')
  let usedFallback = false

  send({ event: 'meta', runId, llm: llmAvailable() ? 'live' : 'fallback' })

  const emitStep = async (def, minMs, workFn, auditInput) => {
    const idx = STEP_DEFS.indexOf(def)
    send({ event: 'step', step: { ...def, index: idx, status: 'running', startedAt: Date.now() } })
    const t = Date.now()
    const output = await workFn()
    const elapsed = Date.now() - t
    if (elapsed < minMs) await sleep(minMs - elapsed)
    const durationMs = Date.now() - t
    const entry = appendAudit({
      caseRef: caseRec.ref,
      actor: def.tool,
      action: def.id,
      scope: def.scope,
      input: auditInput ?? null,
      output,
    })
    send({ event: 'audit', entry })
    send({
      event: 'step',
      step: { ...def, index: idx, status: 'done', durationMs, output, inHash: entry.inHash, outHash: entry.outHash },
    })
    return output
  }

  // 1 - ingest + classify (LLM or canned)
  const classify = await emitStep(STEP_DEFS[0], 700, async () => {
    const live = await callClaudeJSON({
      system: CLASSIFY_SYSTEM,
      user: `Case ref: ${caseRec.ref}\nSender: ${caseRec.sender}\nSubject: ${caseRec.subject_en}\n\nDOCUMENT:\n${docText}`,
      maxTokens: 2000,
    })
    const out = live ?? (usedFallback = true, canned.classify)
    return { case_type: out.case_type, label_en: out.label_en, label_ar: out.label_ar, confidence: out.confidence, language: out.language, summary_en: out.summary_en, llm: live ? 'claude' : 'canned' }
  }, { doc: caseRec.doc, sender: caseRec.sender })

  // 2 - extract fields (reuse classify fields; LLM single call already got them)
  const extraction = await emitStep(STEP_DEFS[1], 600, async () => {
    let fields = null
    if (!usedFallback && llmAvailable()) {
      const live = await callClaudeJSON({
        system: CLASSIFY_SYSTEM,
        user: `Extract fields only. DOCUMENT:\n${docText}`,
        maxTokens: 2000,
      })
      fields = live?.fields ?? null
    }
    if (!fields) { usedFallback = true; fields = canned.classify.fields }
    return { fields }
  }, { doc: caseRec.doc })

  // 3 - policy engine
  const policy = await emitStep(STEP_DEFS[2], 800, async () => {
    await sleep(250)
    return policyEngine(caseRec.id)
  }, { case_type: classify.case_type, fields: extraction.fields?.length })

  // 4 - registry + payments lookups
  const records = await emitStep(STEP_DEFS[3], 800, async () => {
    const registry = registryApi(caseRec.id)
    const payments = paymentsApi(caseRec.id)
    if (registry.parallel_filings?.length) {
      send({
        event: 'signal',
        signal: {
          kind: 'cross_case',
          label_en: `Parallel filing detected on licence ${registry.licence_no}`,
          label_ar: `تم رصد معاملة موازية على الرخصة ${registry.licence_no}`,
          detail_en: `${registry.parallel_filings[0].type.replaceAll('_', ' ')} is already in progress under ${registry.parallel_filings[0].ref}.`,
          detail_ar: `${registry.parallel_filings[0].type.replaceAll('_', ' ')} قيد المعالجة بالفعل ضمن الملف ${registry.parallel_filings[0].ref}.`,
          relatedRef: registry.parallel_filings[0].ref,
        },
      })
    }
    return { registry, payments }
  }, { case: caseRec.ref, systems: ['registry', 'payments'] })

  // 5 - decide
  const decision = await emitStep(STEP_DEFS[4], 900, async () => {
    const rules = policy.rules
    const d = (() => {
      if (classify.confidence < 0.8)
        return { action: 'escalate', reason_en: `Classification confidence ${(classify.confidence * 100).toFixed(0)}% is below the 80% threshold.`, reason_ar: `ثقة التصنيف ${(classify.confidence * 100).toFixed(0)}% دون الحد الأدنى 80%.` }
      const amb = rules.find((r) => r.result === 'fail' && r.ambiguous)
      if (amb)
        return { action: 'escalate', rule: amb.id, reason_en: `Rule "${amb.label_en}" failed on a discretionary point: ${amb.detail_en}`, reason_ar: `القاعدة "${amb.label_ar}" فشلت في نقطة تقديرية: ${amb.detail_ar}` }
      const hard = rules.find((r) => r.result === 'fail')
      if (hard)
        return { action: 'request_info', rule: hard.id, missing_en: hard.missing_en ?? [], missing_ar: hard.missing_ar ?? [], reason_en: `Rule "${hard.label_en}" failed: ${hard.detail_en}`, reason_ar: `القاعدة "${hard.label_ar}" فشلت: ${hard.detail_ar}` }
      const warns = rules.filter((r) => r.result === 'warn').map((r) => ({ label_en: r.label_en, label_ar: r.label_ar, detail_en: r.detail_en, detail_ar: r.detail_ar }))
      return { action: 'approve_ready', warnings: warns, reason_en: 'All mandatory checks passed. Ready for officer sign-off.', reason_ar: 'جميع الفحوصات الإلزامية ناجحة. جاهز لتوقيع الضابط.' }
    })()
    return d
  }, { confidence: classify.confidence, rules: policy.rules.map((r) => [r.id, r.result]) })

  // 6 - draft (LLM or canned)
  const draft = await emitStep(STEP_DEFS[5], 1000, async () => {
    const live = await callClaudeJSON({
      system: DRAFT_SYSTEM,
      user: `Case ${caseRec.ref} (${caseRec.subject_en}). Decision: ${JSON.stringify(decision)}. Fields: ${JSON.stringify(extraction.fields?.map((f) => [f.key, f.value]))}. Rules: ${JSON.stringify(policy.rules.map((r) => [r.id, r.result]))}.`,
      maxTokens: 2400,
    })
    const out = live ?? (usedFallback = true, canned.draft)
    return { ...out, llm: live ? 'claude' : 'canned' }
  }, { decision: decision.action, case: caseRec.ref })

  // 7 - route
  const routing = await emitStep(STEP_DEFS[6], 500, async () => fileToCaseRecord(caseRec, decision), { decision: decision.action })

  const elapsedMs = Date.now() - t0
  send({
    event: 'done',
    runId,
    elapsedMs,
    llm: usedFallback ? 'fallback' : 'live',
    outcome: { action: decision.action, awaiting: 'officer' },
  })
}
