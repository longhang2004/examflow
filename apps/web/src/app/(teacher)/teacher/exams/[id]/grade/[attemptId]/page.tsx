'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'

interface GradeEntry {
  pointEarned: number
  feedback: string
  isCorrect?: boolean
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  ESSAY: 'Essay',
}

function renderStudentAnswer(answer: any, question: any) {
  if (answer == null) return <span className="text-stone italic">No answer provided</span>

  const config = question?.config as any

  switch (question?.type) {
    case 'MULTIPLE_CHOICE': {
      const selectedOption = config?.options?.find((o: any) => o.id === answer)
      return <span>{selectedOption?.text ?? answer}</span>
    }
    case 'MULTIPLE_SELECT': {
      if (!Array.isArray(answer)) return <span>{String(answer)}</span>
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {answer.map((a: string) => {
            const opt = config?.options?.find((o: any) => o.id === a)
            return <li key={a}>{opt?.text ?? a}</li>
          })}
        </ul>
      )
    }
    case 'TRUE_FALSE':
      return <span>{String(answer)}</span>
    case 'FILL_BLANK':
    case 'ESSAY':
      return <p className="whitespace-pre-wrap">{String(answer)}</p>
    default:
      return <span>{JSON.stringify(answer)}</span>
  }
}

function renderCorrectAnswer(question: any) {
  const config = question?.config as any
  if (!config) return null

  switch (question?.type) {
    case 'MULTIPLE_CHOICE': {
      const correct = config.options?.find((o: any) => o.id === config.correctAnswer)
      return <span>{correct?.text ?? config.correctAnswer}</span>
    }
    case 'MULTIPLE_SELECT': {
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {(config.correctAnswers ?? []).map((a: string) => {
            const opt = config.options?.find((o: any) => o.id === a)
            return <li key={a}>{opt?.text ?? a}</li>
          })}
        </ul>
      )
    }
    case 'TRUE_FALSE':
      return <span>{String(config.correctAnswer)}</span>
    case 'FILL_BLANK':
      return <span>{(config.correctAnswers ?? []).join(', ')}</span>
    case 'ESSAY':
      return config.rubric
        ? <p className="whitespace-pre-wrap text-stone">{config.rubric}</p>
        : <span className="text-stone italic">No rubric provided</span>
    default:
      return null
  }
}

export default function GradeAttemptPage() {
  const { id: examId, attemptId } = useParams<{ id: string; attemptId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ['attempt-review', attemptId],
    queryFn: () => api.get<any>(`/attempts/${attemptId}/review`),
  })

  const [grades, setGrades] = useState<Record<string, GradeEntry>>({})

  const questions = useMemo(() => {
    if (!attempt?.exam?.questions) return []
    return attempt.exam.questions
  }, [attempt])

  const answers = useMemo(() => {
    if (!attempt?.answers) return []
    return attempt.answers as any[]
  }, [attempt])

  const needsManualGrading = useMemo(() => {
    return answers.filter((a: any) => a.isCorrect === null || a.pointEarned === null)
  }, [answers])

  const gradeMutation = useMutation({
    mutationFn: (gradePayload: any) =>
      api.patch<any>(`/attempts/${attemptId}/grade`, gradePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt-review', attemptId] })
      queryClient.invalidateQueries({ queryKey: ['exam-results', examId] })
      router.push(`/teacher/exams/${examId}/results`)
    },
  })

  function updateGrade(questionId: string, field: keyof GradeEntry, value: any) {
    setGrades((prev) => {
      const existing = prev[questionId] ?? { pointEarned: 0, feedback: '' }
      return {
        ...prev,
        [questionId]: { ...existing, [field]: value },
      }
    })
  }

  function handleSubmitGrades() {
    const gradeEntries = Object.entries(grades)
      .filter(([, g]) => g.pointEarned !== undefined)
      .map(([questionId, g]) => ({
        questionId,
        pointEarned: g.pointEarned,
        feedback: g.feedback || undefined,
        isCorrect: g.isCorrect,
      }))

    if (gradeEntries.length === 0) return

    gradeMutation.mutate({ grades: gradeEntries })
  }

  if (isLoading) return <p className="text-stone">Loading attempt...</p>
  if (error) return <p className="text-error">Failed to load attempt.</p>
  if (!attempt) return <p className="text-stone">Attempt not found.</p>

  const student = attempt.user
  const exam = attempt.exam

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/teacher/exams/${examId}/results`)}
            className="text-sm text-olive hover:text-terracotta mb-2 inline-flex items-center gap-1"
          >
            &larr; Back to Results
          </button>
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">Grade Submission</h1>
          <p className="text-stone mt-1">
            {student?.displayName} &mdash; {exam?.title}
          </p>
        </div>
        <div className="text-right space-y-1">
          <Badge variant={statusBadge(attempt.status)}>{attempt.status}</Badge>
          <p className="text-sm text-stone">
            Score: {attempt.totalScore ?? 0} / {attempt.maxScore}
          </p>
          {attempt.submittedAt && (
            <p className="text-xs text-stone">
              Submitted: {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {needsManualGrading.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-comfortable p-4 text-sm text-amber-800">
          {needsManualGrading.length} answer{needsManualGrading.length > 1 ? 's' : ''} need{needsManualGrading.length === 1 ? 's' : ''} manual grading (essay or unscored).
        </div>
      )}

      <div className="space-y-4">
        {questions.map((eq: any, idx: number) => {
          const question = eq.question
          const answerEntry = answers.find((a: any) => a.questionId === eq.questionId)
          const isAutoGraded = answerEntry && answerEntry.isCorrect !== null && answerEntry.pointEarned !== null
          const needsGrade = answerEntry && (answerEntry.isCorrect === null || answerEntry.pointEarned === null)

          return (
            <Card key={eq.questionId} variant="bordered" padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium bg-sand text-charcoal px-2 py-0.5 rounded">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs text-stone">
                      {QUESTION_TYPE_LABELS[question.type] ?? question.type}
                    </span>
                    <span className="text-xs text-stone">
                      ({eq.point} pt{eq.point !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <p className="text-charcoal font-medium">{question.content}</p>
                </div>
                <div className="shrink-0">
                  {isAutoGraded && (
                    <Badge variant={answerEntry.isCorrect ? 'success' : 'error'}>
                      {answerEntry.pointEarned}/{eq.point}
                    </Badge>
                  )}
                  {needsGrade && !grades[eq.questionId] && (
                    <Badge variant="warning">Needs grading</Badge>
                  )}
                  {grades[eq.questionId] && (
                    <Badge variant="info">
                      {grades[eq.questionId].pointEarned}/{eq.point}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-stone mb-1">Student&apos;s Answer</p>
                  <div className="bg-parchment border border-border-cream rounded p-3 text-sm text-charcoal min-h-[2.5rem]">
                    {renderStudentAnswer(answerEntry?.answer, question)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone mb-1">
                    {question.type === 'ESSAY' ? 'Rubric / Guidelines' : 'Correct Answer'}
                  </p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-charcoal min-h-[2.5rem]">
                    {renderCorrectAnswer(question)}
                  </div>
                </div>
              </div>

              {answerEntry?.feedback && !grades[eq.questionId] && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                  <p className="text-xs font-medium text-blue-700 mb-1">Previous Feedback</p>
                  <p className="text-blue-800">{answerEntry.feedback}</p>
                </div>
              )}

              {(needsGrade || question.type === 'ESSAY') && (
                <div className="border-t border-border-cream pt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <label className="block text-xs font-medium text-charcoal mb-1">
                        Points ({eq.point} max)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={eq.point}
                        step={0.5}
                        value={grades[eq.questionId]?.pointEarned ?? answerEntry?.pointEarned ?? ''}
                        onChange={(e) => {
                          const val = Math.min(eq.point, Math.max(0, parseFloat(e.target.value) || 0))
                          updateGrade(eq.questionId, 'pointEarned', val)
                        }}
                        className="w-full px-3 py-2 text-sm bg-ivory border border-border-cream rounded focus:outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
                      />
                    </div>
                    <div className="flex gap-2 pt-5">
                      <button
                        type="button"
                        onClick={() => updateGrade(eq.questionId, 'pointEarned', eq.point)}
                        className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                      >
                        Full marks
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGrade(eq.questionId, 'pointEarned', Math.round(eq.point / 2 * 10) / 10)}
                        className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      >
                        Half
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGrade(eq.questionId, 'pointEarned', 0)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      >
                        Zero
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Feedback (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={grades[eq.questionId]?.feedback ?? answerEntry?.feedback ?? ''}
                      onChange={(e) => updateGrade(eq.questionId, 'feedback', e.target.value)}
                      placeholder="Write feedback for the student..."
                      className="w-full px-3 py-2 text-sm bg-ivory border border-border-cream rounded focus:outline-none focus:border-focus focus:ring-2 focus:ring-focus/20 resize-none"
                    />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {(needsManualGrading.length > 0 || questions.some((eq: any) => eq.question.type === 'ESSAY')) && (
        <div className="sticky bottom-0 bg-parchment/95 backdrop-blur-sm border-t border-border-cream py-4 -mx-6 px-6 flex items-center justify-between">
          <div className="text-sm text-stone">
            {Object.keys(grades).length} answer{Object.keys(grades).length !== 1 ? 's' : ''} scored
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(`/teacher/exams/${examId}/results`)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGrades}
              loading={gradeMutation.isPending}
              disabled={Object.keys(grades).length === 0}
            >
              Save Grades
            </Button>
          </div>
        </div>
      )}

      {needsManualGrading.length === 0 && !questions.some((eq: any) => eq.question.type === 'ESSAY') && (
        <Card variant="bordered" padding="md">
          <p className="text-center text-olive text-sm">
            All answers have been auto-graded. No manual grading needed.
          </p>
        </Card>
      )}
    </div>
  )
}
