'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart2,
  Settings,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function TeacherSidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const links = [
    { href: '/teacher/dashboard', label: t('common', 'dashboard'), icon: LayoutDashboard },
    { href: '/teacher/questions', label: t('common', 'questionBank'), icon: BookOpen },
    { href: '/teacher/exams', label: t('common', 'exams'), icon: FileText },
    { href: '/teacher/analytics', label: t('common', 'analytics'), icon: BarChart2 },
    { href: '/teacher/settings', label: t('common', 'settings'), icon: Settings },
  ]

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
    </aside>
  )
}
