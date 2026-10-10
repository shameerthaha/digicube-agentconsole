import { shortHash } from './hash.js'

const chain = []
let seq = 0

export function appendAudit({ caseRef, actor, action, scope, detail, input, output, approver }) {
  const prevHash = chain.length ? chain[chain.length - 1].hash : 'GENESIS'
  const inHash = input != null ? shortHash(JSON.stringify(input)) : null
  const outHash = output != null ? shortHash(JSON.stringify(output)) : null
  seq += 1
  const entry = {
    seq,
    ts: new Date().toISOString(),
    caseRef: caseRef ?? null,
    actor,
    action,
    scope: scope ?? null,
    detail: detail ?? null,
    inHash,
    outHash,
    approver: approver ?? null,
    prevHash,
  }
  entry.hash = shortHash(
    [entry.seq, entry.ts, entry.caseRef, entry.actor, entry.action, entry.inHash, entry.outHash, entry.prevHash].join('|'),
  )
  chain.push(entry)
  return entry
}

export function verifyChain() {
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i]
    const expectedPrev = i === 0 ? 'GENESIS' : chain[i - 1].hash
    if (e.prevHash !== expectedPrev) return { valid: false, brokenAt: e.seq }
    const recomputed = shortHash(
      [e.seq, e.ts, e.caseRef, e.actor, e.action, e.inHash, e.outHash, e.prevHash].join('|'),
    )
    if (recomputed !== e.hash) return { valid: false, brokenAt: e.seq }
  }
  return { valid: true, count: chain.length }
}

export const getChain = () => chain
