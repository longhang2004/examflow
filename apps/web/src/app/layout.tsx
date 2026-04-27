import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/providers/AppProviders'

export const metadata: Metadata = {
  title: 'ExamFlow',
  description: 'Online examination platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
