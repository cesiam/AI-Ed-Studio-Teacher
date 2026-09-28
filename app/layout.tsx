import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

// One geometric family, as in the visuals: weight carries the hierarchy
// (800 headlines, 700 titles, 600 labels and buttons, 400 reading text).
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Building Bridges — Talk with parents, not past them',
  description:
    'Building Bridges helps teachers raise concerns, have hard conversations, and connect with parents and students about chronic absence, missed work, and classroom behavior.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0106' },
  ],
  colorScheme: 'light dark',
}

// Applies the saved theme before first paint so dark mode doesn't flash light.
const themeScript = `try{if(localStorage.getItem('bb-theme')==='dark'){var r=document.documentElement;r.dataset.theme='dark';r.classList.add('dark')}}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
