import { documentHtml } from '@/server/content/documents'
import type { DocLetter } from '@/server/content/types'
import { getScenario } from '@/server/db/scenarios'
import { getSession, getSessionScenario } from '@/server/db/sessions'
import { handle, notFound } from '@/server/errors'
import { visibleDocs } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serves one document as HTML, but only if the teacher can see it in this
 * session: A-D always, E/F once delivered or shared. Keeps surprises secret.
 */
export const GET = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string; idx: string; letter: string }> }) => {
    const { id, idx, letter } = await ctx.params
    const session = getSession(id)
    const row = getSessionScenario(session.id, Number(idx))
    const scenario = getScenario(row.scenario_id)
    if (!visibleDocs(row, scenario).includes(letter as DocLetter)) throw notFound('Document not available.')

    const html = await documentHtml(scenario.documents[letter as DocLetter]!)
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Documents are content, not app code: no scripts, no navigation.
        'content-security-policy': "sandbox; script-src 'none'",
        'cache-control': 'no-store',
      },
    })
  },
)
