// Feed endpoint. All sources are free and keyless.
//   Korean categories: news (Google News RSS, keyword-personalized), press (Korean outlet
//   RSS headlines), sns (Bluesky curated accounts), masto (Korean Mastodon timelines).
//   Other languages (e.g. German): outlet RSS.
// (Naver Search API was retired from developers.naver.com — moved to Naver Cloud Platform —
//  so it is no longer used here.)

const RSS_SOURCES = {
  ko: [
    { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/news.xml' },
    { name: '경향신문', url: 'https://www.khan.co.kr/rss/rssdata/total_news.xml' },
    { name: '한겨레', url: 'https://www.hani.co.kr/rss/' },
  ],
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

// Google News RSS (Korean). Keyword search when a query is given, else top headlines.
// Free, keyless. Titles come as "Headline - Outlet"; the outlet is split off.
async function fetchGoogleNews(query) {
  var base = 'hl=ko&gl=KR&ceid=KR:ko'
  var url = query
    ? 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&' + base
    : 'https://news.google.com/rss?' + base
  var xml
  try {
    var r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, text/xml' } })
    if (!r.ok) return { error: 'Google News ' + r.status }
    xml = await r.text()
  } catch (e) { return { error: 'Google News: ' + e.message } }

  var blocks = xml.split(/<item[\s>]/i).slice(1)
  var items = []
  for (var j = 0; j < blocks.length && j < 30; j++) {
    var b = blocks[j]
    var title = pickTag(b, 'title')
    var link = pickTag(b, 'link')
    var pub = pickTag(b, 'pubDate')
    var source = pickTag(b, 'source')
    if (!title || !link) continue
    if (source && title.slice(-(source.length + 3)) === ' - ' + source) {
      title = title.slice(0, -(source.length + 3)).trim() // drop trailing " - Outlet"
    }
    items.push({
      title: title,
      snippet: '',
      link: link,
      author: '',
      date: pub ? formatNaverDate(pub) : '',
      source: source || 'Google News',
    })
  }
  return { items: items.slice(0, 25) }
}

// Korean Mastodon public timelines — short-form social text. Free, no auth.
var MASTO_KO_INSTANCES = ['qdon.space', 'planet.moe']
async function fetchMastodon(lang) {
  var out = []
  for (var i = 0; i < MASTO_KO_INSTANCES.length; i++) {
    var host = MASTO_KO_INSTANCES[i]
    var data = await getJson('https://' + host + '/api/v1/timelines/public?local=true&limit=20')
    if (!Array.isArray(data)) continue
    for (var k = 0; k < data.length; k++) {
      var s = data[k]
      if (!s || s.reblog) continue // original toots only (skip boosts)
      if (lang && s.language && s.language !== lang) continue
      var text = stripTags((s.content || '').replace(/<\/(p|div)>/gi, ' ').replace(/<br\s*\/?>/gi, ' '))
      if (!text) continue
      var acct = s.account || {}
      var name = acct.display_name || acct.username || ''
      var surl = s.url || s.uri || ''
      out.push({
        title: text,
        snippet: '',
        link: surl,
        // Mastodon's official per-status embed — renders in an in-app iframe.
        embed: surl ? surl.replace(/\/+$/, '') + '/embed' : '',
        author: name ? name + ' (@' + (acct.acct || acct.username || '') + '@' + host + ')' : '',
        date: s.created_at ? formatNaverDate(s.created_at) : '',
        source: 'Mastodon',
        src: 'masto',
        mhost: host, // instance + status id, used to load the full thread in-app
        mid: s.id || '',
        image: (mastoImages(s.media_attachments)[0] || {}).thumb || '',
        _ts: s.created_at ? new Date(s.created_at).getTime() : 0,
      })
    }
  }
  out.sort(function (a, b) { return (b._ts || 0) - (a._ts || 0) })
  out.forEach(function (it) { delete it._ts })
  return { items: out.slice(0, 30) }
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
    var m = (p.uri || '').match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/(.+)$/)
    var did = m ? m[1] : ''
    var rkey = m ? m[2] : (p.uri || '').split('/').pop()
    var text = (rec.text || '').trim()
    return {
      title: text,
      snippet: '',
      link: (handle && rkey) ? 'https://bsky.app/profile/' + handle + '/post/' + rkey : '',
      // Official embed — renders the post in an in-app iframe (no leaving the app).
      embed: (did && rkey) ? 'https://embed.bsky.app/embed/' + did + '/app.bsky.feed.post/' + rkey : '',
      author: name ? name + ' (@' + handle + ')' : (handle ? '@' + handle : ''),
      date: formatNaverDate(rec.createdAt || p.indexedAt),
      source: 'Bluesky',
      src: 'bsky',
      uri: p.uri || '', // at-uri, used to load the full thread in-app
      image: (bskyImages(p.embed)[0] || {}).thumb || '',
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

// Extract image URLs from a Bluesky post embed view (handles image + recordWithMedia).
function bskyImages(embed) {
  if (!embed) return []
  var e = embed
  if (e['$type'] === 'app.bsky.embed.recordWithMedia#view' && e.media) e = e.media
  if (e['$type'] === 'app.bsky.embed.images#view' && Array.isArray(e.images)) {
    return e.images.map(function (im) { return { url: im.fullsize || im.thumb || '', thumb: im.thumb || im.fullsize || '', alt: im.alt || '' } })
      .filter(function (x) { return x.url })
  }
  return []
}

// Extract image URLs from Mastodon media attachments (video/gifv use their thumbnail).
function mastoImages(atts) {
  if (!Array.isArray(atts)) return []
  return atts.map(function (m) {
    if (!m) return null
    if (m.type === 'image') return { url: m.url || m.preview_url || '', thumb: m.preview_url || m.url || '', alt: m.description || '' }
    if (m.type === 'gifv' || m.type === 'video') return { url: m.preview_url || '', thumb: m.preview_url || '', alt: m.description || '' }
    return null
  }).filter(function (x) { return x && x.url })
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

// Full thread for one post: ancestors (the start of a split message) + the post + replies,
// with same-author continuations ordered first. Used by the in-app post viewer.
async function fetchBlueskyThread(uri) {
  if (!uri) return { error: 'Fil introuvable.' }
  var data = await getJson(BSKY_PUBLIC + 'app.bsky.feed.getPostThread?uri=' + encodeURIComponent(uri) + '&depth=10&parentHeight=10')
  var t = data && data.thread
  if (!t || !t.post) return { error: 'Fil introuvable.' }
  var rootDid = t.post.author && t.post.author.did
  function mapP(pp, role) {
    var rec = pp.record || {}
    var a = pp.author || {}
    var rkey = (pp.uri || '').split('/').pop()
    return {
      author: a.displayName || a.handle || '',
      handle: a.handle || '',
      text: (rec.text || '').trim(),
      date: formatNaverDate(rec.createdAt || pp.indexedAt),
      link: (a.handle && rkey) ? 'https://bsky.app/profile/' + a.handle + '/post/' + rkey : '',
      same: !!(a.did && a.did === rootDid),
      role: role,
      images: bskyImages(pp.embed),
    }
  }
  var posts = []
  var chain = [], p = t.parent, guard = 0
  while (p && p.post && guard < 20) { chain.unshift(p.post); p = p.parent; guard++ }
  chain.forEach(function (x) { posts.push(mapP(x, 'ancestor')) })
  posts.push(mapP(t.post, 'root'))
  function walk(node, depth) {
    if (!node || !node.replies || depth > 8) return
    var reps = node.replies.filter(function (r) { return r && r.post })
    reps.sort(function (a, b) {
      var sa = (a.post.author && a.post.author.did === rootDid) ? 0 : 1
      var sb = (b.post.author && b.post.author.did === rootDid) ? 0 : 1
      if (sa !== sb) return sa - sb
      return new Date((a.post.record && a.post.record.createdAt) || 0) - new Date((b.post.record && b.post.record.createdAt) || 0)
    })
    reps.forEach(function (r) { posts.push(mapP(r.post, 'reply')); walk(r, depth + 1) })
  }
  walk(t, 0)
  return { posts: posts.filter(function (x) { return x.text }).slice(0, 40) }
}

async function fetchMastodonThread(host, id) {
  if (!host || !id) return { error: 'Fil introuvable.' }
  var base = 'https://' + host + '/api/v1/statuses/' + encodeURIComponent(id)
  var status = await getJson(base)
  var ctx = await getJson(base + '/context')
  if (!status) return { error: 'Fil introuvable.' }
  var rootAcct = status.account && status.account.id
  function mapS(s, role) {
    var acct = s.account || {}
    var text = stripTags((s.content || '').replace(/<\/(p|div)>/gi, ' ').replace(/<br\s*\/?>/gi, ' '))
    return {
      author: acct.display_name || acct.username || '',
      handle: (acct.acct || acct.username || '') + '@' + host,
      text: text,
      date: s.created_at ? formatNaverDate(s.created_at) : '',
      link: s.url || s.uri || '',
      same: !!(s.account && s.account.id === rootAcct),
      role: role,
      images: mastoImages(s.media_attachments),
    }
  }
  var posts = []
  ;((ctx && ctx.ancestors) || []).forEach(function (s) { posts.push(mapS(s, 'ancestor')) })
  posts.push(mapS(status, 'root'))
  var desc = ((ctx && ctx.descendants) || []).slice()
  desc.sort(function (a, b) {
    var sa = (a.account && a.account.id === rootAcct) ? 0 : 1
    var sb = (b.account && b.account.id === rootAcct) ? 0 : 1
    if (sa !== sb) return sa - sb
    return new Date(a.created_at || 0) - new Date(b.created_at || 0)
  })
  desc.forEach(function (s) { posts.push(mapS(s, 'reply')) })
  return { posts: posts.filter(function (x) { return x.text }).slice(0, 40) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    var body = req.body || {}
    var targetLang = body.targetLang || 'ko'
    var query = (body.query || '').trim()
    var category = body.category || 'news'

    // Thread request: return one post's full thread (ancestors + post + replies).
    if (body.action === 'thread') {
      var tr = body.src === 'masto'
        ? await fetchMastodonThread(body.mhost, body.mid)
        : await fetchBlueskyThread(body.uri)
      if (tr.error) return res.status(502).json({ error: tr.error })
      return res.status(200).json({ posts: tr.posts || [] })
    }

    // All categories work without a keyword (news falls back to top headlines).
    var result
    if (targetLang === 'ko') {
      if (category === 'sns') result = await fetchBluesky('ko')
      else if (category === 'masto') result = await fetchMastodon('ko')
      else if (category === 'press') result = await fetchRss('ko', '')
      else result = await fetchGoogleNews(query) // 'news' — keyword-personalized, else top
    } else {
      result = await fetchRss(targetLang, query) // other languages: outlet RSS
    }

    if (result.error) {
      return res.status(502).json({ error: result.error })
    }
    return res.status(200).json({ items: result.items || [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
