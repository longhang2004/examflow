'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settings.store'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme, language, compactMode, reduceMotion } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = () => {
      const resolvedTheme =
        theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme

      root.dataset.theme = resolvedTheme
      root.style.colorScheme = resolvedTheme
    }

    applyTheme()
    root.lang = language
    root.dataset.compact = compactMode ? 'true' : 'false'
    root.dataset.reduceMotion = reduceMotion ? 'true' : 'false'

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    if (theme !== 'system') return

    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme, language, compactMode, reduceMotion])

  return <>{children}</>
}
