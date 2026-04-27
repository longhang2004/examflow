'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Mail, TrendingUp, UsersRound } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { HelpHint } from '@/components/guide/HelpHint'

interface StudentSummary {
  student: {
    id: string
    displayName: string
    email: string
    avatarUrl?: string | null
  }
  stats: {
    attemptsThisWeek: number
    averageScore: number
    reviewDueToday: number
  }
}

export default function ParentDashboardPage() {
  const queryClient = useQueryClient()
  const [studentEmail, setStudentEmail] = useState('')
  const [message, setMessage] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api.get<StudentSummary[]>('/parent/my-students'),
  })

  const linkMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>('/parent/link-request', { studentEmail }),
    onSuccess: (data) => {
      setMessage(data.message)
      setStudentEmail('')
      queryClient.invalidateQueries({ queryKey: ['parent-students'] })
    },
  })

  const studentList = students ?? []

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">
            Parent dashboard
          </h1>
          <HelpHint guideKey="parent-dashboard" />
        </div>
        <p className="text-olive mt-1 text-sm">
          Track accepted student links, weekly activity, and review workload.
        </p>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-comfortable bg-sand flex items-center justify-center">
            <Mail className="w-5 h-5 text-terracotta" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack">
                  Link a student account
                </h2>
                <HelpHint guideKey="parent-dashboard" />
              </div>
              <p className="text-sm text-stone mt-1">
                Send a request to the student email. They must approve it from their settings page.
              </p>
            </div>
            {message && <Alert type="success" message={message} />}
            {linkMutation.isError && (
              <Alert type="error" message="Could not send link request. Try again." />
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="student@example.com"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
              />
              <Button
                onClick={() => linkMutation.mutate()}
                loading={linkMutation.isPending}
                disabled={!studentEmail.trim()}
                className="sm:w-auto"
              >
                Send request
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack">
              Linked students
            </h2>
            <HelpHint guideKey="parent-dashboard" />
          </div>
          {isLoading && <span className="text-sm text-stone">Loading...</span>}
        </div>

        {studentList.length === 0 && !isLoading ? (
          <Card className="text-center" padding="lg">
            <UsersRound className="w-10 h-10 text-stone mx-auto mb-3" />
            <h3 className="font-semibold text-nearblack">No linked students yet</h3>
            <p className="text-sm text-stone mt-1">
              Use the form above to send your first link request.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentList.map(({ student, stats }) => (
              <Card key={student.id} variant="bordered" className="space-y-4">
                <div>
                  <h3 className="font-semibold text-nearblack">{student.displayName}</h3>
                  <p className="text-xs text-stone mt-0.5">{student.email}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <TrendingUp className="w-4 h-4 text-olive mb-1" />
                    <p className="font-semibold text-charcoal">{Math.round(stats.averageScore)}%</p>
                    <p className="text-xs text-stone">Avg week</p>
                  </div>
                  <div>
                    <BookOpen className="w-4 h-4 text-terracotta mb-1" />
                    <p className="font-semibold text-charcoal">{stats.attemptsThisWeek}</p>
                    <p className="text-xs text-stone">Attempts</p>
                  </div>
                  <div>
                    <UsersRound className="w-4 h-4 text-charcoal mb-1" />
                    <p className="font-semibold text-charcoal">{stats.reviewDueToday}</p>
                    <p className="text-xs text-stone">Due review</p>
                  </div>
                </div>
                <Link
                  href={`/parent/students/${student.id}`}
                  className="inline-flex items-center gap-1 text-sm text-terracotta hover:underline"
                >
                  View details <ArrowRight className="w-3 h-3" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
