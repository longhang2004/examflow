'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { LogOut, User } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Home' },
  { href: '/learning', label: 'My learning' },
  { href: '/history', label: 'History' },
]

export function StudentHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="bg-ivory border-b border-border-cream px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-lg font-sans font-semibold tracking-tight text-nearblack">
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
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sand flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-olive" />
          </div>
          <span className="text-sm font-medium text-charcoal">{user?.displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-stone hover:text-error transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
