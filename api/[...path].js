// Vercel serverless entry: one catch-all function handles every /api/* route.
// A single function means the in-memory audit hash chain stays on one warm
// instance for the duration of a demo session.
import { agentApiMiddleware } from '../server/api.js'

export const maxDuration = 60

export default function handler(req, res) {
  // Strip the /api mount prefix so the shared router sees /agent/run etc.
  req.url = req.url.replace(/^\/api/, '') || '/'
  agentApiMiddleware(req, res, () => {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  })
}
