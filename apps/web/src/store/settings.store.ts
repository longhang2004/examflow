import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppLanguage = 'en' | 'vi'

interface SettingsStore {
  theme: ThemeMode
  language: AppLanguage
  compactMode: boolean
  reduceMotion: boolean
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: AppLanguage) => void
  setCompactMode: (compactMode: boolean) => void
  setReduceMotion: (reduceMotion: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      compactMode: false,
      reduceMotion: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    {
      name: 'examflow-settings',
    },
  ),
)
