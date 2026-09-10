// Image search for a vocab word, via the Brave Image Search API.
// Env var: BRAVE_API_KEY (same key as /api/resources; its quota is separate from Gemini).
// Returns { images: [{ url, thumb, title, source }] }. Never hard-fails: on any problem it
// returns an empty list so the client can show a graceful "no image" message.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', images: [] })
  }
  var key = process.env.BRAVE_API_KEY || ''
  if (!key) {
    return res.status(200).json({ error: 'NO_BRAVE_KEY', images: [] })
  }
  try {
    var body = req.body || {}
    var q = (body.q || '').toString().trim()
    if (!q) return res.status(400).json({ error: 'No query', images: [] })

    var params = new URLSearchParams({ q: q, count: '6', safesearch: 'strict' })
    var r = await fetch('https://api.search.brave.com/res/v1/images/search?' + params.toString(), {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
    })
    var raw = await r.text()
    if (!r.ok) {
      var msg = 'Brave ' + r.status
      try { var ej = JSON.parse(raw); msg = (ej.error && (ej.error.detail || ej.error.message)) || ej.message || msg } catch (e) {}
      return res.status(200).json({ error: msg, images: [] })
    }
    var data = JSON.parse(raw)
    var images = (data.results || []).map(function (it) {
      return {
        // Brave-hosted thumbnail loads reliably (no hotlink/CORS issues); full image + page as links.
        thumb: (it.thumbnail && it.thumbnail.src) || '',
        url: (it.properties && it.properties.url) || it.url || '',
        link: it.url || '',
        title: it.title || '',
        source: (it.meta_url && it.meta_url.hostname) || (it.source || ''),
      }
    }).filter(function (x) { return x.thumb || x.url })

    return res.status(200).json({ images: images.slice(0, 6) })
  } catch (err) {
    return res.status(200).json({ error: err.message, images: [] })
  }
}
