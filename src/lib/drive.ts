/** Helpers for turning Google Drive share links into viewer/download URLs. */

const ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/

export interface DriveLinkResult {
  fileId: string | null
  error?: string
}

/**
 * Extracts a Drive file id from any of the shapes Google produces:
 *  - https://drive.google.com/file/d/<ID>/view?usp=sharing
 *  - https://drive.google.com/open?id=<ID>
 *  - https://drive.google.com/uc?id=<ID>&export=download
 *  - https://drive.google.com/drive/folders/<ID>   (folders are rejected)
 *  - a bare <ID>
 */
export function parseDriveLink(raw: string): DriveLinkResult {
  const input = raw.trim()
  if (!input) return { fileId: null }

  if (/\/drive\/folders\//i.test(input)) {
    return {
      fileId: null,
      error: 'That is a folder link. Open the PDF in Drive, then copy its file link.',
    }
  }

  if (ID_PATTERN.test(input)) return { fileId: input }

  const fromFilePath = input.match(/\/file\/d\/([A-Za-z0-9_-]{10,200})/)
  if (fromFilePath) return { fileId: fromFilePath[1] }

  const fromQuery = input.match(/[?&]id=([A-Za-z0-9_-]{10,200})/)
  if (fromQuery) return { fileId: fromQuery[1] }

  const fromAnyD = input.match(/\/d\/([A-Za-z0-9_-]{10,200})/)
  if (fromAnyD) return { fileId: fromAnyD[1] }

  if (/docs\.google\.com/i.test(input)) {
    return {
      fileId: null,
      error: 'Google Docs links do not work in the Drive PDF viewer. Upload the PDF to Drive instead.',
    }
  }

  return { fileId: null, error: 'Could not find a file id in this link.' }
}

export const driveViewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view`

export const driveDownloadUrl = (fileId: string) =>
  `https://drive.google.com/uc?export=download&id=${fileId}`

/** `Title | link` (title optional). */
export function splitTitleAndLink(line: string): { title: string; link: string } {
  const pipe = line.indexOf('|')
  if (pipe === -1) return { title: '', link: line.trim() }
  return { title: line.slice(0, pipe).trim(), link: line.slice(pipe + 1).trim() }
}

export function parseTagInput(raw: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const piece of raw.split(',')) {
    const tag = piece.trim().replace(/\s+/g, ' ')
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return tags.slice(0, 8)
}
