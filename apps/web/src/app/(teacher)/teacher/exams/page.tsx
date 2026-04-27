'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Copy, Check, FileText } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Exam } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

export default function ExamsPage() {
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['exams', { status }],
    queryFn: () => api.get<any>('/exams', { status: status || undefined }),
  })

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Draft, publish, and monitor exams from one place."
        actions={
          <Link href="/teacher/exams/new">
            <Button><Plus className="w-4 h-4" />Create Exam</Button>
          </Link>
        }
      />

      <SegmentedControl
        ariaLabel="Filter exams by status"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'All' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'PUBLISHED', label: 'Published' },
          { value: 'ARCHIVED', label: 'Archived' },
        ]}
      />

      {isLoading ? (
        <LoadingState label="Loading exams..." />
      ) : (
        <div className="grid gap-4">
          {data?.data?.map((exam: any) => (
            <Card key={exam.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/teacher/exams/${exam.id}`} className="font-semibold text-charcoal hover:text-terracotta">
                      {exam.title}
                    </Link>
                    <Badge variant={statusBadge(exam.status)}>{exam.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-stone mt-2">
                    <span>{exam._count?.questions ?? 0} questions</span>
                    {(exam.config as any)?.duration && (
                      <span>{(exam.config as any).duration} min</span>
                    )}
                    {exam.accessCode && (
                      <button
                        onClick={() => copyCode(exam.accessCode!)}
                        className="flex items-center gap-1 font-mono text-xs bg-sand px-2 py-0.5 rounded hover:bg-sand"
                      >
                        {copied === exam.accessCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {exam.accessCode}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/teacher/exams/${exam.id}`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                  {exam.status === 'PUBLISHED' && (
                    <Link href={`/teacher/exams/${exam.id}/results`}>
                      <Button variant="ghost" size="sm">Results</Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {data?.data?.length === 0 && (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No exams found"
              description={status ? 'No exams match this status filter.' : 'Create your first exam, then add questions or generate them from a file.'}
              action={
              <Link href="/teacher/exams/new">
                <Button>Create Exam</Button>
              </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
