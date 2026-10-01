export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  var text = (req.body.text || '').trim()
  var from = req.body.from || 'ko'
  var to = req.body.to || 'fr'
  if (!text) return res.status(400).json({ error: 'No text' })

  try {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
      + encodeURIComponent(from) + '&tl=' + encodeURIComponent(to)
      + '&dt=t&q=' + encodeURIComponent(text)
    var r = await fetch(url)
    if (!r.ok) {
      return res.status(r.status).json({ error: 'Google Translate ' + r.status })
    }
    var data = await r.json()
    var translation = (data[0] || []).map(function(s) { return s[0] || '' }).join('')
    return res.status(200).json({ translation: translation })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
