import { documentAsset } from '@/server/content/documents'
import { handle, notFound } from '@/server/errors'

export const runtime = 'nodejs'

/** Images, fonts, and stylesheets referenced by documents in content/documents/. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path } = await ctx.params
  const asset = await documentAsset(path)
  if (!asset) throw notFound('Asset not found.')
  return new Response(new Uint8Array(asset.body), {
    headers: { 'content-type': asset.type, 'cache-control': 'public, max-age=300' },
  })
})
