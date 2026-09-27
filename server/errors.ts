import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg)
export const notFound = (msg: string) => new HttpError(404, msg)
export const conflict = (msg: string) => new HttpError(409, msg)

/** Wraps a route handler so thrown errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (err) {
      return errorResponse(err)
    }
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return NextResponse.json(
      { error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.' },
      { status: 502 },
    )
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: 'The AI service is rate limiting requests. Wait a moment and try again.' },
      { status: 503 },
    )
  }
  if (err instanceof Anthropic.APIError) {
    console.error('[anthropic]', err.status, err.message)
    // Pass the API's own explanation through (e.g. "Your credit balance is too low...").
    const detail = (err.error as { error?: { message?: string } } | undefined)?.error?.message
    return NextResponse.json(
      { error: `The AI service returned an error (${err.status ?? 'network'}): ${detail ?? 'Try again.'}` },
      { status: 502 },
    )
  }
  console.error(err)
  return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch {
    // fall through
  }
  throw badRequest('Request body must be a JSON object.')
}
