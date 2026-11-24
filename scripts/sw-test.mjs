/**
 * Service worker test — runs public/sw.js against a fake Cache API, a fake
 * network and fake clients, so the offline routing can be checked without a
 * browser. No dependencies, no build step:
 *
 *   npm run test:sw
 *
 * The checks are the promises the PWA makes: the app boots offline, the last
 * library listing is still there, the link checker is never cached, and a
 * deploy is picked up because pages are network-first.
 */
import fs from 'node:fs'
import vm from 'node:vm'

const SITE = 'https://mppolicepyqs.vercel.app'
const SUPABASE = 'https://xvehdhwvkjdwqayoonxg.supabase.co'

class CacheShim {
  constructor() { this.store = new Map() }
  async put(request, response) {
    const url = typeof request === 'string' ? new URL(request, SITE).href : request.url
    this.store.set(url, response.clone())
  }
  async match(request, options = {}) {
    const target = new URL(typeof request === 'string' ? new URL(request, SITE).href : request.url)
    for (const [key, response] of this.store) {
      const url = new URL(key)
      if (options.ignoreSearch) {
        if (url.origin === target.origin && url.pathname === target.pathname) return response.clone()
      } else if (url.href === target.href) return response.clone()
    }
    return undefined
  }
  async add(request) {
    const response = await network(typeof request === 'string' ? new Request(new URL(request, SITE)) : request)
    if (!response.ok) throw new Error(`bad status ${response.status} for ${request.url}`)
    await this.put(request, response)
  }
  async addAll(requests) { for (const r of requests) await this.add(r) }
}

// Workers resolve a relative Request URL against their own script URL; Node
// has no base URL, so the harness supplies one.
class SiteRequest extends Request {
  constructor(input, init) {
    super(
      typeof input === 'string' ? new URL(input, SITE).href : input,
      init,
    )
  }
}
globalThis.Request = SiteRequest

const cachesByName = new Map()

globalThis.caches = {
  async open(name) {
    if (!cachesByName.has(name)) cachesByName.set(name, new CacheShim())
    return cachesByName.get(name)
  },
  async keys() { return [...cachesByName.keys()] },
  async delete(name) { return cachesByName.delete(name) },
  async match(request, options) {
    for (const cache of cachesByName.values()) {
      const hit = await cache.match(request, options)
      if (hit) return hit
    }
    return undefined
  },
}

// ---- fake network -------------------------------------------------------
let online = true
const calls = []
const routes = {
  '/': { body: '<div id="root"></div><script type="module" src="/assets/index-abc.js"></script><link rel="stylesheet" href="/assets/index-abc.css">', type: 'text/html' },
  '/index.html': { body: '<div id="root"></div><script type="module" src="/assets/index-abc.js"></script><link rel="stylesheet" href="/assets/index-abc.css">', type: 'text/html' },
  '/assets/index-abc.js': { body: 'console.log("app")', type: 'text/javascript' },
  '/assets/index-abc.css': { body: 'body{}', type: 'text/css' },
  '/manifest.webmanifest': { body: '{"name":"x"}', type: 'application/manifest+json' },
  '/favicon.svg': { body: '<svg/>', type: 'image/svg+xml' },
  '/favicon.png': { body: 'png', type: 'image/png' },
  '/icon-192.png': { body: 'png', type: 'image/png' },
  '/icon-512.png': { body: 'png', type: 'image/png' },
  '/icon-maskable-512.png': { body: 'png', type: 'image/png' },
  '/apple-touch-icon.png': { body: 'png', type: 'image/png' },
  [`${SUPABASE}/rest/v1/papers`]: { body: '[{"id":"p1","title":"A paper"}]', type: 'application/json' },
  '/api/link-health': { body: '{"id":"x","status":"ok"}', type: 'application/json' },
  'https://fonts.gstatic.com/s/inter/v1/font.woff2': { body: 'wOF2-font-bytes', type: 'font/woff2' },
}

async function network(request) {
  const url = new URL(request.url)
  calls.push(url.pathname + url.search)
  if (!online) throw new TypeError('Failed to fetch')
  const route = routes[url.origin === new URL(SITE).origin ? url.pathname : url.href.split('?')[0]]
  if (!route) return new Response('not found', { status: 404 })
  return new Response(route.body, { status: 200, headers: { 'content-type': route.type } })
}

globalThis.fetch = (input, init) => {
  // Browsers resolve a relative URL in a worker against its scope.
  const request =
    typeof input === 'string' ? new Request(input, init) : input
  return network(request)
}

// ---- run the worker -----------------------------------------------------
const listeners = {}
globalThis.self = {
  location: new URL(SITE),
  addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn) },
  skipWaiting: async () => {},
  clients: { claim: async () => {}, matchAll: async () => [] },
}

const code = fs.readFileSync('public/sw.js', 'utf8')
vm.runInThisContext(code, { filename: 'sw.js' })

const dispatchInstall = () => {
  let done
  for (const fn of listeners.install ?? []) fn({ waitUntil: (p) => { done = p } })
  return done
}
const dispatchActivate = () => {
  let done
  for (const fn of listeners.activate ?? []) fn({ waitUntil: (p) => { done = p } })
  return done
}
const dispatchFetch = (request) => {
  let responded
  for (const fn of listeners.fetch ?? []) {
    try {
      fn({ request, respondWith: (p) => { responded = p } })
    } catch (error) {
      console.log('fetch listener threw:', error.message)
    }
  }
  return responded
}

// Node refuses mode: 'navigate', so make a normal Request and mark it.
const navigateTo = (path) => {
  const request = new Request(path)
  Object.defineProperty(request, 'mode', { value: 'navigate' })
  return request
}

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

// 1. install
await dispatchInstall()
const shell = await caches.open('pyq-shell-v2')
const assets = await caches.open('pyq-assets-v2')
check('install caches index.html', Boolean(await shell.match('/index.html')))
check('install caches "/"', Boolean(await shell.match('/')))
check('install caches the hashed bundle', Boolean(await assets.match('/assets/index-abc.js')))
check('install caches icons', Boolean(await shell.match('/icon-512.png')))
check('install caches the manifest', Boolean(await shell.match('/manifest.webmanifest')))

await dispatchActivate()

// 2. navigation online
let nav = navigateTo('/')
let res = await dispatchFetch(nav)
check('online navigation returns the network page', res.status === 200 && (await res.text()).includes('id="root"'))

// 3. library listing online -> cached
const papersUrl = `${SUPABASE}/rest/v1/papers?select=*&order=sort_order.asc`
const papersReq = () => new Request(papersUrl)
res = await dispatchFetch(papersReq())
const body = await res.text()
check('papers come from the network when online', body.includes('A paper'))

// 4. offline: navigation falls back to the cached shell
online = false
res = await dispatchFetch(navigateTo('/?cat=MATHS'))
check('offline navigation serves the cached shell', res.status === 200 && (await res.text()).includes('id="root"'))

// 5. offline: the cached listing still arrives
res = await dispatchFetch(papersReq())
check('offline papers come from the cache', (await res.text()).includes('A paper'))

// 6. offline with nothing cached -> the app must see a rejection, not fake data
cachesByName.delete('pyq-data-v2')
let threw = false
try {
  await dispatchFetch(papersReq())
} catch {
  threw = true
}
check('offline with an empty cache rejects (app shows its own error)', threw)

// 7. the link checker is never intercepted
online = true
const apiHandler = dispatchFetch(new Request(`${SITE}/api/link-health?id=abc`))
check('api/link-health is left to the network', apiHandler === undefined)

// 8. assets are served from cache without touching the network
const before = calls.length
res = await dispatchFetch(new Request('/assets/index-abc.js'))
check('hashed asset served from cache', (await res.text()).includes('app') && calls.length === before)

// 9. old caches are cleared on activate
await caches.open('pyq-shell-v0')
await dispatchActivate()
check('stale version caches are deleted', !(await caches.keys()).includes('pyq-shell-v0'))

// 9b. the page's "warm" message pre-saves the listing for a fresh install
cachesByName.delete('pyq-data-v2')
online = true
const dispatchMessage = (data) => {
  let done
  for (const fn of listeners.message ?? []) fn({ data, waitUntil: (p) => { done = p } })
  return done
}
await dispatchMessage({
  type: 'warm',
  requests: [
    {
      url: `${SUPABASE}/rest/v1/papers?select=*`,
      headers: { apikey: 'anon', authorization: 'Bearer anon' },
    },
  ],
})
online = false
res = await dispatchFetch(papersReq())
check('a warmed listing is available offline straight away', (await res.text()).includes('A paper'))
online = true

// 10. a font request is cached on first use, then served offline
online = true
const fontReq = () => new Request('https://fonts.gstatic.com/s/inter/v1/font.woff2')
await dispatchFetch(fontReq())
online = false
res = await dispatchFetch(fontReq())
check('fonts survive offline', (await res.arrayBuffer()).byteLength > 0)

console.log(failures ? `\n${failures} failure(s)` : '\nall service worker checks passed')
process.exit(failures ? 1 : 0)
