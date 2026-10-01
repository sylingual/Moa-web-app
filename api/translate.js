export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var text = (req.body.text || '').trim()
  var from = req.body.from || 'ko'
  var to = req.body.to || 'fr'
  if (!text) return res.status(400).json({ error: 'No text' })

  var instances = [
    'lingva.ml',
    'lingva.thedaviddelta.com',
    'lingva.lunar.icu'
  ]

  for (var i = 0; i < instances.length; i++) {
    try {
      var url = 'https://' + instances[i] + '/api/v1/'
        + encodeURIComponent(from) + '/' + encodeURIComponent(to)
        + '/' + encodeURIComponent(text)
      var r = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!r.ok) continue
      var data = await r.json()
      if (data.translation) {
        return res.status(200).json({ translation: data.translation })
      }
    } catch (e) {
      continue
    }
  }

  return res.status(502).json({ error: 'Translation unavailable' })
}
