import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'
import { MODEL } from '../config'
import { HttpError } from '../errors'

let client: Anthropic | null = null

function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError(
      500,
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local, add your key, and restart the server.',
    )
  }
  // Keys that aren't scoped to a workspace must name one on every request.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID
  client ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: workspace ? { 'anthropic-workspace-id': workspace } : undefined,
  })
  return client
}

type Effort = 'low' | 'medium' | 'high'

interface CallOptions {
  /** Stable per scenario, so it is marked for prompt caching. */
  system: string
  messages: Anthropic.MessageParam[]
  effort?: Effort
  maxTokens?: number
}

const systemBlocks = (system: string): Anthropic.TextBlockParam[] => [
  { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
]

/** In-character dialogue. Returns plain text. */
export async function speak({ system, messages, effort = 'low', maxTokens = 2000 }: CallOptions): Promise<string> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemBlocks(system),
    output_config: { effort },
    messages,
  })
  if (res.stop_reason === 'refusal') return '*pauses and looks away* ...Sorry. Can you say that another way?'
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  return text || '*nods slowly*'
}

/** A JSON answer validated against a zod schema (structured outputs). */
export async function decide<S extends z.ZodType>(
  schema: S,
  { system, messages, effort = 'low', maxTokens = 4000 }: CallOptions,
): Promise<z.infer<S>> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemBlocks(system),
    output_config: { effort, format: zodOutputFormat(schema) },
    messages,
  })
  if (res.stop_reason === 'refusal' || res.parsed_output == null) {
    throw new HttpError(502, 'The AI returned an unusable answer. Try again.')
  }
  return res.parsed_output as z.infer<S>
}
