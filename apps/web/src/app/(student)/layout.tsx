'use client'

import { StudentHeader } from '@/components/layout/StudentHeader'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment">
      <StudentHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
