'use client'

import { TeacherSidebar } from '@/components/layout/TeacherSidebar'
import { TeacherHeader } from '@/components/layout/TeacherHeader'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-parchment">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col">
        <TeacherHeader />
        <main className="flex-1 px-4 py-6 md:p-6">{children}</main>
      </div>
    </div>
  )
}
