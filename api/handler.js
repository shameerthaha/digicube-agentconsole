// Vercel serverless entry: a single function serves every API route via
// ?r=<path> so the in-memory audit hash chain stays on one warm instance.
import { agentApiMiddleware } from '../server/api.js'

export const maxDuration = 60

export default function handler(req, res) {
  agentApiMiddleware(req, res, () => {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  })
}
