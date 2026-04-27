'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CircleDot,
  FileText,
  Plus,
  SquareCheckBig,
  TextCursorInput,
  ToggleLeft,
  X,
  type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { QuestionType } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { ImageUploadButton } from '@/components/ui/ImageUploadButton'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { TagSelector, type TagOption } from '@/components/ui/TagSelector'

const TYPES: { value: QuestionType; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'One correct answer', icon: CircleDot },
  { value: 'MULTIPLE_SELECT', label: 'Multiple Select', description: 'Several correct answers', icon: SquareCheckBig },
  { value: 'TRUE_FALSE', label: 'True / False', description: 'Binary answer check', icon: ToggleLeft },
  { value: 'FILL_BLANK', label: 'Fill in the Blank', description: 'Accept one or more text answers', icon: TextCursorInput },
  { value: 'ESSAY', label: 'Essay', description: 'Long answer with rubric', icon: FileText },
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
  const [questionImageUrl, setQuestionImageUrl] = useState<string | undefined>()
  const [mcOptions, setMcOptions] = useState<Array<{ id: string; text: string; imageUrl?: string }>>([
    { id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' },
  ])
  const [mcCorrect, setMcCorrect] = useState('a')
  const [msCorrects, setMsCorrects] = useState<string[]>([])
  const [tfAnswer, setTfAnswer] = useState(true)
  const [fillAnswers, setFillAnswers] = useState([''])
  const [fillCaseSensitive, setFillCaseSensitive] = useState(false)
  const [essayRubric, setEssayRubric] = useState([''])
  const [essayMaxWords, setEssayMaxWords] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { content: '', explanation: '', difficulty: 1, isPublic: false },
  })

  const content = watch('content')
  const explanation = watch('explanation')

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/questions', data),
    onSuccess: () => router.push('/teacher/questions'),
    onError: (e: any) => setError(e?.response?.data?.error?.message ?? 'Failed to create'),
  })

  const { data: availableTags = [] } = useQuery({
    queryKey: ['question-tags'],
    queryFn: () => api.get<TagOption[]>('/questions/meta/tags'),
  })

  const buildConfig = (explanation?: string) => {
    const exp = explanation || undefined
    if (selectedType === 'MULTIPLE_CHOICE') {
      return { options: mcOptions, correctAnswer: mcCorrect, explanation: exp, imageUrl: questionImageUrl }
    }
    if (selectedType === 'MULTIPLE_SELECT') {
      return { options: mcOptions, correctAnswers: msCorrects, explanation: exp, imageUrl: questionImageUrl }
    }
    if (selectedType === 'TRUE_FALSE') {
      return { correctAnswer: tfAnswer, explanation: exp, imageUrl: questionImageUrl }
    }
    if (selectedType === 'FILL_BLANK') {
      return { correctAnswers: fillAnswers.filter(Boolean), caseSensitive: fillCaseSensitive, explanation: exp, imageUrl: questionImageUrl }
    }
    if (selectedType === 'ESSAY') {
      return { rubric: essayRubric.filter(Boolean), maxWords: essayMaxWords ? Number(essayMaxWords) : undefined, explanation: exp, imageUrl: questionImageUrl }
    }
    return {}
  }

  const onSubmit = (data: FormData) => {
    if (!selectedType) return
    mutation.mutate({
      type: selectedType,
      content: data.content,
      config: buildConfig(data.explanation),
      tags: selectedTags,
      difficulty: data.difficulty,
      isPublic: data.isPublic,
    })
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Question"
          description="Choose the answer model first. You can add formatted text and images in the next step."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => { setSelectedType(t.value); setStep(2) }}
              className="group flex min-h-32 flex-col items-start gap-3 rounded-comfortable border border-border-cream bg-ivory p-5 text-left shadow-sm transition hover:border-terracotta hover:bg-terracotta/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-comfortable bg-sand text-stone transition group-hover:bg-terracotta/10 group-hover:text-terracotta">
                <t.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-nearblack">{t.label}</span>
                <span className="mt-1 block text-xs text-stone">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
      <PageHeader
        title="Create Question"
        description={TYPES.find((type) => type.value === selectedType)?.label}
        actions={(
          <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4" />
            Change type
          </Button>
        )}
      />

      {error && <Alert type="error" message={error} />}

      <Card className="space-y-6">
        <RichTextEditor
          label="Question Content"
          value={content ?? ''}
          onChange={(value) => setValue('content', value, { shouldValidate: true })}
          placeholder="Enter your question. Supports **bold**, _italic_, `code`, and line breaks."
          error={errors.content?.message}
          imageUrl={questionImageUrl}
          onImageChange={setQuestionImageUrl}
        />

      {(selectedType === 'MULTIPLE_CHOICE' || selectedType === 'MULTIPLE_SELECT') && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">Options</p>
          {mcOptions.map((opt, i) => (
            <div key={opt.id} className="flex flex-col gap-2 rounded-comfortable border border-border-cream bg-sand/20 p-3 sm:flex-row sm:items-center">
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
                className="min-w-0 flex-1 rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus/20"
                value={opt.text}
                onChange={(e) => setMcOptions(mcOptions.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                placeholder={`Option ${opt.id.toUpperCase()} (Markdown supported)`}
              />
              <ImageUploadButton
                imageUrl={opt.imageUrl}
                onChange={(url) => setMcOptions(mcOptions.map((o, j) => j === i ? { ...o, imageUrl: url } : o))}
              />
              {mcOptions.length > 2 && (
                <button
                  type="button"
                  aria-label={`Remove option ${opt.id.toUpperCase()}`}
                  onClick={() => setMcOptions(mcOptions.filter((_, j) => j !== i))}
                  className="rounded-subtle p-1.5 text-stone hover:bg-sand hover:text-error"
                >
                  <X className="h-4 w-4" />
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
        <div className="grid gap-2 sm:grid-cols-2">
          {[true, false].map((val) => (
            <label key={String(val)} className={`flex cursor-pointer items-center gap-2 rounded-comfortable border p-3 ${tfAnswer === val ? 'border-terracotta bg-terracotta/5' : 'border-border-cream'}`}>
              <input type="radio" checked={tfAnswer === val} onChange={() => setTfAnswer(val)} className="sr-only" />
              <span className="font-medium">{val ? 'True' : 'False'}</span>
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
                className="min-w-0 flex-1 rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm"
                value={ans}
                onChange={(e) => setFillAnswers(fillAnswers.map((a, j) => j === i ? e.target.value : a))}
              />
              {fillAnswers.length > 1 && (
                <button type="button" aria-label="Remove answer" onClick={() => setFillAnswers(fillAnswers.filter((_, j) => j !== i))} className="rounded-subtle p-1.5 text-stone hover:bg-sand hover:text-error">
                  <X className="h-4 w-4" />
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
                  className="min-w-0 flex-1 rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm"
                  value={r}
                  onChange={(e) => setEssayRubric(essayRubric.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="Rubric item..."
                />
                {essayRubric.length > 1 && (
                  <button type="button" aria-label="Remove criteria" onClick={() => setEssayRubric(essayRubric.filter((_, j) => j !== i))} className="rounded-subtle p-1.5 text-stone hover:bg-sand hover:text-error">
                    <X className="h-4 w-4" />
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

        <RichTextEditor
          label="Explanation (optional)"
          value={explanation ?? ''}
          onChange={(value) => setValue('explanation', value)}
          placeholder="Explain the correct answer. Markdown supported."
          minHeightClassName="min-h-16"
        />
      </Card>

      <Card className="space-y-5">
        <TagSelector
          label="Tags"
          selected={selectedTags}
          available={availableTags}
          onChange={setSelectedTags}
          placeholder="Add or choose tags..."
        />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <label className="text-sm font-medium text-charcoal">Difficulty</label>
          <select
            className="mt-1 border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
            {...register('difficulty')}
          >
            <option value="1">Easy</option>
            <option value="2">Medium</option>
            <option value="3">Hard</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <input type="checkbox" {...register('isPublic')} />
          Make public
        </label>
      </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="submit" loading={mutation.isPending}>Save Question</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </Card>
    </form>
  )
}
