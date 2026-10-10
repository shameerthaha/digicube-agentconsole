import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { agentApiMiddleware } from './server/api.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'digicube-agent-api',
      configureServer(server) {
        server.middlewares.use('/api', agentApiMiddleware)
      },
    },
  ],
})
