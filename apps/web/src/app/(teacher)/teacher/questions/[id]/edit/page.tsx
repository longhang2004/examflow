'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Question, QuestionType, QuestionConfig } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  ESSAY: 'Essay',
}

const schema = z.object({
  content: z.string().min(10, 'At least 10 characters'),
  tags: z.string().optional(),
  difficulty: z.coerce.number().min(1).max(3),
  isPublic: z.boolean(),
  explanation: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function OptionsEditor({
  type,
  options,
  setOptions,
  mcCorrect,
  setMcCorrect,
  msCorrects,
  setMsCorrects,
}: {
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT'
  options: { id: string; text: string }[]
  setOptions: (v: { id: string; text: string }[]) => void
  mcCorrect: string
  setMcCorrect: (v: string) => void
  msCorrects: string[]
  setMsCorrects: (v: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-charcoal">Options</p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          {type === 'MULTIPLE_CHOICE' ? (
            <input type="radio" name="mcCorrect" value={opt.id} checked={mcCorrect === opt.id}
              onChange={() => setMcCorrect(opt.id)} className="shrink-0" />
          ) : (
            <input type="checkbox" checked={msCorrects.includes(opt.id)}
              onChange={(e) => {
                setMsCorrects(e.target.checked
                  ? [...msCorrects, opt.id]
                  : msCorrects.filter((x) => x !== opt.id))
              }} className="shrink-0" />
          )}
          <span className="font-medium text-sm w-5 text-stone">{opt.id.toUpperCase()}.</span>
          <input
            className="flex-1 border border-border-warm rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-terracotta"
            value={opt.text}
            onChange={(e) => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
            placeholder={`Option ${opt.id.toUpperCase()}`}
          />
          {options.length > 2 && (
            <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
              <X className="w-4 h-4 text-stone" />
            </button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button type="button" onClick={() => {
          const id = String.fromCodePoint(97 + options.length)
          setOptions([...options, { id, text: '' }])
        }} className="text-sm text-terracotta hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add option
        </button>
      )}
    </div>
  )
}

export default function EditQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const questionId = params.id as string
  const queryClient = useQueryClient()

  const [error, setError] = useState('')
  const [mcOptions, setMcOptions] = useState([
    { id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' },
  ])
  const [mcCorrect, setMcCorrect] = useState('a')
  const [msCorrects, setMsCorrects] = useState<string[]>([])
  const [tfAnswer, setTfAnswer] = useState(true)
  const [fillAnswers, setFillAnswers] = useState([''])
  const [fillCaseSensitive, setFillCaseSensitive] = useState(false)
  const [essayRubric, setEssayRubric] = useState([''])
  const [essayMaxWords, setEssayMaxWords] = useState('')

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => api.get<Question>(`/questions/${questionId}`),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { difficulty: 1, isPublic: false },
  })

  const populateConfig = useCallback((type: QuestionType, cfg: QuestionConfig) => {
    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT') {
      if (cfg.options?.length) setMcOptions(cfg.options)
      if (type === 'MULTIPLE_CHOICE' && typeof cfg.correctAnswer === 'string') setMcCorrect(cfg.correctAnswer)
      if (type === 'MULTIPLE_SELECT' && cfg.correctAnswers) setMsCorrects(cfg.correctAnswers)
    } else if (type === 'TRUE_FALSE' && typeof cfg.correctAnswer === 'boolean') {
      setTfAnswer(cfg.correctAnswer)
    } else if (type === 'FILL_BLANK') {
      if (cfg.correctAnswers?.length) setFillAnswers(cfg.correctAnswers)
      setFillCaseSensitive(cfg.caseSensitive ?? false)
    } else if (type === 'ESSAY') {
      if (cfg.rubric?.length) setEssayRubric(cfg.rubric)
      if (cfg.maxWords) setEssayMaxWords(String(cfg.maxWords))
    }
  }, [])

  useEffect(() => {
    if (!question) return
    reset({
      content: question.content,
      tags: question.tags.join(', '),
      difficulty: question.difficulty,
      isPublic: question.isPublic,
      explanation: question.config.explanation ?? '',
    })
    populateConfig(question.type, question.config)
  }, [question, reset, populateConfig])

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/questions/${questionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      router.push('/teacher/questions')
    },
    onError: (e: any) => setError(e?.response?.data?.error?.message ?? 'Failed to update'),
  })

  const buildConfig = (explanation?: string) => {
    if (!question) return {}
    const exp = explanation || undefined
    switch (question.type) {
      case 'MULTIPLE_CHOICE': return { options: mcOptions, correctAnswer: mcCorrect, explanation: exp }
      case 'MULTIPLE_SELECT': return { options: mcOptions, correctAnswers: msCorrects, explanation: exp }
      case 'TRUE_FALSE': return { correctAnswer: tfAnswer, explanation: exp }
      case 'FILL_BLANK': return { correctAnswers: fillAnswers.filter(Boolean), caseSensitive: fillCaseSensitive, explanation: exp }
      case 'ESSAY': return { rubric: essayRubric.filter(Boolean), maxWords: essayMaxWords ? Number(essayMaxWords) : undefined, explanation: exp }
      default: return {}
    }
  }

  const onSubmit = (data: FormData) => {
    if (!question) return
    mutation.mutate({
      content: data.content,
      config: buildConfig(data.explanation),
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      difficulty: data.difficulty,
      isPublic: data.isPublic,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!question) {
    return <Alert type="error" message="Question not found" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-sans font-semibold tracking-tight">Edit Question</h1>
          <p className="text-sm text-stone mt-1">Type: {TYPE_LABELS[question.type]}</p>
        </div>
        <button type="button" onClick={() => router.back()} className="text-sm text-terracotta hover:underline">
          Back
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      <div>
        <label htmlFor="question-content" className="text-sm font-medium text-charcoal">Question Content</label>
        <textarea
          id="question-content"
          className="mt-1 w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta min-h-24"
          placeholder="Enter your question..."
          {...register('content')}
        />
        {errors.content && <p className="text-xs text-error">{errors.content.message}</p>}
      </div>

      {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && (
        <OptionsEditor
          type={question.type}
          options={mcOptions}
          setOptions={setMcOptions}
          mcCorrect={mcCorrect}
          setMcCorrect={setMcCorrect}
          msCorrects={msCorrects}
          setMsCorrects={setMsCorrects}
        />
      )}

      {question.type === 'TRUE_FALSE' && (
        <div className="flex gap-4">
          {[true, false].map((val) => (
            <label key={String(val)} className={`flex items-center gap-2 p-3 border-2 rounded-comfortable cursor-pointer ${tfAnswer === val ? 'border-terracotta bg-terracotta/5' : 'border-border-cream'}`}>
              <input type="radio" checked={tfAnswer === val} onChange={() => setTfAnswer(val)} className="sr-only" />
              <span className="font-medium">{val ? 'True' : 'False'}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'FILL_BLANK' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">Accepted Answers</p>
          {fillAnswers.map((ans, i) => (
            <div key={`fill-${i}`} className="flex gap-2">
              <input
                className="flex-1 border border-border-warm rounded px-2 py-1 text-sm"
                value={ans}
                onChange={(e) => setFillAnswers(fillAnswers.map((a, j) => j === i ? e.target.value : a))}
              />
              {fillAnswers.length > 1 && (
                <button type="button" onClick={() => setFillAnswers(fillAnswers.filter((_, j) => j !== i))}>
                  <X className="w-4 h-4 text-stone" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setFillAnswers([...fillAnswers, ''])} className="text-sm text-terracotta hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add answer
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fillCaseSensitive} onChange={(e) => setFillCaseSensitive(e.target.checked)} />
            Case sensitive
          </label>
        </div>
      )}

      {question.type === 'ESSAY' && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-charcoal mb-2">Rubric Criteria</p>
            {essayRubric.map((r, i) => (
              <div key={`rubric-${i}`} className="flex gap-2 mb-2">
                <input
                  className="flex-1 border border-border-warm rounded px-2 py-1 text-sm"
                  value={r}
                  onChange={(e) => setEssayRubric(essayRubric.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="Rubric item..."
                />
                {essayRubric.length > 1 && (
                  <button type="button" onClick={() => setEssayRubric(essayRubric.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4 text-stone" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setEssayRubric([...essayRubric, ''])} className="text-sm text-terracotta hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add criteria
            </button>
          </div>
          <Input label="Max Words (optional)" type="number" value={essayMaxWords} onChange={(e) => setEssayMaxWords(e.target.value)} placeholder="e.g. 500" />
        </div>
      )}

      <div>
        <label htmlFor="question-explanation" className="text-sm font-medium text-charcoal">Explanation (optional)</label>
        <textarea
          id="question-explanation"
          className="mt-1 w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta min-h-16"
          placeholder="Explain the correct answer..."
          {...register('explanation')}
        />
      </div>

      <Input
        label="Tags (comma-separated)"
        placeholder="math, algebra, calculus"
        {...register('tags')}
      />

      <div className="flex items-center gap-4">
        <div>
          <label htmlFor="difficulty-select" className="text-sm font-medium text-charcoal">Difficulty</label>
          <select
            id="difficulty-select"
            className="mt-1 border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
            {...register('difficulty')}
          >
            <option value="1">Easy</option>
            <option value="2">Medium</option>
            <option value="3">Hard</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-charcoal mt-5">
          <input type="checkbox" {...register('isPublic')} /> Make public
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
