// Image search for a vocab word.
// Primary: SerpAPI Google Images (env var: SERPAPI_KEY)
// Fallback: Brave Image Search (env var: BRAVE_API_KEY)
// Returns { images: [{ url, thumb, title, source }] }.

async function searchSerpApi(q, count, key) {
  var params = new URLSearchParams({
    engine: 'google_images',
    q: q,
    ijn: '0',
    num: String(count),
    safe: 'active',
    api_key: key,
  })
  var r = await fetch('https://serpapi.com/search.json?' + params.toString())
  var raw = await r.text()
  if (!r.ok) {
    var msg = 'SerpAPI ' + r.status
    try { var ej = JSON.parse(raw); msg = ej.error || msg } catch (e) {}
    console.log('[image] SerpAPI error:', msg)
    return { error: msg, images: [] }
  }
  var data = JSON.parse(raw)
  var images = (data.images_results || []).map(function (it) {
    return {
      thumb: it.thumbnail || '',
      url: it.original || '',
      link: it.link || '',
      title: it.title || '',
      source: it.source || '',
    }
  }).filter(function (x) { return x.thumb || x.url })
  return { images: images.slice(0, count) }
}

async function searchBrave(q, count, key) {
  var params = new URLSearchParams({ q: q, count: String(count), safesearch: 'strict' })
  var r = await fetch('https://api.search.brave.com/res/v1/images/search?' + params.toString(), {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
  })
  var raw = await r.text()
  if (!r.ok) {
    var msg = 'Brave ' + r.status
    try { var ej = JSON.parse(raw); msg = (ej.error && (ej.error.detail || ej.error.message)) || ej.message || msg } catch (e) {}
    console.log('[image] Brave error:', msg)
    return { error: msg, images: [] }
  }
  var data = JSON.parse(raw)
  var images = (data.results || []).map(function (it) {
    return {
      thumb: (it.thumbnail && it.thumbnail.src) || '',
      url: (it.properties && it.properties.url) || it.url || '',
      link: it.url || '',
      title: it.title || '',
      source: (it.meta_url && it.meta_url.hostname) || (it.source || ''),
    }
  }).filter(function (x) { return x.thumb || x.url })
  return { images: images.slice(0, count) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', images: [] })
  }
  try {
    var body = req.body || {}
    var q = (body.q || '').toString().trim()
    if (!q) return res.status(400).json({ error: 'No query', images: [] })
    var count = Math.min(50, Math.max(4, Number(body.count) || 20))

    var serpKey = process.env.SERPAPI_KEY || ''
    var braveKey = process.env.BRAVE_API_KEY || ''

    // Try SerpAPI first
    if (serpKey) {
      console.log('[image] SerpAPI request:', q)
      var result = await searchSerpApi(q, count, serpKey)
      if (result.images.length > 0) {
        console.log('[image] SerpAPI returned', result.images.length, 'results')
        return res.status(200).json({ images: result.images })
      }
      console.log('[image] SerpAPI returned 0 results, trying Brave fallback')
    }

    // Fallback to Brave
    if (braveKey) {
      console.log('[image] Brave request:', q)
      var result2 = await searchBrave(q, count, braveKey)
      if (result2.images.length > 0) {
        console.log('[image] Brave returned', result2.images.length, 'results')
        return res.status(200).json({ images: result2.images })
      }
      console.log('[image] Brave returned 0 results')
      return res.status(200).json({ error: 'No results for: ' + q, images: [] })
    }

    if (!serpKey && !braveKey) {
      return res.status(200).json({ error: 'NO_API_KEY', images: [] })
    }

    return res.status(200).json({ error: 'No results for: ' + q, images: [] })
  } catch (err) {
    console.error('[image] error:', err)
    return res.status(200).json({ error: err.message, images: [] })
  }
}
