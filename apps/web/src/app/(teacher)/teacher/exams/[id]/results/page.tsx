'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['exam-stats', id],
    queryFn: () => api.get<any>(`/analytics/exams/${id}`),
  })

  const { data: attempts } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => api.get<any[]>(`/exams/${id}/results`),
  })

  if (isLoading) return <p className="text-stone">Loading analytics...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif text-nearblack">Exam Results</h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Attempts', value: stats?.totalAttempts ?? 0 },
          { label: 'Avg Score', value: `${(stats?.averageScore ?? 0).toFixed(1)}%` },
          { label: 'Pass Rate', value: `${((stats?.passRate ?? 0) * 100).toFixed(1)}%` },
          { label: 'Highest Score', value: `${(stats?.highestScore ?? 0).toFixed(1)}%` },
        ].map((s) => (
          <Card key={s.label} padding="md">
            <p className="text-2xl font-bold text-nearblack">{s.value}</p>
            <p className="text-sm text-stone">{s.label}</p>
          </Card>
        ))}
      </div>

      {stats?.scoreDistribution?.length > 0 && (
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.scoreDistribution}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats?.questionStats?.length > 0 && (
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Question Analysis</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone">
                <th className="pb-2 font-medium">Question</th>
                <th className="pb-2 font-medium text-right">Answered</th>
                <th className="pb-2 font-medium text-right">Correct Rate</th>
                <th className="pb-2 font-medium text-right">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.questionStats.map((q: any) => (
                <tr key={q.questionId} className={q.correctRate < 0.3 ? 'bg-red-50' : ''}>
                  <td className="py-2 pr-4 text-charcoal truncate max-w-xs">{q.content}</td>
                  <td className="py-2 text-right text-stone">{q.totalAnswered}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-sand rounded-full h-1.5">
                        <div className="bg-terracotta h-1.5 rounded-full" style={{ width: `${q.correctRate * 100}%` }} />
                      </div>
                      <span className={q.correctRate < 0.3 ? 'text-error' : 'text-olive'}>
                        {(q.correctRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-stone">{q.averageTimeSpent.toFixed(0)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {attempts && attempts.length > 0 && (
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Student Submissions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone">
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium text-right">Score</th>
                <th className="pb-2 font-medium text-right">Status</th>
                <th className="pb-2 font-medium text-right">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attempts.map((a: any) => (
                <tr key={a.id}>
                  <td className="py-2 text-charcoal">{a.user?.displayName}</td>
                  <td className="py-2 text-right text-olive">
                    {a.totalScore !== null ? `${a.totalScore}/${a.maxScore}` : '-'}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'GRADED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2 text-right text-stone">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
