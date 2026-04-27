'use client'

import { QueryProvider } from './QueryProvider'
import { SettingsProvider } from './SettingsProvider'
import { GuideProvider } from '@/components/guide/GuideProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <QueryProvider>
        <GuideProvider>{children}</GuideProvider>
      </QueryProvider>
    </SettingsProvider>
  )
}
