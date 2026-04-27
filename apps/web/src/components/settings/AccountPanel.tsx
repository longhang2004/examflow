'use client'

import { LogOut, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/store/auth.store'

export function AccountPanel() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { t } = useI18n()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-nearblack">{t('common', 'account')}</h2>
        <p className="mt-1 text-sm text-stone">{t('common', 'accountDescription')}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-comfortable border border-border-cream bg-sand/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ivory text-stone ring-1 ring-inset ring-border-cream">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-charcoal">{user?.displayName ?? 'User'}</p>
            <p className="truncate text-xs text-stone">{user?.email}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {t('common', 'logout')}
        </Button>
      </div>
    </Card>
  )
}
