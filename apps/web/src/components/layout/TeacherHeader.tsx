'use client'

import { useAuthStore } from '@/store/auth.store'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, BookOpen, FileText, LayoutDashboard, LogOut, Settings, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function TeacherHeader() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const mobileLinks = [
    { href: '/teacher/dashboard', label: t('common', 'dashboard'), icon: LayoutDashboard },
    { href: '/teacher/questions', label: t('common', 'questions'), icon: BookOpen },
    { href: '/teacher/exams', label: t('common', 'exams'), icon: FileText },
    { href: '/teacher/analytics', label: t('common', 'analytics'), icon: BarChart2 },
    { href: '/teacher/settings', label: t('common', 'settings'), icon: Settings },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="bg-ivory border-b border-border-cream px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/teacher/dashboard" className="text-lg font-semibold text-nearblack md:hidden">
          ExamFlow
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center">
              <User className="w-4 h-4 text-olive" />
            </div>
            <span className="text-sm font-medium text-charcoal">{user?.displayName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-stone hover:text-error transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common', 'logout')}</span>
          </button>
        </div>
      </div>
      <nav className="mt-3 grid grid-cols-5 gap-1 md:hidden">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-comfortable px-2 py-2 text-[11px] font-medium ${
                active ? 'bg-terracotta/10 text-terracotta' : 'text-stone hover:bg-sand'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
