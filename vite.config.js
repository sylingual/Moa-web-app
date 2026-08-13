import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ---- Multi-provider AI proxy (dev only) ----
const PROVIDERS = {
  async gemini(apiKey, system, messages, maxTokens) {
    const userMsg = messages.map(m => m.content).join('\n')
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { maxOutputTokens: maxTokens || 1200 },
        }),
      })
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`)
    const d = await r.json()
    return d.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''
  },
  async openai(apiKey, system, messages, maxTokens) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens || 1200, messages: [{ role: 'system', content: system }, ...messages] }),
    })
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`)
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  },
  async anthropic(apiKey, system, messages, maxTokens) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens || 1200, system, messages }),
    })
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`)
    const d = await r.json()
    return (d.content || []).map(b => b.text || '').join('\n')
  },
}

function devApiProxy() {
  let apiKey = '', provider = 'gemini'
  return {
    name: 'dev-api-proxy',
    configResolved() {
      apiKey = process.env.AI_API_KEY || ''
      provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
    },
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
        if (!apiKey) {
          res.writeHead(500)
          res.end(JSON.stringify({ error: 'Clé API manquante. Crée un fichier .env avec AI_API_KEY=...' }))
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        try {
          const { system, messages, max_tokens } = JSON.parse(body)
          const fn = PROVIDERS[provider]
          if (!fn) throw new Error(`Provider inconnu: ${provider}. Utilise: gemini, openai, anthropic`)
          const text = await fn(apiKey, system, messages, max_tokens)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ content: [{ type: 'text', text }] }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.AI_API_KEY = env.AI_API_KEY || ''
  process.env.AI_PROVIDER = env.AI_PROVIDER || 'gemini'
  return {
    plugins: [react(), devApiProxy()],
    server: { port: 3000, open: true },
  }
})
