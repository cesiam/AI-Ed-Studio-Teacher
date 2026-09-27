import { NextResponse } from 'next/server'
import { badRequest, handle, HttpError } from '@/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024

/** Teacher's spoken line → text, via ElevenLabs Scribe. Body: multipart with an `audio` file. */
export const POST = handle(async (req: Request) => {
  const key = process.env.ELEVENLABS_API_KEY?.trim()
  if (!key) throw new HttpError(500, 'Speech input needs ELEVENLABS_API_KEY in .env.local.')

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) throw badRequest('No audio was recorded.')
  if (audio.size > MAX_BYTES) throw badRequest('That recording is too long. Try a shorter line.')

  const upstream = new FormData()
  upstream.append('model_id', process.env.ELEVENLABS_STT_MODEL ?? 'scribe_v2')
  upstream.append('language_code', 'en')
  upstream.append('tag_audio_events', 'false')
  upstream.append('file', audio, 'speech.webm')

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: upstream,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[elevenlabs]', res.status, body)
    const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
    throw new HttpError(502, `Speech-to-text failed (${res.status})${detail ? `: ${detail}` : '.'}`)
  }
  return NextResponse.json({ text: String(body.text ?? '').trim() })
})
