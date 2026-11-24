/* MP Police PYQ Library — service worker.
 *
 * What it makes work offline:
 *   · the app itself (HTML + the hashed JS/CSS bundle, icons, fonts)
 *   · the last library listing that came back from Supabase
 *
 * What it never caches: the PDFs themselves. They live in Google Drive and
 * need a connection; the site just keeps the list usable when the phone is on
 * a weak or dead network.
 *
 * Freshness first: pages and the papers table are network-first with a cache
 * fallback, so a paper you edit in the admin panel shows up straight away when
 * you are online. Everything else (hashed asset files) is cache-first because
 * a hashed filename can never change.
 */

const VERSION = 'v2'
const SHELL = `pyq-shell-${VERSION}`
const ASSETS = `pyq-assets-${VERSION}`
const DATA = `pyq-data-${VERSION}`
const CURRENT = [SHELL, ASSETS, DATA]

const STATIC = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]

const PAPERS_PATH = /\/rest\/v1\/papers(\?|$)/

/** Cache the app shell, and the exact hashed files this build of it needs. */
const precache = async () => {
  const shell = await caches.open(SHELL)
  await Promise.all(
    STATIC.map(async (url) => {
      try {
        await shell.add(new Request(url, { cache: 'reload' }))
      } catch {
        /* one missing file must not stop the install */
      }
    }),
  )

  // index.html names the hashed JS and CSS; grab them now so the very first
  // offline launch has something to run.
  try {
    const response = await fetch('/index.html', { cache: 'reload' })
    if (!response.ok) return
    const html = await response.clone().text()
    await shell.put('/index.html', response)
    const refs = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map(
      (match) => match[1],
    )
    const assets = await caches.open(ASSETS)
    await Promise.all(
      refs.map(async (url) => {
        try {
          await assets.add(new Request(url, { cache: 'reload' }))
        } catch {
          /* ignore */
        }
      }),
    )
  } catch {
    /* offline install — the runtime handlers will fill the cache later */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name.startsWith('pyq-') && !CURRENT.includes(name)).map((name) =>
          caches.delete(name),
        ),
      )
      await self.clients.claim()
    })(),
  )
})

/**
 * The page tells us the exact listing request (URL + Supabase keys) once the
 * worker is ready, so the very first launch after installing already has the
 * library saved — no second visit needed.
 */
const warm = async (requests) => {
  const cache = await caches.open(DATA)
  for (const entry of requests) {
    if (!entry || typeof entry.url !== 'string') continue
    try {
      const response = await fetch(
        new Request(entry.url, { headers: entry.headers ?? {}, cache: 'no-store' }),
      )
      if (response.ok) await cache.put(entry.url, response.clone())
    } catch {
      /* offline right now — the next launch will fill it */
    }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data
  if (data === 'skip-waiting' || data?.type === 'skip-waiting') {
    self.skipWaiting()
    return
  }
  if (data?.type === 'warm' && Array.isArray(data.requests)) {
    event.waitUntil(warm(data.requests))
  }
})

const fromCache = async (request) => {
  // ignoreVary: Supabase answers with Vary headers; the listing itself is the
  // same for everybody, so a header difference must not hide the saved copy.
  const match = await caches.match(request, { ignoreSearch: true, ignoreVary: true })
  return match ?? null
}

/**
 * Network first, cache as the safety net. Never longer than `timeout` ms.
 * `cacheKey` keeps every ?v=… navigation in one cache entry.
 */
const networkFirst = async (request, cacheName, timeout = 4000, cacheKey = null) => {
  const cache = await caches.open(cacheName)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const response = await fetch(request, {
      signal: controller.signal,
      credentials: request.credentials,
    })
    clearTimeout(timer)
    if (response && response.ok) {
      cache.put(cacheKey ?? request, response.clone()).catch(() => {})
      return response
    }
    const cached = await fromCache(request)
    return cached ?? response
  } catch {
    const cached = await fromCache(request)
    if (cached) return cached
    throw new Error('offline')
  }
}

/** Cache first — the URL contains a content hash, so it cannot go stale. */
const cacheFirst = async (request, cacheName) => {
  const cached = await fromCache(request)
  if (cached) return cached
  const cache = await caches.open(cacheName)
  const response = await fetch(request)
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone()).catch(() => {})
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Pages: network first so a deploy is picked up immediately, cache offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, SHELL, 4000, '/index.html')
        } catch {
          const shell =
            (await caches.match('/index.html')) ?? (await caches.match('/'))
          if (shell) return shell
          return new Response(
            '<!doctype html><title>Offline</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>You are offline</h1><p>Open this page once with a connection and it will work offline next time.</p></body>',
            { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 200 },
          )
        }
      })(),
    )
    return
  }

  // The library listing: fresh when online, the last copy when not.
  if (url.origin !== self.location.origin && PAPERS_PATH.test(url.pathname)) {
    // Offline with nothing cached: let the request fail, so the app shows its
    // own "could not load the library" message instead of half a response.
    event.respondWith(networkFirst(request, DATA, 5000))
    return
  }

  // Fonts: cache first, they never change.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }

  if (url.origin !== self.location.origin) return

  // The link checker must always be live.
  if (url.pathname.startsWith('/api/')) return

  // Hashed build output and images.
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|png|svg|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }

  // Anything else same-origin: try the network, fall back to whatever we have.
  event.respondWith(
    networkFirst(request, SHELL, 4000).catch(
      async () => (await fromCache(request)) ?? new Response('', { status: 504 }),
    ),
  )
})
