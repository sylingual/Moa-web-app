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

    var payload = {
      contents: [{ role: 'user', parts: [{ text: body.system + '\n\n' + userMsg }] }],
      generationConfig: { maxOutputTokens: 8000 }
    }

    if (useSearch) {
      // Grounding with Google Search. Note: responseMimeType JSON is NOT allowed with tools,
      // so the model returns plain text and the client parses it.
      payload.tools = [{ google_search: {} }]
    } else {
      payload.generationConfig.responseMimeType = 'application/json'
    }

    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )
    raw = await r.text()
    if (!r.ok) {
      return res.status(500).json({ error: 'Gemini ' + r.status + ': ' + raw.substring(0, 300) })
    }
    var data = JSON.parse(raw)
    var cand = data.candidates && data.candidates[0]
    if (!cand) {
      return res.status(500).json({ error: 'No candidate in Gemini response: ' + raw.substring(0, 300) })
    }

    // Concatenate all text parts (grounded responses can be split across parts)
    var parts = (cand.content && cand.content.parts) || []
    var text = parts.map(function(p) { return p.text || '' }).join('')

    // Extract grounding sources if present
    var sources = []
    var gm = cand.groundingMetadata
    if (gm && gm.groundingChunks) {
      for (var i = 0; i < gm.groundingChunks.length; i++) {
        var chunk = gm.groundingChunks[i]
        if (chunk.web && chunk.web.uri) {
          sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri })
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
