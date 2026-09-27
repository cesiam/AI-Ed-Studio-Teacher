import { NextResponse } from 'next/server'
import { generateScenario, importScenarioJson } from '@/server/content/upload'
import { listScenarios } from '@/server/db/scenarios'
import { badRequest, handle, readJson } from '@/server/errors'
import { scenarioSummary } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Scenario list for the setup screen. Titles only; no persona details. */
export const GET = handle(async () => {
  return NextResponse.json({ scenarios: listScenarios().map(scenarioSummary) })
})

/**
 * A teacher adds a scenario. Body, one of:
 *   { json: <scenario or { scenarios: [...] }> }   a file in the seed format
 *   { description: string }                        a write-up Claude turns into a scenario
 */
export const POST = handle(async (req: Request) => {
  const body = await readJson(req)
  let added
  if (body.json !== undefined) added = importScenarioJson(body.json)
  else if (typeof body.description === 'string') added = [await generateScenario(body.description)]
  else throw badRequest('Send either "json" or "description".')
  return NextResponse.json({ scenarios: added.map(scenarioSummary) }, { status: 201 })
})
