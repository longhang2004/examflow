'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Flame, Target } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { HelpHint } from '@/components/guide/HelpHint'

interface StudentDetail {
  student: { id: string; displayName: string; email: string; avatarUrl?: string | null }
  recentAttempts: Array<{
    attemptId: string
    examTitle: string
    score: number | null
    maxScore: number | null
    percentage: number | null
    submittedAt: string | null
  }>
  weeklyProgress: Array<{ date: string; attemptsCount: number; averageScore: number }>
  reviewStats: { dueToday: number; streakDays: number }
  weakTopics: string[]
}

export default function ParentStudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-student', id],
    queryFn: () => api.get<StudentDetail>(`/parent/students/${id}`),
  })

  if (isLoading) {
    return <p className="text-stone p-6">Loading student progress...</p>
  }

  if (error || !data) {
    return (
      <Card>
        <p className="text-center text-error py-8">Could not load this student.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Link href="/parent/dashboard" className="inline-flex items-center gap-1 text-sm text-terracotta hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">
            {data.student.displayName}
          </h1>
          <HelpHint guideKey="parent-student" />
        </div>
        <p className="text-olive mt-1 text-sm">{data.student.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CalendarDays className="w-5 h-5 text-terracotta mb-2" />
          <p className="text-2xl font-bold text-nearblack">
            {data.weeklyProgress.reduce((sum, day) => sum + day.attemptsCount, 0)}
          </p>
          <p className="text-xs text-stone">Attempts this week</p>
        </Card>
        <Card>
          <Target className="w-5 h-5 text-olive mb-2" />
          <p className="text-2xl font-bold text-nearblack">{data.reviewStats.dueToday}</p>
          <p className="text-xs text-stone">Review cards due</p>
        </Card>
        <Card>
          <Flame className="w-5 h-5 text-terracotta mb-2" />
          <p className="text-2xl font-bold text-nearblack">{data.reviewStats.streakDays}</p>
          <p className="text-xs text-stone">Review streak</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack mb-4">
          Weekly progress
        </h2>
        <div className="grid grid-cols-7 gap-2 items-end h-36">
          {data.weeklyProgress.map((day) => (
            <div key={day.date} className="flex flex-col items-center justify-end gap-2 h-full">
              <div
                className="w-full rounded-t bg-terracotta/80 min-h-1"
                style={{ height: `${Math.max(4, Math.min(100, day.averageScore || day.attemptsCount * 20))}%` }}
                title={`${day.attemptsCount} attempts, ${Math.round(day.averageScore)}% avg`}
              />
              <span className="text-[10px] text-stone">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack mb-4">
            Recent attempts
          </h2>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-stone">No submitted attempts yet.</p>
          ) : (
            <ul className="divide-y divide-border-cream">
              {data.recentAttempts.map((attempt) => (
                <li key={attempt.attemptId} className="py-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal truncate">{attempt.examTitle}</p>
                    <p className="text-xs text-stone mt-0.5">
                      {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'No date'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-nearblack shrink-0">
                    {attempt.percentage ?? 0}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack mb-4">
            Weak topics
          </h2>
          {data.weakTopics.length === 0 ? (
            <p className="text-sm text-stone">No weak topics detected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.weakTopics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-900 border border-amber-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
