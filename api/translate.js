export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var text = (req.body.text || '').trim()
  var from = req.body.from || 'ko'
  var to = req.body.to || 'fr'
  if (!text) return res.status(400).json({ error: 'No text' })

  // MyMemory API (free, no key needed, 5000 words/day)
  try {
    var url = 'https://api.mymemory.translated.net/get?q='
      + encodeURIComponent(text) + '&langpair='
      + encodeURIComponent(from) + '|' + encodeURIComponent(to)
    var r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (r.ok) {
      var data = await r.json()
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        return res.status(200).json({ translation: data.responseData.translatedText })
      }
    }
  } catch (e) {}

  // Fallback: Lingva Translate instances
  var instances = [
    'lingva.ml',
    'lingva.thedaviddelta.com',
    'lingva.lunar.icu'
  ]
  for (var i = 0; i < instances.length; i++) {
    try {
      var lurl = 'https://' + instances[i] + '/api/v1/'
        + encodeURIComponent(from) + '/' + encodeURIComponent(to)
        + '/' + encodeURIComponent(text)
      var lr = await fetch(lurl, { signal: AbortSignal.timeout(5000) })
      if (!lr.ok) continue
      var ld = await lr.json()
      if (ld.translation) {
        return res.status(200).json({ translation: ld.translation })
      }
    } catch (e) {
      continue
    }
  }

  return res.status(502).json({ error: 'Translation unavailable' })
}
