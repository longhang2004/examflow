'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart2,
  Settings,
  UserRound,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/store/auth.store'

export function TeacherSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { t } = useI18n()
  const links = [
    { href: '/teacher/dashboard', label: t('common', 'dashboard'), icon: LayoutDashboard },
    { href: '/teacher/questions', label: t('common', 'questionBank'), icon: BookOpen },
    { href: '/teacher/exams', label: t('common', 'exams'), icon: FileText },
    { href: '/teacher/analytics', label: t('common', 'analytics'), icon: BarChart2 },
  ]
  const settingsActive = pathname.startsWith('/teacher/settings')

  return (
    <aside className="hidden w-64 bg-ivory border-r border-border-cream min-h-screen flex-col md:flex">
      <div className="p-5 border-b border-border-cream">
        <h1 className="text-xl font-sans font-semibold tracking-tight text-nearblack">ExamFlow</h1>
        <p className="text-xs text-stone mt-0.5">Teacher Portal</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-comfortable text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-terracotta/10 text-terracotta'
                  : 'text-olive hover:bg-sand hover:text-charcoal'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border-cream p-3">
        <Link
          href="/teacher/settings"
          className={`flex items-center gap-3 rounded-comfortable px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
            settingsActive
              ? 'bg-terracotta/10 text-terracotta'
              : 'text-olive hover:bg-sand hover:text-charcoal'
          }`}
        >
          <Settings className="h-4 w-4" />
          {t('common', 'settings')}
        </Link>
        <div className="mt-3 flex min-w-0 items-center gap-3 rounded-comfortable bg-sand/60 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory text-stone ring-1 ring-inset ring-border-cream">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{user?.displayName}</p>
            <p className="truncate text-xs text-stone">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
