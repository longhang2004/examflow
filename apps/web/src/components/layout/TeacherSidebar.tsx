'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart2,
} from 'lucide-react'

const links = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teacher/questions', label: 'Question Bank', icon: BookOpen },
  { href: '/teacher/exams', label: 'Exams', icon: FileText },
  { href: '/teacher/analytics', label: 'Analytics', icon: BarChart2 },
]

export function TeacherSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-ivory border-r border-border-cream min-h-screen flex flex-col">
      <div className="p-5 border-b border-border-cream">
        <h1 className="text-xl font-serif text-nearblack">ExamFlow</h1>
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
