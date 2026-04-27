'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { FileText, BookOpen, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function TeacherDashboardPage() {
  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get<any>('/exams'),
  })

  const { data: publishedExams } = useQuery({
    queryKey: ['exams', { status: 'PUBLISHED' }],
    queryFn: () => api.get<any>('/exams', { status: 'PUBLISHED' }),
  })

  const { data: questions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => api.get<any>('/questions'),
  })

  const stats = [
    { label: 'Total Exams', value: exams?.meta?.total ?? 0, icon: FileText, bg: 'bg-terracotta/10', color: 'text-terracotta' },
    { label: 'Questions', value: questions?.meta?.total ?? 0, icon: BookOpen, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Published', value: publishedExams?.meta?.total ?? 0, icon: TrendingUp, bg: 'bg-amber-50', color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your exams, question bank, and publishing status."
        actions={
          <>
            <Link href="/teacher/questions/new">
              <Button>Create Question</Button>
            </Link>
            <Link href="/teacher/exams/new">
              <Button variant="secondary">Create Exam</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} variant="elevated">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-comfortable ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-sans font-semibold tracking-tight text-nearblack">{s.value}</p>
                <p className="text-sm text-stone">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {exams?.data?.length > 0 && (
        <Card variant="bordered">
          <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack mb-4">Recent Exams</h2>
          <div className="divide-y divide-border-cream">
            {exams.data.slice(0, 5).map((exam: any) => (
              <Link
                key={exam.id}
                href={`/teacher/exams/${exam.id}`}
                className="flex items-center justify-between py-3 px-2 hover:bg-sand/50 rounded-comfortable transition-colors duration-150"
              >
                <span className="text-sm font-medium text-charcoal">{exam.title}</span>
                <Badge variant={statusBadge(exam.status)}>{exam.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {exams?.data?.length === 0 && (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No exams yet"
          description="Create an exam, then add questions from the bank or generate them with AI."
          action={
            <Link href="/teacher/exams/new">
              <Button>Create Exam</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
