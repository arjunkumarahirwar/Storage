// Link health for the library.
//
// Browsers cannot read a cross-origin Drive response, so this little Vercel
// function does the checking and answers with one word per file:
//   ok         — anyone with the link can open it
//   restricted — the file exists but is not shared publicly ("You need access")
//   missing    — deleted, or the id is wrong (Drive answers 404)
//   unknown    — Drive was slow / rate-limited; try again later
//
// GET  /api/link-health?id=FILE_ID      → { id, status }
// POST /api/link-health { ids: [...] }  → { results: [{ id, status }] }
//
// Drive file ids are 10–100 url-safe characters; anything else is rejected
// before it can reach Google.

const FILE_ID = /^[A-Za-z0-9_-]{10,100}$/
const VIEW_URL = (id) => `https://drive.google.com/file/d/${id}/view`
const MAX_IDS = 12
const CONCURRENCY = 4
const TIMEOUT_MS = 5000

const classify = (status, body) => {
  if (status === 404 || status === 410) return 'missing'
  if (status === 429 || status >= 500) return 'unknown'
  if (status === 401 || status === 403) return 'restricted'
  if (status >= 400) return 'missing'
  // Drive answers 200 for a file you cannot read, with an access request page.
  if (/you need access|request access|gdrive-error/i.test(body)) return 'restricted'
  return 'ok'
}

/** Reads only the first chunk of the page: the notice sits near the top. */
const firstChunk = async (response) => {
  const reader = response.body?.getReader()
  if (!reader) return ''
  try {
    const { value } = await reader.read()
    return value ? new TextDecoder().decode(value).slice(0, 60000) : ''
  } finally {
    try {
      await reader.cancel()
    } catch {
      /* the stream is already done */
    }
  }
}

const probe = async (id) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(VIEW_URL(id), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // A plain browser user-agent gets the same page a student would see.
        'user-agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
        'accept-language': 'en-GB,en;q=0.9',
      },
    })
    const body = response.ok ? await firstChunk(response) : ''
    return classify(response.status, body)
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timer)
  }
}

const readIds = (value) => {
  const list = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      list
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => FILE_ID.test(id)),
    ),
  ).slice(0, MAX_IDS)
}

/** Probes in small parallel groups: fast, but still inside the function limit. */
const probeAll = async (ids) => {
  const results = []
  for (let index = 0; index < ids.length; index += CONCURRENCY) {
    const group = ids.slice(index, index + CONCURRENCY)
    const answers = await Promise.all(group.map((id) => probe(id)))
    group.forEach((id, position) => results.push({ id, status: answers[position] }))
  }
  return results
}

export default async function handler(request, response) {
  response.setHeader('cache-control', 'no-store')

  let ids = []
  if (request.method === 'POST') {
    let body = request.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = {}
      }
    }
    ids = readIds(body?.ids)
  } else {
    ids = readIds(request.query?.id)
  }

  if (!ids.length) {
    response.status(400).json({ error: 'Give one Drive file id, or an ids array.' })
    return
  }

  const results = await probeAll(ids)

  if (request.method === 'POST') {
    response.status(200).json({ results })
    return
  }
  response.status(200).json(results[0])
}
