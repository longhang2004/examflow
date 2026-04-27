'use client'

import { QueryProvider } from './QueryProvider'
import { SettingsProvider } from './SettingsProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <QueryProvider>{children}</QueryProvider>
    </SettingsProvider>
  )
}
