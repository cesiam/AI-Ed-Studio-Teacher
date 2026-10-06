import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Outfit, Space_Grotesk } from 'next/font/google'
import './globals.css'

// Outfit carries reading text, labels and buttons (600 labels/buttons, 400 text).
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

// Space Grotesk for the wordmark and every headline; Outfit for reading text, labels and buttons.
const wordmark = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-wordmark',
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
    <html lang="en" className={`${outfit.variable} ${wordmark.variable}`} suppressHydrationWarning>
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
