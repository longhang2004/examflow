'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useExamStore } from '@/store/exam.store'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

function Timer({ duration, startedAt, onExpire }: { duration: number; startedAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
    return Math.max(0, duration * 60 - elapsed)
  })
  const expired = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0 && !expired.current) {
          expired.current = true
          onExpire()
          clearInterval(interval)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire])

  const mins = Math.floor(remaining / 60)
  const secs = Math.floor(remaining % 60)
  const isLow = remaining < 300

  return (
    <div className={`font-mono text-lg font-bold ${isLow ? 'text-error' : 'text-charcoal'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

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

  const { attempt, questions, currentIndex, answers, viewedQuestions, setAttempt, setQuestions, setCurrentIndex, saveAnswer: storeAnswer, markViewed, incrementTabSwitch } = useExamStore()

  const { data, isLoading } = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => api.get<any>(`/attempts/${id}`),
    enabled: !attempt || questions.length === 0,
  })

  useEffect(() => {
    if (data && !attempt) {
      setAttempt(data)
    }
  }, [data, attempt, setAttempt])

  useEffect(() => {
    if (!data?.questions || questions.length > 0) return
    const mapped = data.questions.map((eq: any) => ({
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

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        incrementTabSwitch()
        const count = useExamStore.getState().tabSwitchCount + 1
        alert(`Warning: You left the exam tab! (${count} time${count > 1 ? 's' : ''})`)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const requestFullscreen = () => {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
    requestFullscreen()

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && attempt?.status === 'IN_PROGRESS') {
        alert('Please return to fullscreen mode to continue the exam.')
        requestFullscreen()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [incrementTabSwitch, attempt?.status])

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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post(`/attempts/${id}/submit`)
      router.push(`/attempts/${id}/result`)
    } catch {
      setSubmitting(false)
    }
  }

  if (isLoading || !attempt || questions.length === 0) return <p className="text-stone p-8">Loading...</p>

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length
  const unansweredCount = questions.length - answeredCount
  const config = attempt.exam?.config as any ?? {}

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-ivory border-b border-border-cream px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-terracotta">ExamFlow</span>
          <span className="text-stone text-sm">{attempt.exam?.title ?? 'Exam'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-xs px-2 py-0.5 rounded ${savedStatus === 'saved' ? 'text-green-600' : savedStatus === 'saving' ? 'text-amber-600' : 'text-error'}`}>
            {savedStatus === 'saved' ? 'Saved' : savedStatus === 'saving' ? 'Saving...' : 'Save error'}
          </span>
          {config.duration && <Timer duration={config.duration} startedAt={attempt.startedAt} onExpire={handleSubmit} />}
        </div>
      </header>

      <div className="flex gap-0 h-[calc(100vh-57px)]">
        <main className="flex-1 flex flex-col overflow-hidden">
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

          <div className="border-t bg-ivory px-6 py-3 flex justify-between">
            <Button variant="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
              ← Previous
            </Button>
            <Button variant="secondary" disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next →
            </Button>
          </div>
        </main>

        <aside className="w-64 bg-ivory border-l border-border-cream p-4 flex flex-col gap-4">
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
