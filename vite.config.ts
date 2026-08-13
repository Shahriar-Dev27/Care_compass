import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import chat from './server/chat.js'

// Serves POST /api/chat in `npm run dev` so the OpenRouter key never reaches
// the browser. In production the same handler runs from api/chat.js.
const chatApi: Plugin = {
  name: 'carecompass-chat-api',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res, next) => {
      if (req.method !== 'POST') return next()
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      ;(req as typeof req & { body: string }).body = Buffer.concat(chunks).toString('utf8')
      await chat(req, res)
    })
  },
}

export default defineConfig(({ mode }) => {
  // Unprefixed vars stay server-side; only VITE_* reach the client bundle.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), chatApi],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
