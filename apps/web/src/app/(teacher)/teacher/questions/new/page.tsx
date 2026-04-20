'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { QuestionType } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

const TYPES: { value: QuestionType; label: string; emoji: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', emoji: '🔘' },
  { value: 'MULTIPLE_SELECT', label: 'Multiple Select', emoji: '☑️' },
  { value: 'TRUE_FALSE', label: 'True / False', emoji: '✅' },
  { value: 'FILL_BLANK', label: 'Fill in the Blank', emoji: '📝' },
  { value: 'ESSAY', label: 'Essay', emoji: '📄' },
]

const schema = z.object({
  content: z.string().min(10, 'At least 10 characters'),
  tags: z.string().optional(),
  difficulty: z.coerce.number().min(1).max(3),
  isPublic: z.boolean(),
  explanation: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewQuestionPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null)
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { difficulty: 1, isPublic: false },
  })

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/questions', data),
    onSuccess: () => router.push('/teacher/questions'),
    onError: (e: any) => setError(e?.response?.data?.error?.message ?? 'Failed to create'),
  })

  const buildConfig = (explanation?: string) => {
    const exp = explanation || undefined
    if (selectedType === 'MULTIPLE_CHOICE') {
      return { options: mcOptions, correctAnswer: mcCorrect, explanation: exp }
    }
    if (selectedType === 'MULTIPLE_SELECT') {
      return { options: mcOptions, correctAnswers: msCorrects, explanation: exp }
    }
    if (selectedType === 'TRUE_FALSE') {
      return { correctAnswer: tfAnswer, explanation: exp }
    }
    if (selectedType === 'FILL_BLANK') {
      return { correctAnswers: fillAnswers.filter(Boolean), caseSensitive: fillCaseSensitive, explanation: exp }
    }
    if (selectedType === 'ESSAY') {
      return { rubric: essayRubric.filter(Boolean), maxWords: essayMaxWords ? Number(essayMaxWords) : undefined, explanation: exp }
    }
    return {}
  }

  const onSubmit = (data: FormData) => {
    if (!selectedType) return
    mutation.mutate({
      type: selectedType,
      content: data.content,
      config: buildConfig(data.explanation),
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      difficulty: data.difficulty,
      isPublic: data.isPublic,
    })
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-sans font-semibold tracking-tight">Create Question</h1>
        <p className="text-olive">Step 1: Choose question type</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSelectedType(t.value); setStep(2) }}
              className="flex flex-col items-center gap-3 p-6 border-2 border-border-cream rounded-comfortable hover:border-terracotta hover:bg-terracotta/5 transition"
            >
              <span className="text-3xl">{t.emoji}</span>
              <span className="font-medium text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-sans font-semibold tracking-tight">Create Question</h1>
        <button type="button" onClick={() => setStep(1)} className="text-sm text-terracotta hover:underline">
          ← Change type
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      <div>
        <label className="text-sm font-medium text-charcoal">Question Content</label>
        <textarea
          className="mt-1 w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta min-h-24"
          placeholder="Enter your question..."
          {...register('content')}
        />
        {errors.content && <p className="text-xs text-error">{errors.content.message}</p>}
      </div>

      {(selectedType === 'MULTIPLE_CHOICE' || selectedType === 'MULTIPLE_SELECT') && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">Options</p>
          {mcOptions.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              {selectedType === 'MULTIPLE_CHOICE' ? (
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
                onChange={(e) => setMcOptions(mcOptions.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                placeholder={`Option ${opt.id.toUpperCase()}`}
              />
              {mcOptions.length > 2 && (
                <button type="button" onClick={() => setMcOptions(mcOptions.filter((_, j) => j !== i))}>
                  <X className="w-4 h-4 text-stone" />
                </button>
              )}
            </div>
          ))}
          {mcOptions.length < 6 && (
            <button type="button" onClick={() => {
              const id = String.fromCharCode(97 + mcOptions.length)
              setMcOptions([...mcOptions, { id, text: '' }])
            }} className="text-sm text-terracotta hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add option
            </button>
          )}
        </div>
      )}

      {selectedType === 'TRUE_FALSE' && (
        <div className="flex gap-4">
          {[true, false].map((val) => (
            <label key={String(val)} className={`flex items-center gap-2 p-3 border-2 rounded-comfortable cursor-pointer ${tfAnswer === val ? 'border-terracotta bg-terracotta/5' : 'border-border-cream'}`}>
              <input type="radio" checked={tfAnswer === val} onChange={() => setTfAnswer(val)} className="sr-only" />
              <span className="font-medium">{val ? '✅ True' : '❌ False'}</span>
            </label>
          ))}
        </div>
      )}

      {selectedType === 'FILL_BLANK' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">Accepted Answers</p>
          {fillAnswers.map((ans, i) => (
            <div key={i} className="flex gap-2">
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

      {selectedType === 'ESSAY' && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-charcoal mb-2">Rubric Criteria</p>
            {essayRubric.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2">
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
        <label className="text-sm font-medium text-charcoal">Explanation (optional)</label>
        <textarea
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
          <label className="text-sm font-medium text-charcoal">Difficulty</label>
          <select
            className="mt-1 border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
            {...register('difficulty')}
          >
            <option value="1">⭐ Easy</option>
            <option value="2">⭐⭐ Medium</option>
            <option value="3">⭐⭐⭐ Hard</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-charcoal mt-5">
          <input type="checkbox" {...register('isPublic')} />
          Make public
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={mutation.isPending}>Save Question</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
