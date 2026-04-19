'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function AttemptResultPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: attempt, isLoading } = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => api.get<any>(`/attempts/${id}`),
  })

  if (isLoading) return <p className="text-stone p-8">Loading results...</p>
  if (!attempt) return null

  const percent = attempt.maxScore ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0
  const config = attempt.exam?.config as any ?? {}
  const answers = attempt.answers as any[] ?? []
  const correctCount = answers.filter((a) => a.isCorrect === true).length
  const wrongCount = answers.filter((a) => a.isCorrect === false).length
  const skippedCount = answers.filter((a) => a.isCorrect === undefined || a.answer === null || a.answer === undefined).length

  const duration = attempt.submittedAt && attempt.startedAt
    ? Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="text-center">
        <h1 className="text-xl font-bold text-charcoal mb-4">Exam Results</h1>

        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={percent >= 60 ? '#16A34A' : '#DC2626'}
              strokeWidth="12"
              strokeDasharray={`${(percent / 100) * 314} 314`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-charcoal">{percent}%</span>
            <span className="text-xs text-stone">{attempt.totalScore}/{attempt.maxScore}</span>
          </div>
        </div>

        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Correct: {correctCount}</span>
          </div>
          <div className="flex items-center gap-1 text-error">
            <XCircle className="w-4 h-4" />
            <span>Wrong: {wrongCount}</span>
          </div>
          {duration && (
            <div className="flex items-center gap-1 text-stone">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(duration / 60)}m {duration % 60}s</span>
            </div>
          )}
        </div>
      </Card>

      {config.showResultAfter && answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-charcoal">Answer Review</h2>
          {answers.map((a: any, i: number) => (
            <Card key={a.questionId} padding="sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {a.isCorrect === true ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : a.isCorrect === false ? (
                    <XCircle className="w-5 h-5 text-error" />
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal mb-2">Question {i + 1}</p>
                  <p className="text-sm text-olive mb-2">Your answer: <strong>{String(a.answer ?? 'No answer')}</strong></p>
                  {a.isCorrect === false && a.correctAnswer && (
                    <p className="text-sm text-green-700">Correct: <strong>{String(a.correctAnswer)}</strong></p>
                  )}
                  {a.explanation && (
                    <p className="text-xs text-stone mt-2 italic">{a.explanation}</p>
                  )}
                  {a.pointEarned !== null && a.pointEarned !== undefined && (
                    <p className="text-xs text-stone mt-1">{a.pointEarned} pts earned</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    </div>
  )
}
