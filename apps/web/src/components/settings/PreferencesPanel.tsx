'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n'
import { useSettingsStore, type AppLanguage, type ThemeMode } from '@/store/settings.store'

const themeOptions: Array<{ value: ThemeMode; icon: typeof Sun }> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

const languageOptions: Array<{ value: AppLanguage; label: string; detail: string }> = [
  { value: 'en', label: 'English', detail: 'EN' },
  { value: 'vi', label: 'Tiếng Việt', detail: 'VI' },
]

export function PreferencesPanel() {
  const { t } = useI18n()
  const {
    theme,
    language,
    compactMode,
    reduceMotion,
    setTheme,
    setLanguage,
    setCompactMode,
    setReduceMotion,
  } = useSettingsStore()

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-nearblack">{t('common', 'preferences')}</h2>
        <p className="mt-1 text-sm text-stone">{t('settings', 'description')}</p>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">{t('common', 'appearance')}</h3>
          <p className="mt-1 text-xs text-stone">{t('settings', 'appearanceDescription')}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {themeOptions.map(({ value, icon: Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 rounded-comfortable border px-3 py-2 text-sm font-medium transition ${
                  active ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border-cream text-stone hover:bg-sand hover:text-charcoal'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t('common', value)}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">{t('common', 'language')}</h3>
          <p className="mt-1 text-xs text-stone">{t('settings', 'languageDescription')}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {languageOptions.map((option) => {
            const active = language === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={`flex items-center justify-between rounded-comfortable border px-3 py-2 text-sm font-medium transition ${
                  active ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border-cream text-stone hover:bg-sand hover:text-charcoal'
                }`}
              >
                <span>{option.label}</span>
                <span className="text-xs">{option.detail}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-comfortable border border-border-cream px-3 py-2">
          <span>
            <span className="block text-sm font-medium text-charcoal">{t('common', 'compactMode')}</span>
            <span className="block text-xs text-stone">Reduce spacing density across supported screens.</span>
          </span>
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(event) => setCompactMode(event.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-comfortable border border-border-cream px-3 py-2">
          <span>
            <span className="block text-sm font-medium text-charcoal">{t('common', 'reduceMotion')}</span>
            <span className="block text-xs text-stone">Minimize transitions and animations.</span>
          </span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => setReduceMotion(event.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
        </label>
      </section>
    </Card>
  )
}
