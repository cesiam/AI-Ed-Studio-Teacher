import fs from 'node:fs/promises'
import path from 'node:path'
import { paths } from '../config'
import type { DocumentRecord } from './types'

/** Where a document's relative links (images, stylesheets) resolve. */
export const ASSET_BASE = '/api/content/documents/'

const ASSET_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
}

/** Resolves a path inside content/documents, refusing anything that escapes it. */
function safeResolve(relative: string): string | null {
  const full = path.resolve(paths.documents, relative)
  return full.startsWith(paths.documents + path.sep) ? full : null
}

/**
 * Reads a document's HTML and points its relative URLs at the asset route.
 * A missing file renders a placeholder page instead of failing, so scenarios
 * can be played before every document has been written.
 */
export async function documentHtml(doc: DocumentRecord): Promise<string> {
  const full = safeResolve(doc.file)
  let html: string | null = null
  if (full) {
    try {
      html = await fs.readFile(full, 'utf8')
    } catch {
      html = null
    }
  }
  if (html == null) return placeholder(doc)

  const base = `<base href="${ASSET_BASE}">`
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${base}`) : base + html
}

function placeholder(doc: DocumentRecord): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fbfbff;color:#0d0106;display:grid;place-items:center;min-height:100vh}
main{max-width:460px;padding:24px;border:2px dashed #657ed4;border-radius:12px}
code{background:rgba(101,126,212,.15);padding:2px 5px;border-radius:4px}</style></head>
<body><main><h2>${esc(doc.title)}</h2><p>This document hasn't been added yet.</p>
<p>Expected file: <code>content/documents/${esc(doc.file)}</code></p><p>${esc(doc.summary)}</p></main></body></html>`
}

export async function documentAsset(segments: string[]): Promise<{ body: Buffer; type: string } | null> {
  const relative = segments.join('/')
  const type = ASSET_TYPES[path.extname(relative).toLowerCase()]
  if (!type) return null // HTML documents are only served through a session, never directly
  const full = safeResolve(relative)
  if (!full) return null
  try {
    return { body: await fs.readFile(full), type }
  } catch {
    return null
  }
}
