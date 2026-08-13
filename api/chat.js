export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var apiKey = process.env.AI_API_KEY || ''
  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not set' })
  }
  try {
    var body = req.body
    var userMsg = body.messages.map(function(m) { return m.content }).join('\n')
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: body.system + '\n\n' + userMsg }] }],
          generationConfig: { maxOutputTokens: 8000, responseMimeType: 'application/json' }
        })
      }
    )
    var raw = await r.text()
    if (!r.ok) {
      return res.status(500).json({ error: 'Gemini ' + r.status + ': ' + raw.substring(0, 300) })
    }
    var data = JSON.parse(raw)
    var text = data.candidates[0].content.parts[0].text
    return res.status(200).json({ content: [{ type: 'text', text: text }] })
  } catch (err) {
    return res.status(500).json({ error: err.message + ' | Raw: ' + (typeof raw === 'string' ? raw.substring(0, 200) : 'none') })
  }
}
