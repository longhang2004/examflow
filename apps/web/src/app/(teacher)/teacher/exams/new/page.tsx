'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

const schema = z.object({
  title: z.string().min(3, 'At least 3 characters'),
  description: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
  maxAttempts: z.coerce.number().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResultAfter: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

export default function NewExamPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false, showResultAfter: true },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<any>('/exams', {
        title: data.title,
        description: data.description,
        config: {
          duration: data.duration || null,
          maxAttempts: data.maxAttempts,
          shuffleQuestions: data.shuffleQuestions,
          shuffleOptions: data.shuffleOptions,
          showResultAfter: data.showResultAfter,
        },
      }),
    onSuccess: (exam) => router.push(`/teacher/exams/${exam.id}`),
    onError: (e: any) => setError(e?.response?.data?.error?.message ?? 'Failed to create exam'),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="max-w-2xl space-y-6">
      <PageHeader
        title="Create Exam"
        description="Set the exam rules first. You can add questions or generate them with AI on the next screen."
      />

      {error && <Alert type="error" message={error} />}

      <Card className="space-y-5">
        <Input label="Title" placeholder="Midterm Physics Quiz" error={errors.title?.message} {...register('title')} />

        <div>
          <label className="text-sm font-medium text-charcoal">Description (optional)</label>
          <textarea
            className="mt-1 w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta min-h-20"
            placeholder="Short note for students..."
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Duration (minutes, 0 = unlimited)" type="number" placeholder="30" {...register('duration')} />
          <Input label="Max Attempts" type="number" min="1" max="10" {...register('maxAttempts')} />
        </div>

        <div className="grid gap-2">
          {[
            { name: 'shuffleQuestions', label: 'Shuffle questions', description: 'Students see questions in different order.' },
            { name: 'shuffleOptions', label: 'Shuffle answer options', description: 'Objective answer options are randomized.' },
            { name: 'showResultAfter', label: 'Show result after submission', description: 'Students can review score and answers immediately.' },
          ].map(({ name, label, description }) => (
            <label key={name} className="flex items-start gap-3 rounded-comfortable border border-border-cream p-3 text-sm">
              <input type="checkbox" className="mt-1" {...register(name as any)} />
              <span>
                <span className="block font-medium text-charcoal">{label}</span>
                <span className="text-xs text-stone">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={mutation.isPending}>Create Exam</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
