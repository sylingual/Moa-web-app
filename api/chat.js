export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var apiKey = process.env.AI_API_KEY || ''
  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not set' })
  }
  var raw = ''
  try {
    var body = req.body
    var userMsg = body.messages.map(function(m) { return m.content }).join('\n')
    var useSearch = body.search === true
    var plainText = body.plain === true

    var parts = [{ text: body.system + '\n\n' + userMsg }]
    // Optional image input (base64) for vision/OCR.
    if (body.image && body.image.data) {
      parts.push({ inline_data: { mime_type: body.image.mimeType || 'image/jpeg', data: body.image.data } })
    }

    // Honor the client's token budget, but keep a generous floor: gemini-3.6-flash spends
    // part of maxOutputTokens on hidden "thinking" tokens, so too tight a cap truncates the
    // visible JSON mid-string. Floor 3000 leaves room for thinking + the actual answer.
    var maxTok = Math.min(8000, Math.max(3000, Number(body.max_tokens) || 4000))
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

    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey,
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
            ? 'SEARCH_QUOTA: Le quota de recherche web Google est atteint (limite quotidienne distincte du quota de génération). ' + apiMsg
            : 'Quota API dépassé (429). Réessaie dans quelques minutes. ' + apiMsg
        } else if (r.status === 400) {
          msg = 'Requête invalide (400). ' + apiMsg
        } else if (r.status === 403) {
          msg = 'Clé API refusée (403). Vérifie AI_API_KEY. ' + apiMsg
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
        return res.status(500).json({ error: 'Requête bloquée par Gemini: ' + data.promptFeedback.blockReason })
      }
      return res.status(500).json({ error: 'Pas de réponse de Gemini: ' + raw.substring(0, 300) })
    }
    // Check for truncation
    if (cand.finishReason === 'MAX_TOKENS') {
      console.warn('Response truncated at max tokens')
    }

    // Concatenate all text parts (grounded responses can be split across parts)
    var parts = (cand.content && cand.content.parts) || []
    var text = parts.map(function(p) { return p.text || '' }).join('')

    // Extract grounding sources if present
    var sources = []
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

    return res.status(200).json({
      content: [{ type: 'text', text: text }],
      sources: sources
    })
  } catch (err) {
    return res.status(500).json({ error: err.message + ' | Raw: ' + (typeof raw === 'string' ? raw.substring(0, 200) : 'none') })
  }
}
