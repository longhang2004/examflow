'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'

export default function StudentDashboardPage() {
  const { user } = useAuthStore()
  const [code, setCode] = useState('')
  const router = useRouter()

  const { data: attempts } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => api.get<any[]>('/attempts'),
  })

  const handleEnterCode = () => {
    if (code.trim()) router.push(`/exams/${code.trim().toUpperCase()}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif text-nearblack">Welcome, {user?.displayName}!</h1>
        <p className="text-olive mt-1">Ready to take an exam?</p>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="font-serif text-lg text-nearblack mb-4">Enter Exam Code</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. QUIZ01"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleEnterCode()}
            className="flex-1 bg-ivory border border-border-cream rounded-generous px-4 py-2.5 text-sm font-mono uppercase tracking-widest text-nearblack placeholder:text-stone focus:outline-none focus:border-focus focus:ring-2 focus:ring-focus/20 transition-colors"
          />
          <Button onClick={handleEnterCode} disabled={!code.trim()}>
            <Search className="w-4 h-4" />
            Find Exam
          </Button>
        </div>
      </Card>

      {attempts && attempts.length > 0 && (
        <Card variant="bordered">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-nearblack">Recent Attempts</h2>
            <Link href="/history" className="text-sm text-terracotta hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border-cream">
            {(attempts as any[]).slice(0, 5).map((a) => (
              <Link
                key={a.id}
                href={a.status !== 'IN_PROGRESS' ? `/attempts/${a.id}/result` : `/attempts/${a.id}`}
                className="flex items-center justify-between py-3 px-2 hover:bg-sand/50 rounded-comfortable transition-colors duration-150"
              >
                <div>
                  <p className="text-sm font-medium text-charcoal">{a.exam?.title ?? 'Exam'}</p>
                  <p className="text-xs text-stone mt-0.5">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'In progress'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {a.totalScore !== null && a.maxScore ? (
                    <span className="text-sm font-serif font-medium text-nearblack">
                      {a.totalScore}/{a.maxScore}
                    </span>
                  ) : null}
                  <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
