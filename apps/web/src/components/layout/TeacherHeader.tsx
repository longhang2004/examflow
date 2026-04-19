'use client'

import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'

export function TeacherHeader() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="bg-ivory border-b border-border-cream px-6 py-3 flex items-center justify-end gap-4">
      <div className="flex items-center gap-3">
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
        Logout
      </button>
    </header>
  )
}
