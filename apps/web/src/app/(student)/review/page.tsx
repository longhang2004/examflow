'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { RichText } from '@/components/ui/RichText'

interface ReviewCard {
  id: string
  questionId: string
  repetitions: number
  interval: number
  question: {
    id: string
    type: string
    content: string
    config: any
    tags: string[]
    difficulty: number
  }
}

interface DueResponse {
  cards: ReviewCard[]
  totalDue: number
  nextDueAt: string | null
}

function renderAnswerInput(question: ReviewCard['question'], answer: any, setAnswer: (value: any) => void) {
  const config = question.config ?? {}

  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <div className="space-y-2">
        {config.options?.map((opt: any) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setAnswer(opt.id)}
            className={`w-full flex items-center gap-3 p-3 text-left border rounded-comfortable transition ${
              answer === opt.id
                ? 'border-terracotta bg-terracotta/5'
                : 'border-border-cream hover:border-ring-warm'
            }`}
          >
            <span className="text-xs font-semibold text-stone">{opt.id.toUpperCase()}.</span>
            <RichText text={opt.text} imageUrl={opt.imageUrl} className="text-sm text-charcoal" />
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'MULTIPLE_SELECT') {
    const selected = Array.isArray(answer) ? answer : []
    return (
      <div className="space-y-2">
        {config.options?.map((opt: any) => {
          const checked = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                setAnswer(checked ? selected.filter((id: string) => id !== opt.id) : [...selected, opt.id])
              }
              className={`w-full flex items-center gap-3 p-3 text-left border rounded-comfortable transition ${
                checked
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-border-cream hover:border-ring-warm'
              }`}
            >
              <span className="text-xs font-semibold text-stone">{opt.id.toUpperCase()}.</span>
              <RichText text={opt.text} imageUrl={opt.imageUrl} className="text-sm text-charcoal" />
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === 'TRUE_FALSE') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setAnswer(value)}
            className={`p-4 border rounded-comfortable text-sm font-medium transition ${
              answer === value
                ? 'border-terracotta bg-terracotta/5 text-terracotta'
                : 'border-border-cream text-charcoal hover:border-ring-warm'
            }`}
          >
            {value ? 'True' : 'False'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <textarea
      value={answer ?? ''}
      onChange={(event) => setAnswer(event.target.value)}
      placeholder="Type your answer..."
      className="w-full min-h-32 border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
    />
  )
}

function renderCorrectAnswer(question: ReviewCard['question']) {
  const config = question.config ?? {}

  if (question.type === 'MULTIPLE_CHOICE') {
    const correct = config.options?.find((opt: any) => opt.id === config.correctAnswer)
    return { text: correct?.text ?? config.correctAnswer, imageUrl: correct?.imageUrl }
  }

  if (question.type === 'MULTIPLE_SELECT') {
    return {
      text: (config.correctAnswers ?? [])
        .map((id: string) => config.options?.find((opt: any) => opt.id === id)?.text ?? id)
        .join(', '),
      imageUrl: undefined,
    }
  }

  if (question.type === 'TRUE_FALSE') {
    return { text: String(config.correctAnswer), imageUrl: undefined }
  }

  if (question.type === 'FILL_BLANK') {
    return { text: (config.correctAnswers ?? []).join(', '), imageUrl: undefined }
  }

  if (question.type === 'ESSAY') {
    return { text: Array.isArray(config.rubric) ? config.rubric.join('\n') : config.rubric, imageUrl: undefined }
  }

  return { text: '', imageUrl: undefined }
}

const RATINGS = [
  { quality: 0, label: 'Forgot' },
  { quality: 2, label: 'Recognized' },
  { quality: 3, label: 'Hard' },
  { quality: 4, label: 'Good' },
  { quality: 5, label: 'Easy' },
]

export default function ReviewPage() {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<any>('')
  const [revealed, setRevealed] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [completed, setCompleted] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['review-due'],
    queryFn: () => api.get<DueResponse>('/review/due', { limit: 20 }),
  })

  const cards = data?.cards ?? []
  const card = cards[index]
  const progressTotal = cards.length
  const correctAnswer = useMemo(
    () => (card ? renderCorrectAnswer(card.question) : { text: '', imageUrl: undefined }),
    [card],
  )

  const submitMutation = useMutation({
    mutationFn: (quality: number) =>
      api.post('/review/submit', {
        questionId: card.questionId,
        quality,
        timeTaken: Date.now() - startedAt,
      }),
    onSuccess: () => {
      setCompleted((value) => value + 1)
      setAnswer('')
      setRevealed(false)
      setStartedAt(Date.now())
      if (index + 1 < cards.length) {
        setIndex((value) => value + 1)
      } else {
        queryClient.invalidateQueries({ queryKey: ['review-due'] })
        queryClient.invalidateQueries({ queryKey: ['review-stats'] })
        setIndex((value) => value + 1)
      }
    },
  })

  if (isLoading) {
    return <p className="text-stone p-6">Loading review cards...</p>
  }

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center" padding="lg">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-nearblack">Review complete</h1>
          <p className="text-sm text-stone mt-2">
            {completed > 0
              ? `You reviewed ${completed} card${completed === 1 ? '' : 's'}.`
              : data?.nextDueAt
                ? `No cards due now. Next review: ${new Date(data.nextDueAt).toLocaleString()}.`
                : 'No review cards are due yet.'}
          </p>
          <Link href="/dashboard" className="inline-flex mt-5">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-terracotta hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-sm text-stone">
          Card {index + 1} / {progressTotal}
        </span>
      </div>

      <div className="h-2 bg-sand rounded-full overflow-hidden">
        <div
          className="h-full bg-terracotta transition-all"
          style={{ width: `${((index + 1) / progressTotal) * 100}%` }}
        />
      </div>

      <Card padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{card.question.type.replaceAll('_', ' ')}</Badge>
          <span className="text-xs text-stone">
            Repetitions: {card.repetitions} · Interval: {card.interval} day{card.interval === 1 ? '' : 's'}
          </span>
        </div>

        <div>
          <p className="text-xs text-stone mb-2">Question</p>
          <RichText
            text={card.question.content}
            imageUrl={card.question.config?.imageUrl}
            className="text-lg font-semibold text-nearblack leading-snug"
          />
        </div>

        {renderAnswerInput(card.question, answer, setAnswer)}

        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Show answer</Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-comfortable p-4">
              <p className="text-xs text-stone mb-1">Correct answer</p>
              <RichText
                text={correctAnswer.text}
                imageUrl={correctAnswer.imageUrl}
                className="text-sm text-emerald-900"
              />
              {card.question.config?.explanation && (
                <RichText text={card.question.config.explanation} className="text-xs text-stone mt-3 italic" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-charcoal mb-2">How well did you remember it?</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {RATINGS.map((rating) => (
                  <Button
                    key={rating.quality}
                    variant={rating.quality >= 4 ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => submitMutation.mutate(rating.quality)}
                    loading={submitMutation.isPending}
                  >
                    {rating.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={() => {
          setAnswer('')
          setRevealed(false)
          setStartedAt(Date.now())
        }}
        className="text-xs text-stone hover:text-charcoal inline-flex items-center gap-1"
      >
        <RotateCcw className="w-3 h-3" />
        Reset current card
      </button>
    </div>
  )
}
