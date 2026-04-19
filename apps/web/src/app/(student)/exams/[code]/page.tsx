'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, BookOpen, Users } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useState } from 'react'

export default function ExamCodePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [error, setError] = useState('')

  const { data: exam, isLoading, error: fetchError } = useQuery({
    queryKey: ['exam-code', code],
    queryFn: () => api.get<any>(`/exams/code/${code}`),
  })

  const startMutation = useMutation({
    mutationFn: () => api.post<any>('/attempts', { examId: exam.id, accessCode: code }),
    onSuccess: (result) => router.push(`/attempts/${result.attempt.id}`),
    onError: (e: any) => setError(e?.response?.data?.error?.message ?? 'Failed to start exam'),
  })

  if (isLoading) return <p className="text-stone">Loading...</p>

  if (fetchError) {
    return (
      <Card>
        <Alert type="error" message="Exam not found. Please check the access code." />
      </Card>
    )
  }

  const config = exam?.config as any
  const now = new Date()
  const notStarted = config?.startAt && new Date(config.startAt) > now
  const ended = config?.endAt && new Date(config.endAt) < now

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-nearblack mb-1">{exam?.title}</h1>
        {exam?.description && <p className="text-stone text-sm mb-4">{exam.description}</p>}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-olive">
            <BookOpen className="w-4 h-4" />
            <span>{exam?._count?.questions ?? 0} questions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-olive">
            <Clock className="w-4 h-4" />
            <span>{config?.duration ? `${config.duration} minutes` : 'Unlimited time'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-olive">
            <Users className="w-4 h-4" />
            <span>Max {config?.maxAttempts ?? 1} attempt(s)</span>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-3" />}

        {notStarted ? (
          <Alert type="warning" message={`This exam starts on ${new Date(config.startAt).toLocaleString()}`} />
        ) : ended ? (
          <Alert type="error" message="This exam has already ended." />
        ) : (
          <Button className="w-full" onClick={() => startMutation.mutate()} loading={startMutation.isPending}>
            Start Exam
          </Button>
        )}
      </Card>
    </div>
  )
}
