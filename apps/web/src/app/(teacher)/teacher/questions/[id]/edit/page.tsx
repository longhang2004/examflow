'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Question, QuestionType, QuestionConfig } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { ImageUploadButton } from '@/components/ui/ImageUploadButton'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'

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
  options: { id: string; text: string; imageUrl?: string }[]
  setOptions: (v: { id: string; text: string; imageUrl?: string }[]) => void
  mcCorrect: string
  setMcCorrect: (v: string) => void
  msCorrects: string[]
  setMsCorrects: (v: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-charcoal">Options</p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex flex-col gap-2 rounded-comfortable border border-border-cream bg-sand/20 p-3 sm:flex-row sm:items-center">
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
            className="min-w-0 flex-1 rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus/20"
            value={opt.text}
            onChange={(e) => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
            placeholder={`Option ${opt.id.toUpperCase()} (Markdown supported)`}
          />
          <ImageUploadButton
            imageUrl={opt.imageUrl}
            onChange={(url) => setOptions(options.map((o, j) => j === i ? { ...o, imageUrl: url } : o))}
          />
          {options.length > 2 && (
            <button
              type="button"
              aria-label={`Remove option ${opt.id.toUpperCase()}`}
              onClick={() => setOptions(options.filter((_, j) => j !== i))}
              className="rounded-subtle p-1.5 text-stone hover:bg-sand hover:text-error"
            >
              <X className="h-4 w-4" />
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

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => api.get<Question>(`/questions/${questionId}`),
  })

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { content: '', explanation: '', difficulty: 1, isPublic: false },
  })

  const content = watch('content')
  const explanation = watch('explanation')

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
    setQuestionImageUrl(cfg.imageUrl)
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
      case 'MULTIPLE_CHOICE': return { options: mcOptions, correctAnswer: mcCorrect, explanation: exp, imageUrl: questionImageUrl }
      case 'MULTIPLE_SELECT': return { options: mcOptions, correctAnswers: msCorrects, explanation: exp, imageUrl: questionImageUrl }
      case 'TRUE_FALSE': return { correctAnswer: tfAnswer, explanation: exp, imageUrl: questionImageUrl }
      case 'FILL_BLANK': return { correctAnswers: fillAnswers.filter(Boolean), caseSensitive: fillCaseSensitive, explanation: exp, imageUrl: questionImageUrl }
      case 'ESSAY': return { rubric: essayRubric.filter(Boolean), maxWords: essayMaxWords ? Number(essayMaxWords) : undefined, explanation: exp, imageUrl: questionImageUrl }
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
    return <LoadingState label="Loading question..." />
  }

  if (!question) {
    return <Alert type="error" message="Question not found" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
      <PageHeader
        title="Edit Question"
        description={`Type: ${TYPE_LABELS[question.type]}`}
        actions={(
          <Button type="button" variant="secondary" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
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
        <div className="grid gap-2 sm:grid-cols-2">
          {[true, false].map((val) => (
            <label key={String(val)} className={`flex cursor-pointer items-center gap-2 rounded-comfortable border p-3 ${tfAnswer === val ? 'border-terracotta bg-terracotta/5' : 'border-border-cream'}`}>
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

      {question.type === 'ESSAY' && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-charcoal mb-2">Rubric Criteria</p>
            {essayRubric.map((r, i) => (
              <div key={`rubric-${i}`} className="flex gap-2 mb-2">
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
        <Input
          label="Tags (comma-separated)"
          placeholder="math, algebra, calculus"
          {...register('tags')}
        />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </Card>
    </form>
  )
}
