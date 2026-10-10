import { createHash } from 'node:crypto'

export const sha = (s) => createHash('sha256').update(String(s)).digest('hex')
export const shortHash = (s) => sha(s).slice(0, 12)
