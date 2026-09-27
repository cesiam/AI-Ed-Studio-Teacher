import type { Metadata } from 'next'
import { SessionScreen } from '@/components/practice/session-screen'

export const metadata: Metadata = {
  title: 'Conference — Building Bridges',
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SessionScreen sessionId={id} />
}
