'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useI18n } from '@/lib/i18n'

export function ParentHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { t } = useI18n()
  const links = [
    { href: '/parent/dashboard', label: t('common', 'overview') },
    { href: '/parent/settings', label: t('common', 'settings') },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="bg-ivory border-b border-border-cream px-4 py-3 md:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        <Link href="/parent/dashboard" className="text-lg font-sans font-semibold tracking-tight text-nearblack">
          ExamFlow
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-comfortable text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-terracotta/10 text-terracotta'
                    : 'text-olive hover:bg-sand hover:text-charcoal'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sand flex items-center justify-center">
            <UserRound className="w-3.5 h-3.5 text-olive" />
          </div>
          <span className="text-sm font-medium text-charcoal">{user?.displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-stone hover:text-error transition-colors duration-150"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
