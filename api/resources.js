// Resources endpoint: real web resources (with URLs) via the Brave Search API.
// Env var needed: BRAVE_API_KEY (free tier at https://brave.com/search/api).
// If the key is missing or Brave errors, this returns an empty result set and the
// client falls back to curated deep-links, so the feature never hard-fails.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', results: [] })
  }

  var key = process.env.BRAVE_API_KEY || ''
  if (!key) {
    // Signal to the client to use its curated fallback (not an error the user should see).
    return res.status(200).json({ error: 'NO_BRAVE_KEY', results: [] })
  }

  try {
    var body = req.body || {}
    var structure = (body.structure || '').toString().trim()
    var targetLang = (body.targetLang || '').toString().trim()

    if (!structure) {
      return res.status(400).json({ error: 'No structure provided', results: [] })
    }

    // Query aimed at pedagogical explanations rather than raw target-language pages.
    var query = structure + ' ' + targetLang + ' grammar meaning usage explanation'
    var params = new URLSearchParams({
      q: query,
      count: '10',
      safesearch: 'moderate',
      text_decorations: 'false',
    })

    var r = await fetch('https://api.search.brave.com/res/v1/web/search?' + params.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': key,
      },
    })
    var raw = await r.text()

    if (!r.ok) {
      var msg = 'Brave ' + r.status
      try {
        var ej = JSON.parse(raw)
        msg = (ej.error && (ej.error.detail || ej.error.message)) || ej.message || msg
      } catch (e) {
        msg = 'Brave ' + r.status + ': ' + raw.substring(0, 200)
      }
      // Still 200 to the client with empty results -> graceful curated fallback,
      // but include the reason for debugging.
      return res.status(200).json({ error: msg, results: [] })
    }

    var data = JSON.parse(raw)
    var web = (data.web && data.web.results) || []
    var mapped = web.map(function (it) {
      return {
        title: (it.title || it.url || '').replace(/<[^>]*>/g, ''),
        uri: it.url,
        snippet: (it.description || '').replace(/<[^>]*>/g, ''),
      }
    }).filter(function (it) { return it.uri })

    // Surface How To Study Korean first when it shows up — it's usually the most relevant.
    function isHtsk(it) { return /howtostudykorean\.com/i.test(it.uri) }
    mapped.sort(function (a, b) { return (isHtsk(b) ? 1 : 0) - (isHtsk(a) ? 1 : 0) })

    var results = mapped.slice(0, 3)

    return res.status(200).json({ results: results })
  } catch (err) {
    return res.status(200).json({ error: err.message, results: [] })
  }
}
