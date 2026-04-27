'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { PreferencesPanel } from '@/components/settings/PreferencesPanel'
import { AccountPanel } from '@/components/settings/AccountPanel'
import { useI18n } from '@/lib/i18n'

export default function TeacherSettingsPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('common', 'settings')} description={t('settings', 'description')} />
      <PreferencesPanel />
      <AccountPanel />
    </div>
  )
}
