export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var apiKey = process.env.ELEVENLABS_API_KEY || ''
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' })
  }

  var text = (req.body.text || '').trim()
  var voiceId = req.body.voice_id || process.env.ELEVENLABS_VOICE_DEFAULT || '21m00Tcm4TlvDq8ikWAM'
  if (!text) return res.status(400).json({ error: 'No text' })
  if (text.length > 5000) return res.status(400).json({ error: 'Text too long' })

  try {
    var url = 'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId)
    var r = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!r.ok) {
      var errText = await r.text()
      return res.status(r.status).json({ error: 'ElevenLabs ' + r.status + ': ' + errText.slice(0, 200) })
    }
    var buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', buf.length)
    return res.status(200).send(buf)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
