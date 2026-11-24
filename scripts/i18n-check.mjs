/**
 * Finds screens that speak English only.
 *
 * The English sentence is the key (see src/lib/i18n.ts), so a missing entry
 * does not break anything — it just stays English while the rest of the page
 * turns Hindi. This script lists those leftovers.
 *
 *   npm run check:i18n
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
const DICTIONARY = join(SRC, 'lib', 'i18n.ts')

/** Keys of the Hindi object, however they are written (quoted or bare). */
const dictionaryKeys = () => {
  const source = readFileSync(DICTIONARY, 'utf8')
  const start = source.indexOf('const hi: Record<string, string> = {')
  if (start === -1) throw new Error('Could not find the `hi` dictionary in src/lib/i18n.ts')
  const body = source.slice(start, source.indexOf('\n}', start))

  const keys = new Set()
  for (const line of body.split('\n')) {
    const match = line.match(
      /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*))\s*:/,
    )
    if (match) keys.add(match[1] ?? match[2] ?? match[3])
  }
  return keys
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const keys = dictionaryKeys()
const missing = []

for (const file of walk(SRC)) {
  if (!/\.(ts|tsx)$/.test(file) || file === DICTIONARY) continue
  const source = readFileSync(file, 'utf8')
  const pattern = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g

  for (const match of source.matchAll(pattern)) {
    const text = (match[1] ?? match[2]).replace(/\\(['"\\])/g, '$1')
    if (!keys.has(text)) missing.push({ file: relative(ROOT, file), text })
  }
}

if (missing.length === 0) {
  console.log(`All ${keys.size} dictionary entries are used, and every t() string is translated.`)
} else {
  console.log(`${missing.length} English-only string(s):\n`)
  for (const { file, text } of missing) console.log(`${file}\n  ${text}`)
  process.exitCode = 1
}
