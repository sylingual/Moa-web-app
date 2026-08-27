// Feed endpoint: Naver Search API for Korean, RSS for other languages.
// Env vars needed for Korean: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

const RSS_SOURCES = {
  de: [
    { name: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-de-all' },
    { name: 'tagesschau', url: 'https://www.tagesschau.de/index~rss2.xml' },
  ],
}

function stripTags(s) {
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .trim()
}

function unwrapCdata(s) {
  if (!s) return ''
  var m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return m ? m[1] : s
}

function pickTag(block, tag) {
  var re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i')
  var m = block.match(re)
  return m ? stripTags(unwrapCdata(m[1])) : ''
}

function formatNaverDate(d) {
  // Naver blog returns YYYYMMDD
  if (!d) return ''
  if (/^\d{8}$/.test(d)) {
    return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8)
  }
  try {
    return new Date(d).toISOString().slice(0, 10)
  } catch (e) {
    return ''
  }
}

async function fetchNaver(query, category) {
  var id = process.env.NAVER_CLIENT_ID || ''
  var secret = process.env.NAVER_CLIENT_SECRET || ''
  if (!id || !secret) {
    return { error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET non configurés sur Vercel.' }
  }

  var endpoint = category === 'news' ? 'news'
    : category === 'cafe' ? 'cafearticle'
    : category === 'kin' ? 'kin'
    : 'blog'

  // kin and cafearticle do not support sort=date reliably; use sim for those
  var sort = (endpoint === 'blog' || endpoint === 'news') ? 'date' : 'sim'
  var url = 'https://openapi.naver.com/v1/search/' + endpoint +
    '?query=' + encodeURIComponent(query) + '&display=20&sort=' + sort

  var r = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': id,
      'X-Naver-Client-Secret': secret,
    },
  })
  var raw = await r.text()
  if (!r.ok) {
    return { error: 'Naver ' + r.status + ': ' + raw.substring(0, 250) }
  }
  var data
  try { data = JSON.parse(raw) } catch (e) {
    return { error: 'Réponse Naver illisible: ' + raw.substring(0, 200) }
  }

  var items = (data.items || []).map(function (it) {
    return {
      title: stripTags(it.title),
      snippet: stripTags(it.description),
      link: it.link || it.originallink || '',
      author: stripTags(it.bloggername || it.cafename || ''),
      date: formatNaverDate(it.postdate || it.pubDate),
      source: endpoint === 'news' ? 'Naver News'
        : endpoint === 'cafearticle' ? 'Naver Cafe'
        : endpoint === 'kin' ? '지식iN'
        : 'Naver Blog',
    }
  }).filter(function (it) { return it.title && it.snippet })

  return { items: items }
}

async function fetchRss(langCode, query) {
  var sources = RSS_SOURCES[langCode] || []
  if (!sources.length) {
    return { error: 'Aucune source configurée pour cette langue.' }
  }

  var all = []
  for (var i = 0; i < sources.length; i++) {
    try {
      var r = await fetch(sources[i].url)
      if (!r.ok) continue
      var xml = await r.text()
      var blocks = xml.split(/<item[\s>]/i).slice(1)
      for (var j = 0; j < blocks.length && j < 20; j++) {
        var b = blocks[j]
        var title = pickTag(b, 'title')
        var desc = pickTag(b, 'description')
        var link = pickTag(b, 'link')
        var pub = pickTag(b, 'pubDate')
        if (!title) continue
        all.push({
          title: title,
          snippet: desc.substring(0, 400),
          link: link,
          author: '',
          date: pub ? formatNaverDate(pub) : '',
          source: sources[i].name,
        })
      }
    } catch (e) { /* skip this source */ }
  }

  // Filter by query if provided
  if (query) {
    var q = query.toLowerCase()
    var filtered = all.filter(function (it) {
      return (it.title + ' ' + it.snippet).toLowerCase().indexOf(q) !== -1
    })
    if (filtered.length) all = filtered
  }

  return { items: all.slice(0, 25) }
}

// Bluesky (AT Protocol). Short-form Korean social text — recent posts from a curated set
// of notable, active Korean-language accounts (journalism, political news, and public
// voices who post opinions/news often). No keyword search, no API key: the public
// getAuthorFeed endpoint is unauthenticated. Handles verified active + Korean at authoring.
var BSKY_PUBLIC = 'https://public.api.bsky.app/xrpc/'
var BSKY_KO_ACCOUNTS = [
  'sisain.bsky.social',        // 시사IN — magazine de journalisme (opinion/actu)
  'imnotheqoo.bsky.social',    // 정치뉴스 — actu politique
  'koreadesk.bsky.social',     // 코리아데스크 — actu coréenne
  'letswinpress.bsky.social',  // 기자호소인 — journaliste, opinions
  'duwind88.bsky.social',      // 작가두도 — écrivain coréen
  'blue-eon.bsky.social',      // 이온 — créateur webtoon/roman coréen
]

function mapBlueskyPosts(posts) {
  return posts.map(function (p) {
    var rec = p.record || {}
    var handle = (p.author && p.author.handle) || ''
    var name = (p.author && p.author.displayName) || ''
    var rkey = (p.uri || '').split('/').pop()
    var text = (rec.text || '').trim()
    return {
      title: text,
      snippet: '',
      link: (handle && rkey) ? 'https://bsky.app/profile/' + handle + '/post/' + rkey : '',
      author: name ? name + ' (@' + handle + ')' : (handle ? '@' + handle : ''),
      date: formatNaverDate(rec.createdAt || p.indexedAt),
      source: 'Bluesky',
    }
  }).filter(function (it) { return it.title && it.link })
}

async function getJson(url) {
  try {
    var r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return null
    return await r.json()
  } catch (e) { return null }
}

// Recent target-language posts the curated accounts wrote OR shared (reposts included, since
// these accounts mostly surface news by resharing). Per-account capped so no one floods,
// de-duplicated across accounts, newest-surfaced first.
async function fetchBluesky(langCode) {
  var lang = langCode || 'ko'
  var PER_ACCOUNT = 6
  var collected = []
  var seenUris = {}
  for (var i = 0; i < BSKY_KO_ACCOUNTS.length; i++) {
    var f = await getJson(BSKY_PUBLIC + 'app.bsky.feed.getAuthorFeed?actor=' + encodeURIComponent(BSKY_KO_ACCOUNTS[i]) + '&limit=20&filter=posts_no_replies')
    var feed = (f && f.feed) || []
    var kept = 0
    for (var k = 0; k < feed.length && kept < PER_ACCOUNT; k++) {
      var item = feed[k]
      var post = item && item.post
      if (!post || seenUris[post.uri]) continue
      var langs = (post.record && post.record.langs) || []
      if (lang && langs.length && langs.indexOf(lang) === -1) continue // keep target-language posts
      // Order by when it surfaced: repost time if reshared, else the post's own time.
      var surfaced = (item.reason && item.reason.indexedAt) || post.indexedAt || (post.record && post.record.createdAt)
      seenUris[post.uri] = true
      collected.push({ post: post, surfaced: surfaced })
      kept++
    }
  }
  collected.sort(function (x, y) {
    return new Date(y.surfaced || 0).getTime() - new Date(x.surfaced || 0).getTime()
  })
  return { items: mapBlueskyPosts(collected.map(function (c) { return c.post })).slice(0, 30) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    var body = req.body || {}
    var targetLang = body.targetLang || 'ko'
    var query = (body.query || '').trim()
    var category = body.category || 'blog'

    // The Bluesky (sns) category is a curated account feed — no keyword needed.
    if (!query && category !== 'sns') {
      return res.status(400).json({ error: 'Aucun mot-clé fourni.' })
    }

    var result = category === 'sns'
      ? await fetchBluesky(targetLang)
      : targetLang === 'ko'
        ? await fetchNaver(query, category)
        : await fetchRss(targetLang, query)

    if (result.error) {
      return res.status(502).json({ error: result.error })
    }
    return res.status(200).json({ items: result.items || [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
