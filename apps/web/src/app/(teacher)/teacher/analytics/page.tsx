'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { BarChart2, TrendingUp, Users, FileText } from 'lucide-react'
import { HelpHint } from '@/components/guide/HelpHint'

interface ExamSummary {
  id: string
  title: string
  status: string
  accessCode?: string
  _count?: { attempts: number }
}

export default function TeacherAnalyticsPage() {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams', { status: 'PUBLISHED' }],
    queryFn: () => api.get<any>('/exams', { status: 'PUBLISHED', limit: 50 }),
  })

  const publishedExams: ExamSummary[] = exams?.data ?? exams ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">Analytics</h1>
          <HelpHint guideKey="teacher-analytics" />
        </div>
        <p className="text-sm text-stone mt-1">View detailed statistics for your published exams</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-comfortable">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedExams.length}</p>
              <p className="text-xs text-stone">Published Exams</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-comfortable">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {publishedExams.reduce((s, e) => s + (e._count?.attempts ?? 0), 0)}
              </p>
              <p className="text-xs text-stone">Total Attempts</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-comfortable">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {publishedExams.filter((e) => (e._count?.attempts ?? 0) > 0).length}
              </p>
              <p className="text-xs text-stone">Exams with Activity</p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-charcoal mb-3">Exam Reports</h2>
        {publishedExams.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <BarChart2 className="w-10 h-10 text-silver mx-auto mb-3" />
              <p className="text-stone">No published exams yet.</p>
              <p className="text-sm text-stone mt-1">Publish an exam to see analytics here.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {publishedExams.map((exam) => (
              <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`}>
                <div className="bg-ivory border border-border-cream rounded-comfortable p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition cursor-pointer">
                  <div>
                    <p className="font-medium text-charcoal">{exam.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="success">Published</Badge>
                      {exam.accessCode && (
                        <span className="text-xs text-stone font-mono">{exam.accessCode}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-charcoal">{exam._count?.attempts ?? 0}</p>
                    <p className="text-xs text-stone">attempts</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
