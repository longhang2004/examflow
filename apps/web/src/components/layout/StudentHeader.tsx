'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { User } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function StudentHeader() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { t } = useI18n()
  const links = [
    { href: '/dashboard', label: t('common', 'home') },
    { href: '/learning', label: t('common', 'myLearning') },
    { href: '/review', label: t('common', 'review') },
    { href: '/history', label: t('common', 'history') },
    { href: '/settings', label: t('common', 'settings') },
  ]

  return (
    <header className="bg-ivory border-b border-border-cream px-4 py-3 md:px-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <Link href="/dashboard" className="text-lg font-sans font-semibold tracking-tight text-nearblack">
          ExamFlow
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
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
      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sand flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-olive" />
          </div>
          <span className="text-sm font-medium text-charcoal">{user?.displayName}</span>
        </div>
      </div>
    </header>
  )
}
