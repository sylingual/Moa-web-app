import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
          res.end(JSON.stringify({ error: 'AI_API_KEY missing in .env' }))
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        try {
          const { system, messages, max_tokens, search, plain } = JSON.parse(body)
          const userMsg = messages.map(m => m.content).join('\n')
          let text = ''
          let sources = []

          if (provider === 'gemini') {
            const useSearch = search === true
            const payload = {
              contents: [{ role: 'user', parts: [{ text: system + '\n\n' + userMsg }] }],
              generationConfig: { maxOutputTokens: max_tokens || 1200 },
            }
            if (useSearch) payload.tools = [{ google_search: {} }]
            else if (plain !== true) payload.generationConfig.responseMimeType = 'application/json'
            const r = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }
            )
            const raw = await r.text()
            if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + raw.substring(0, 300))
            const data = JSON.parse(raw)
            const candidate = data?.candidates?.[0]
            text = candidate?.content?.parts?.map(part => part.text || '').join('') || ''
            sources = (candidate?.groundingMetadata?.groundingChunks || [])
              .map(chunk => chunk.web)
              .filter(web => web?.uri)
              .filter((web, index, all) => all.findIndex(item => item.uri === web.uri) === index)
              .map(web => ({ title: web.title || web.uri, uri: web.uri }))
            if (!text) throw new Error('Empty Gemini response: ' + raw.substring(0, 300))
          } else if (provider === 'openai') {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
              body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: max_tokens || 1200, messages: [{ role: 'system', content: system }, ...messages] }),
            })
            if (!r.ok) throw new Error('OpenAI ' + r.status + ': ' + await r.text())
            const data = await r.json()
            text = data.choices?.[0]?.message?.content || ''
          } else if (provider === 'anthropic') {
            const r = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: max_tokens || 1200, system, messages }),
            })
            if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + await r.text())
            const data = await r.json()
            text = (data.content || []).map(b => b.text || '').join('\n')
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ content: [{ type: 'text', text }], sources }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

function devResourcesProxy() {
  let braveKey = ''
  return {
    name: 'dev-resources-proxy',
    configResolved() { braveKey = process.env.BRAVE_API_KEY || '' },
    configureServer(server) {
      server.middlewares.use('/api/resources', async (req, res) => {
        const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
        if (!braveKey) return send(200, { error: 'NO_BRAVE_KEY', results: [] })
        let body = ''
        for await (const chunk of req) body += chunk
        try {
          const { structure = '', targetLang = '' } = JSON.parse(body || '{}')
          if (!String(structure).trim()) return send(400, { error: 'No structure provided', results: [] })
          const params = new URLSearchParams({
            q: `${structure} ${targetLang} grammar meaning usage explanation`,
            count: '10', safesearch: 'moderate', text_decorations: 'false',
          })
          const r = await fetch('https://api.search.brave.com/res/v1/web/search?' + params.toString(), {
            headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': braveKey },
          })
          const raw = await r.text()
          if (!r.ok) return send(200, { error: 'Brave ' + r.status + ': ' + raw.substring(0, 200), results: [] })
          const data = JSON.parse(raw)
          const web = (data.web && data.web.results) || []
          const results = web.slice(0, 6).map(it => ({
            title: (it.title || it.url || '').replace(/<[^>]*>/g, ''),
            uri: it.url,
            snippet: (it.description || '').replace(/<[^>]*>/g, ''),
          })).filter(it => it.uri)
          return send(200, { results })
        } catch (e) {
          return send(200, { error: e.message, results: [] })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.AI_API_KEY = env.AI_API_KEY || ''
  process.env.AI_PROVIDER = env.AI_PROVIDER || 'gemini'
  process.env.BRAVE_API_KEY = env.BRAVE_API_KEY || ''
  return {
    plugins: [react(), devApiProxy(), devResourcesProxy()],
    server: { port: 3000, open: true },
  }
})
