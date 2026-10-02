export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  var body = req.body
  var useSearch = body.search === true
  var plainText = body.plain === true
  var maxTok = Math.min(8000, Math.max(100, Number(body.max_tokens) || 1200))
  var raw = ''

  // Provider routing: web-search requests go to Gemini (Google Search grounding),
  // everything else goes to the main provider (AI_PROVIDER, default: openai).
  var provider
  var apiKey

  if (useSearch) {
    provider = 'gemini'
    apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || ''
  } else {
    provider = (process.env.AI_PROVIDER || 'openai').toLowerCase()
    apiKey = process.env.AI_API_KEY || ''
  }

  if (!apiKey) {
    return res.status(500).json({ error: provider === 'gemini' ? 'GEMINI_API_KEY not set (needed for web search)' : 'AI_API_KEY not set' })
  }

  try {
    var userMsg = body.messages.map(function(m) { return m.content }).join('\n')
    var text = ''
    var sources = []

    if (provider === 'anthropic') {
      // ---- Anthropic (Claude) ----
      var r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'claude-sonnet-4-6',
          max_tokens: maxTok,
          system: body.system,
          messages: body.messages,
        }),
      })
      raw = await r.text()
      if (!r.ok) {
        var msg = 'Claude ' + r.status
        try {
          var errData = JSON.parse(raw)
          var apiMsg = errData.error && errData.error.message ? errData.error.message : ''
          if (r.status === 429) {
            msg = 'Quota API Claude atteint (429). Reessaie dans quelques minutes. ' + apiMsg
          } else {
            msg = 'Claude ' + r.status + ': ' + apiMsg
          }
        } catch (e) {
          msg = 'Claude ' + r.status + ': ' + raw.substring(0, 300)
        }
        return res.status(r.status).json({ error: msg })
      }
      var data = JSON.parse(raw)
      text = (data.content || []).map(function(b) { return b.text || '' }).join('\n')

    } else if (provider === 'openai') {
      // ---- OpenAI (default: GPT-5 nano) ----
      var oaiPayload = {
        model: process.env.AI_MODEL || 'gpt-5-nano',
        max_completion_tokens: maxTok,
        messages: [{ role: 'system', content: body.system }, ...body.messages],
      }
      if (!plainText) {
        oaiPayload.response_format = { type: 'json_object' }
      }

      var r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(oaiPayload),
      })
      raw = await r.text()
      if (!r.ok) {
        var msg = 'OpenAI ' + r.status
        try {
          var errData = JSON.parse(raw)
          var apiMsg = errData.error && errData.error.message ? errData.error.message : ''
          if (r.status === 429) {
            msg = 'Quota OpenAI atteint (429). Reessaie dans quelques minutes. ' + apiMsg
          } else {
            msg = 'OpenAI ' + r.status + ': ' + apiMsg
          }
        } catch (e) {
          msg = 'OpenAI ' + r.status + ': ' + raw.substring(0, 300)
        }
        return res.status(r.status).json({ error: msg })
      }
      var data = JSON.parse(raw)
      text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    } else {
      // ---- Gemini (used for web search grounding, or when AI_PROVIDER=gemini) ----
      var parts = [{ text: body.system + '\n\n' + userMsg }]
      if (body.image && body.image.data) {
        parts.push({ inline_data: { mime_type: body.image.mimeType || 'image/jpeg', data: body.image.data } })
      }

      var payload = {
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { maxOutputTokens: maxTok }
      }

      if (useSearch) {
        payload.tools = [{ google_search: {} }]
      } else if (!plainText) {
        payload.generationConfig.responseMimeType = 'application/json'
      }

      var geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
      var r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + geminiModel + ':generateContent?key=' + apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      raw = await r.text()
      if (!r.ok) {
        var msg = 'Gemini ' + r.status
        try {
          var errData = JSON.parse(raw)
          var apiMsg = errData.error && errData.error.message ? errData.error.message : ''
          if (r.status === 429) {
            var isSearchQuota = useSearch
            msg = isSearchQuota
              ? 'SEARCH_QUOTA: Le quota de recherche web Google est atteint (limite quotidienne distincte du quota de generation). ' + apiMsg
              : 'Quota API depasse (429). Reessaie dans quelques minutes. ' + apiMsg
          } else if (r.status === 400) {
            msg = 'Requete invalide (400). ' + apiMsg
          } else if (r.status === 403) {
            msg = 'Cle API refusee (403). Verifie GEMINI_API_KEY. ' + apiMsg
          } else {
            msg = 'Gemini ' + r.status + ': ' + apiMsg
          }
        } catch (e) {
          msg = 'Gemini ' + r.status + ': ' + raw.substring(0, 300)
        }
        return res.status(r.status).json({ error: msg })
      }
      var data = JSON.parse(raw)
      var cand = data.candidates && data.candidates[0]
      if (!cand) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          return res.status(500).json({ error: 'Requete bloquee par Gemini: ' + data.promptFeedback.blockReason })
        }
        return res.status(500).json({ error: 'Pas de reponse de Gemini: ' + raw.substring(0, 300) })
      }
      if (cand.finishReason === 'MAX_TOKENS') {
        console.warn('Response truncated at max tokens')
      }

      var textParts = (cand.content && cand.content.parts) || []
      text = textParts.map(function(p) { return p.text || '' }).join('')

      var seenSources = {}
      var gm = cand.groundingMetadata
      if (gm && gm.groundingChunks) {
        for (var i = 0; i < gm.groundingChunks.length; i++) {
          var chunk = gm.groundingChunks[i]
          if (chunk.web && chunk.web.uri && !seenSources[chunk.web.uri]) {
            sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri })
            seenSources[chunk.web.uri] = true
          }
        }
      }
    }

    if (!text) throw new Error('Empty AI response. Raw: ' + (typeof raw === 'string' ? raw.substring(0, 200) : 'none'))

    return res.status(200).json({
      content: [{ type: 'text', text: text }],
      sources: sources
    })
  } catch (err) {
    return res.status(500).json({ error: err.message + ' | Raw: ' + (typeof raw === 'string' ? raw.substring(0, 200) : 'none') })
  }
}
