import { z } from 'zod'
import type { Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import { speakers } from './characters'
import { decide } from './client'
import { roomTranscript } from './transcript'

const Agreement = z.object({
  steps: z
    .array(z.string())
    .describe('New next steps both sides clearly accepted, each as "Who: what (when)", e.g. "Leo: keeps the log taped inside his book". Empty if nothing was agreed.'),
})

const SYSTEM = `You read the end of a practice parent-teacher conference and list the concrete next steps the teacher and the family just agreed on.

Count a step only when it is specific (someone does something) and both sides accepted it: one proposed it and the other said yes, okay, that works, or built on it. A vague wish ("we should communicate more") or an idea nobody answered is not agreed. Don't repeat steps that are already on the plan.`

/** After the family answers a proposal: which next steps did everyone just agree to? */
export async function newAgreements(opts: {
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  plan: string[]
}): Promise<string[]> {
  const { scenario, teacherName, events, plan } = opts
  const content = `Already on the plan:
${plan.length ? plan.map((p) => `- ${p}`).join('\n') : '(nothing yet)'}

The latest exchange:
${roomTranscript(events.slice(-6), speakers(scenario, teacherName))}`
  const { steps } = await decide(Agreement, { system: SYSTEM, messages: [{ role: 'user', content }] })
  return steps.map((s) => s.trim()).filter(Boolean).slice(0, 4)
}

/** Everything agreed so far in this conference. */
export function agreedSteps(events: EventRow[]): string[] {
  return events.filter((e) => e.kind === 'agreement').flatMap((e) => (e.meta?.steps as string[] | undefined) ?? [])
}
