'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, RotateCcw, PlayCircle, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

function formatStudentAnswer(answer: unknown, question: { type?: string; config?: unknown } | null) {
  if (answer == null || answer === '') {
    return <span className="text-stone italic">No answer</span>
  }
  const config = question?.config as Record<string, unknown> | undefined

  switch (question?.type) {
    case 'MULTIPLE_CHOICE': {
      const opts = (config?.options as Array<{ id: string; text: string }>) ?? []
      const opt = opts.find((o) => o.id === answer)
      return <span>{opt?.text ?? String(answer)}</span>
    }
    case 'MULTIPLE_SELECT': {
      const arr = Array.isArray(answer) ? answer : []
      const opts = (config?.options as Array<{ id: string; text: string }>) ?? []
      return (
        <ul className="list-disc list-inside space-y-0.5 text-sm">
          {arr.map((id) => {
            const opt = opts.find((o) => o.id === id)
            return <li key={String(id)}>{opt?.text ?? String(id)}</li>
          })}
        </ul>
      )
    }
    case 'TRUE_FALSE':
      return <span>{String(answer)}</span>
    case 'FILL_BLANK':
    case 'ESSAY':
      return <p className="whitespace-pre-wrap text-sm">{String(answer)}</p>
    default:
      return <span className="text-sm">{JSON.stringify(answer)}</span>
  }
}

function formatCorrectAnswer(question: { type?: string; config?: unknown } | null) {
  if (!question?.config) return null
  const config = question.config as Record<string, unknown>

  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      const opts = (config.options as Array<{ id: string; text: string }>) ?? []
      const id = config.correctAnswer as string
      const opt = opts.find((o) => o.id === id)
      return <span>{opt?.text ?? id}</span>
    }
    case 'MULTIPLE_SELECT': {
      const ids = (config.correctAnswers as string[]) ?? []
      const opts = (config.options as Array<{ id: string; text: string }>) ?? []
      return (
        <ul className="list-disc list-inside space-y-0.5 text-sm">
          {ids.map((id) => {
            const opt = opts.find((o) => o.id === id)
            return <li key={id}>{opt?.text ?? id}</li>
          })}
        </ul>
      )
    }
    case 'TRUE_FALSE':
      return <span>{String(config.correctAnswer)}</span>
    case 'FILL_BLANK':
      return <span>{(config.correctAnswers as string[])?.join(', ') ?? ''}</span>
    case 'ESSAY':
      return config.rubric ? (
        <p className="text-sm text-stone whitespace-pre-wrap">{String(config.rubric)}</p>
      ) : (
        <span className="text-stone italic text-sm">Rubric not set</span>
      )
    default:
      return null
  }
}

export default function AttemptResultPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSubmitReason = searchParams.get('reason')

  const { data: attempt, isLoading } = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => api.get<any>(`/attempts/${id}`),
  })

  const examId = attempt?.examId ?? attempt?.exam?.id

  const { data: examAttempts } = useQuery({
    queryKey: ['attempts', 'by-exam', examId],
    queryFn: () => api.get<any[]>(`/attempts`, { examId }),
    enabled: Boolean(examId),
  })

  if (isLoading) return <p className="text-stone p-8">Loading results...</p>
  if (!attempt) return null

  const percent = attempt.maxScore ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0
  const config = attempt.exam?.config as Record<string, unknown> | undefined ?? {}
  const showReview = Boolean(config.showResultAfter)
  const answers = (attempt.answers as any[]) ?? []

  const examQuestions = (attempt.exam?.questions as any[]) ?? []
  const byQuestionId = Object.fromEntries(
    examQuestions.map((eq: any) => [eq.questionId, eq]),
  )

  const correctCount = answers.filter((a) => a.isCorrect === true).length
  const wrongCount = answers.filter((a) => a.isCorrect === false).length
  const pendingGrading = answers.filter(
    (a) => a.isCorrect === null && (a.pointEarned === null || a.pointEarned === undefined),
  ).length
  const skippedCount = answers.filter((a) => {
    const eq = byQuestionId[a.questionId]
    const qType = eq?.question?.type
    if (qType === 'ESSAY' && a.isCorrect === null) return false
    const ans = a.answer
    return (
      ans === null ||
      ans === undefined ||
      ans === '' ||
      (Array.isArray(ans) && ans.length === 0)
    )
  }).length

  const duration =
    attempt.submittedAt && attempt.startedAt
      ? Math.floor(
          (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000,
        )
      : null

  const maxAttempts = (config.maxAttempts as number) ?? 1
  const list = (examAttempts as any[]) ?? []
  const inProgress = list.find((a) => a.status === 'IN_PROGRESS')
  const completedCount = list.filter((a) => a.status !== 'IN_PROGRESS').length
  const examStatus = attempt.exam?.status as string | undefined
  const accessCode = attempt.exam?.accessCode as string | undefined
  const canRetake =
    !inProgress &&
    completedCount < maxAttempts &&
    examStatus === 'PUBLISHED' &&
    Boolean(accessCode)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Auto-submit banner */}
      {autoSubmitReason === 'autosubmit' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            Bài thi đã được nộp tự động do hết giờ hoặc vi phạm quy định thi.
          </p>
        </div>
      )}

      <Card className="text-center">
        <h1 className="text-xl font-bold text-charcoal mb-4">Exam results</h1>

        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={percent >= 60 ? '#16A34A' : '#DC2626'}
              strokeWidth="12"
              strokeDasharray={`${(percent / 100) * 314} 314`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-charcoal">{percent}%</span>
            <span className="text-xs text-stone">
              {attempt.totalScore ?? 0}/{attempt.maxScore ?? 0}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Correct: {correctCount}</span>
          </div>
          <div className="flex items-center gap-1 text-error">
            <XCircle className="w-4 h-4" />
            <span>Wrong: {wrongCount}</span>
          </div>
          {skippedCount > 0 && (
            <div className="flex items-center gap-1 text-stone">
              <span>Skipped: {skippedCount}</span>
            </div>
          )}
          {pendingGrading > 0 && (
            <div className="flex items-center gap-1 text-amber-700">
              <Badge variant="warning">Awaiting grading: {pendingGrading}</Badge>
            </div>
          )}
          {duration !== null && (
            <div className="flex items-center gap-1 text-stone">
              <Clock className="w-4 h-4" />
              <span>
                {Math.floor(duration / 60)}m {duration % 60}s
              </span>
            </div>
          )}
        </div>
      </Card>

      {showReview && answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-charcoal">Answer review</h2>
          {answers.map((a: any, i: number) => {
            const eq = byQuestionId[a.questionId]
            const question = eq?.question
            const qType = question?.type as string | undefined
            const isPendingEssay =
              qType === 'ESSAY' && a.isCorrect === null && (a.pointEarned === null || a.pointEarned === undefined)

            return (
              <Card key={a.questionId} padding="sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isPendingEssay ? (
                      <Badge variant="warning">Pending teacher grading</Badge>
                    ) : a.isCorrect === true ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : a.isCorrect === false ? (
                      <XCircle className="w-5 h-5 text-error" />
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone mb-1">Question {i + 1}</p>
                    <p className="text-sm font-medium text-charcoal mb-2">
                      {question?.content ?? 'Question'}
                    </p>
                    <div className="text-sm text-olive mb-2">
                      <span className="text-stone">Your answer: </span>
                      {formatStudentAnswer(a.answer, question ?? null)}
                    </div>
                    {a.isCorrect === false && qType !== 'ESSAY' && (
                      <div className="text-sm text-green-800 bg-emerald-50 border border-emerald-100 rounded p-2 mb-2">
                        <span className="text-stone text-xs block mb-1">Correct answer</span>
                        {formatCorrectAnswer(question ?? null)}
                      </div>
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
            )
          })}
        </div>
      )}

      {!showReview && (
        <Card padding="md">
          <p className="text-sm text-stone text-center">
            Your instructor has chosen not to show correct answers for this exam.
          </p>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1" variant="secondary" onClick={() => router.push('/dashboard')}>
          Back to dashboard
        </Button>
        {inProgress && (
          <Button
            className="flex-1"
            onClick={() => router.push(`/attempts/${inProgress.id}`)}
          >
            <PlayCircle className="w-4 h-4" />
            Continue exam
          </Button>
        )}
        {!inProgress && canRetake && (
          <Button className="flex-1" onClick={() => router.push(`/exams/${accessCode}`)}>
            <RotateCcw className="w-4 h-4" />
            Retake ({maxAttempts - completedCount} left)
          </Button>
        )}
      </div>
    </div>
  )
}
