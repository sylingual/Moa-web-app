export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var apiKey = process.env.AI_API_KEY || ''
  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not set' })
  }
  var provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  var raw = ''
  try {
    var body = req.body
    var userMsg = body.messages.map(function(m) { return m.content }).join('\n')
    var useSearch = body.search === true
    var plainText = body.plain === true
    var maxTok = Math.min(8000, Math.max(3000, Number(body.max_tokens) || 4000))

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
      // ---- OpenAI ----
      var r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          max_tokens: maxTok,
          messages: [{ role: 'system', content: body.system }, ...body.messages],
        }),
      })
      raw = await r.text()
      if (!r.ok) {
        var msg = 'OpenAI ' + r.status
        try {
          var errData = JSON.parse(raw)
          var apiMsg = errData.error && errData.error.message ? errData.error.message : ''
          msg = 'OpenAI ' + r.status + ': ' + apiMsg
        } catch (e) {
          msg = 'OpenAI ' + r.status + ': ' + raw.substring(0, 300)
        }
        return res.status(r.status).json({ error: msg })
      }
      var data = JSON.parse(raw)
      text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    } else {
      // ---- Gemini (default) ----
      var parts = [{ text: body.system + '\n\n' + userMsg }]
      // Optional image input (base64) for vision/OCR.
      if (body.image && body.image.data) {
        parts.push({ inline_data: { mime_type: body.image.mimeType || 'image/jpeg', data: body.image.data } })
      }

      var payload = {
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { maxOutputTokens: maxTok }
      }

      if (useSearch) {
        // Grounding with Google Search. responseMimeType JSON is NOT allowed with tools.
        payload.tools = [{ google_search: {} }]
      } else if (!plainText) {
        payload.generationConfig.responseMimeType = 'application/json'
      }

      var geminiModel = process.env.AI_MODEL || 'gemini-3.6-flash'
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
            msg = 'Cle API refusee (403). Verifie AI_API_KEY. ' + apiMsg
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
        // Check for prompt blocking
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          return res.status(500).json({ error: 'Requete bloquee par Gemini: ' + data.promptFeedback.blockReason })
        }
        return res.status(500).json({ error: 'Pas de reponse de Gemini: ' + raw.substring(0, 300) })
      }
      // Check for truncation
      if (cand.finishReason === 'MAX_TOKENS') {
        console.warn('Response truncated at max tokens')
      }

      // Concatenate all text parts (grounded responses can be split across parts)
      var textParts = (cand.content && cand.content.parts) || []
      text = textParts.map(function(p) { return p.text || '' }).join('')

      // Extract grounding sources if present
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
