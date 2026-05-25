import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Homebase',
  description: 'Co-parenting made simple.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
