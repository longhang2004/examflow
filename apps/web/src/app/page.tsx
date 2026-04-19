'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Spinner } from '@/components/ui/Spinner'

export default function Home() {
  const router = useRouter()
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize().then(() => {
      const store = useAuthStore.getState()
      if (store.user) {
        const role = store.user.role
        if (role === 'TEACHER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') {
          router.replace('/teacher/dashboard')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/login')
      }
    })
  }, [router, initialize])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="w-8 h-8 text-blue-600" />
    </div>
  )
}
