'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, BookOpen, Target, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { HelpHint } from '@/components/guide/HelpHint'

interface MyStats {
  totalAttempts: number
  completedAttempts: number
  averageScore: number
  weakTopics: string[]
  recentAttempts: Array<{
    attemptId: string
    examTitle: string
    score: number | null
    maxScore: number | null
    submittedAt: string | null
  }>
}

export default function StudentLearningPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['analytics-me'],
    queryFn: () => api.get<MyStats>('/analytics/me'),
  })

  if (isLoading) {
    return <p className="text-stone p-6">Loading your stats...</p>
  }

  if (error || !stats) {
    return (
      <Card>
        <p className="text-center text-error py-8">Could not load learning analytics. Try again later.</p>
      </Card>
    )
  }

  const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '0')

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">My learning</h1>
          <HelpHint guideKey="learning" />
        </div>
        <p className="text-olive mt-1 text-sm">
          Overview of your attempts, scores, and topics to review.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sand rounded-comfortable">
              <BookOpen className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nearblack">{stats.totalAttempts}</p>
              <p className="text-xs text-stone">Completed attempts</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sand rounded-comfortable">
              <TrendingUp className="w-5 h-5 text-olive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nearblack">{pct(stats.averageScore)}%</p>
              <p className="text-xs text-stone">Average score</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sand rounded-comfortable">
              <Target className="w-5 h-5 text-charcoal" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nearblack">{stats.completedAttempts}</p>
              <p className="text-xs text-stone">With submission</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack">Topics to review</h2>
          <HelpHint guideKey="learning" />
        </div>
        {stats.weakTopics.length === 0 ? (
          <p className="text-sm text-stone">
            Tag your questions in exams to see weak topics here (needs at least 2 answers per tag).
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.weakTopics.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-900 border border-amber-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack">Recent attempts</h2>
          <Link href="/history" className="text-sm text-terracotta hover:underline flex items-center gap-1">
            Full history <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.recentAttempts.length === 0 ? (
          <p className="text-sm text-stone text-center py-6">No attempts yet. Enter an exam code from the home page.</p>
        ) : (
          <ul className="divide-y divide-border-cream">
            {stats.recentAttempts.map((a) => {
              const scorePct =
                a.maxScore && a.maxScore > 0 && a.score != null
                  ? Math.round((a.score / a.maxScore) * 100)
                  : null
              return (
                <li key={a.attemptId} className="py-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal truncate">{a.examTitle}</p>
                    <p className="text-xs text-stone mt-0.5">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {scorePct !== null ? (
                      <span className="text-sm font-medium text-nearblack">{scorePct}%</span>
                    ) : null}
                    <Link
                      href={`/attempts/${a.attemptId}/result`}
                      className="text-xs text-terracotta hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
