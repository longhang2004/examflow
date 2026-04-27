'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useExamStore } from '@/store/exam.store'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useTabSwitch } from '@/hooks/useTabSwitch'
import { useExamTimer } from '@/hooks/useExamTimer'
import { FullscreenOverlay } from '@/components/exam/FullscreenOverlay'
import { ExamWarningToast } from '@/components/exam/ExamWarningToast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

function QuestionDisplay({ question, answer, onChange }: { question: any; answer: any; onChange: (v: any) => void }) {
  const config = question.config ?? {}

  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <div className="space-y-2">
        {config.options?.map((opt: any) => (
          <label key={opt.id} className={`flex items-center gap-3 p-3 border-2 rounded-comfortable cursor-pointer transition ${answer === opt.id ? 'border-terracotta bg-terracotta/5' : 'border-border-cream hover:border-ring-warm'}`}>
            <input type="radio" name="mc" value={opt.id} checked={answer === opt.id} onChange={() => onChange(opt.id)} className="sr-only" />
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answer === opt.id ? 'border-terracotta bg-terracotta' : 'border-border-warm'}`}>
              {answer === opt.id && <span className="w-2 h-2 bg-ivory rounded-full" />}
            </span>
            <span className="font-medium text-stone text-sm">{opt.id.toUpperCase()}.</span>
            <span className="text-sm">{opt.text}</span>
          </label>
        ))}
      </div>
    )
  }

  if (question.type === 'MULTIPLE_SELECT') {
    const selected: string[] = Array.isArray(answer) ? answer : []
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone mb-2">Select all correct answers</p>
        {config.options?.map((opt: any) => {
          const checked = selected.includes(opt.id)
          return (
            <label key={opt.id} className={`flex items-center gap-3 p-3 border-2 rounded-comfortable cursor-pointer transition ${checked ? 'border-terracotta bg-terracotta/5' : 'border-border-cream hover:border-ring-warm'}`}>
              <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked ? [...selected, opt.id] : selected.filter((x) => x !== opt.id))} className="sr-only" />
              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'border-terracotta bg-terracotta' : 'border-border-warm'}`}>
                {checked && <span className="text-white text-xs">✓</span>}
              </span>
              <span className="font-medium text-stone text-sm">{opt.id.toUpperCase()}.</span>
              <span className="text-sm">{opt.text}</span>
            </label>
          )
        })}
      </div>
    )
  }

  if (question.type === 'TRUE_FALSE') {
    return (
      <div className="flex gap-4">
        {[true, false].map((val) => (
          <label key={String(val)} className={`flex-1 flex items-center justify-center p-4 border-2 rounded-comfortable cursor-pointer transition ${answer === val ? 'border-terracotta bg-terracotta/5' : 'border-border-cream hover:border-ring-warm'}`}>
            <input type="radio" checked={answer === val} onChange={() => onChange(val)} className="sr-only" />
            <span className="font-medium">{val ? '✅ True' : '❌ False'}</span>
          </label>
        ))}
      </div>
    )
  }

  if (question.type === 'FILL_BLANK') {
    return (
      <input
        type="text"
        value={answer ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your answer..."
        className="w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
      />
    )
  }

  if (question.type === 'ESSAY') {
    const maxWords = config.maxWords
    const wordCount = String(answer ?? '').split(/\s+/).filter(Boolean).length
    return (
      <div>
        <textarea
          value={answer ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer..."
          className="w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta min-h-40"
        />
        {maxWords && (
          <p className={`text-xs mt-1 ${wordCount > maxWords ? 'text-error' : 'text-stone'}`}>
            {wordCount}/{maxWords} words
          </p>
        )}
      </div>
    )
  }

  return null
}

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const timeSpentRef = useRef<Record<string, number>>({})
  const questionStartTime = useRef(Date.now())

  const { attempt, questions, currentIndex, answers, viewedQuestions, setAttempt, setQuestions, setCurrentIndex, saveAnswer: storeAnswer, markViewed, reset } = useExamStore()

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => api.get<any>(`/attempts/${id}`),
    enabled: !attempt || questions.length === 0,
    retry: 2,
  })

  useEffect(() => {
    if (data && !attempt) {
      setAttempt(data)
    }
  }, [data, attempt, setAttempt])

  useEffect(() => {
    if (!data || questions.length > 0) return

    const examQuestions = data.questions ?? data.exam?.questions
    if (!examQuestions?.length) return

    const mapped = examQuestions.map((eq: any) => ({
      ...eq.question,
      config: eq.question.config ?? {},
    }))
    setQuestions(mapped)
  }, [data, questions.length, setQuestions])

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      markViewed(questions[currentIndex].id)
      questionStartTime.current = Date.now()
    }
  }, [currentIndex, questions, markViewed])

  // --- Anti-cheat Hooks ---
  const handleAutoSubmit = useCallback(() => {
    reset()
    router.push(`/attempts/${id}/result?reason=autosubmit`)
  }, [id, reset, router])

  const handleTimerExpire = useCallback(async () => {
    try {
      await api.post(`/attempts/${id}/submit`)
    } catch {}
    reset()
    router.push(`/attempts/${id}/result?reason=autosubmit`)
  }, [id, reset, router])

  const { isFullscreen, requestFullscreen, exitCount } = useFullscreen(id)
  const { switchCount, lastWarning, autoSubmitted } = useTabSwitch(id, handleAutoSubmit)

  const config = (attempt?.exam?.config as any) ?? {}
  const { remainingSeconds, isExpired, formatted } = useExamTimer(
    id,
    !!config.duration,
    handleTimerExpire,
  )

  // --- Answer Handling ---
  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    storeAnswer(questionId, value)
    setSavedStatus('saving')

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const elapsed = (Date.now() - questionStartTime.current) / 1000
        timeSpentRef.current[questionId] = (timeSpentRef.current[questionId] ?? 0) + elapsed
        await api.put(`/attempts/${id}/answers`, {
          questionId,
          answer: value,
          timeSpent: Math.round(timeSpentRef.current[questionId]),
        })
        setSavedStatus('saved')
      } catch {
        setSavedStatus('error')
      }
    }, 1000)
  }, [id, storeAnswer])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      await api.post(`/attempts/${id}/submit`)
      reset()
      router.push(`/attempts/${id}/result`)
    } catch {
      setSubmitting(false)
    }
  }, [id, reset, router])

  // --- Render States ---
  if (fetchError) {
    return (
      <div className="fixed inset-0 z-40 bg-parchment flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-error mx-auto" />
          <h2 className="text-lg font-bold text-nearblack">Failed to load exam</h2>
          <p className="text-sm text-stone">Could not connect to the server. Please check your connection and try again.</p>
          <Button onClick={() => globalThis.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (isLoading || !attempt || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-40 bg-parchment flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone text-sm">Loading exam questions...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length
  const unansweredCount = questions.length - answeredCount
  const isLowTime = remainingSeconds !== null && remainingSeconds < 300

  return (
    <div className="fixed inset-0 z-40 bg-parchment flex flex-col overflow-hidden">
      {/* Fullscreen Overlay */}
      {!isFullscreen && attempt.status === 'IN_PROGRESS' && (
        <FullscreenOverlay
          exitCount={exitCount}
          onRequestFullscreen={requestFullscreen}
        />
      )}

      {/* Warning Toast */}
      <ExamWarningToast warning={lastWarning} tabSwitchCount={switchCount} />

      {/* Header */}
      <header className="shrink-0 bg-ivory border-b border-border-cream px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-terracotta">ExamFlow</span>
          <span className="text-stone text-sm">{attempt.exam?.title ?? 'Exam'}</span>
        </div>
        <div className="flex items-center gap-4">
          {switchCount > 0 && (
            <span className="text-xs text-error font-medium px-2 py-0.5 bg-red-50 rounded">
              {switchCount} tab violation{switchCount > 1 ? 's' : ''}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded ${savedStatus === 'saved' ? 'text-green-600' : savedStatus === 'saving' ? 'text-amber-600' : 'text-error'}`}>
            {savedStatus === 'saved' ? 'Saved' : savedStatus === 'saving' ? 'Saving...' : 'Save error'}
          </span>
          {config.duration && (
            <div className={`font-mono text-lg font-bold ${isLowTime ? 'text-error animate-pulse' : 'text-charcoal'}`}>
              {formatted}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {currentQuestion && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-stone">Question {currentIndex + 1} of {questions.length}</span>
                </div>
                <h2 className="text-nearblack font-medium mb-6 text-base leading-relaxed">{currentQuestion.content}</h2>
                <QuestionDisplay
                  question={currentQuestion}
                  answer={currentAnswer}
                  onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
                />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-ivory px-6 py-3 flex justify-between">
            <Button variant="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
              ← Previous
            </Button>
            <Button variant="secondary" disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next →
            </Button>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="shrink-0 w-64 bg-ivory border-l border-border-cream p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-stone uppercase mb-2">Questions</h3>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((q, i) => {
                const answered = answers[q.id] !== undefined
                const viewed = viewedQuestions.has(q.id)
                const active = i === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-8 h-8 rounded text-xs font-medium border-2 transition ${
                      active ? 'border-terracotta' : 'border-transparent'
                    } ${
                      answered ? 'bg-green-500 text-white' : viewed ? 'bg-yellow-400 text-white' : 'bg-sand text-olive'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 space-y-1 text-xs text-stone">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Viewed</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-sand inline-block" /> Not visited</div>
            </div>
          </div>

          <Button className="mt-auto" onClick={() => setShowSubmitModal(true)}>Submit Exam</Button>
        </aside>
      </div>

      {/* Submit Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Exam">
        <div className="space-y-4">
          {unansweredCount > 0 && (
            <p className="text-sm text-olive">
              You have <strong>{unansweredCount}</strong> unanswered question(s). Are you sure you want to submit?
            </p>
          )}
          {unansweredCount === 0 && <p className="text-sm text-olive">All questions answered. Ready to submit?</p>}
          <div className="flex gap-3">
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">Confirm Submit</Button>
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)} className="flex-1">Continue</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
