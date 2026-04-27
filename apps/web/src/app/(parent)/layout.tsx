'use client'

import { ParentHeader } from '@/components/layout/ParentHeader'

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment">
      <ParentHeader />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
