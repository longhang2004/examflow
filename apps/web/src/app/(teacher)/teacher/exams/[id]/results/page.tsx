'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'

type QSortKey = 'content' | 'totalAnswered' | 'correctRate' | 'averageTimeSpent'

function QuestionSortButton(props: {
  label: string
  colKey: QSortKey
  sortKey: QSortKey
  sortDir: 'asc' | 'desc'
  onToggle: (k: QSortKey) => void
}) {
  const active = props.sortKey === props.colKey
  return (
    <button
      type="button"
      onClick={() => props.onToggle(props.colKey)}
      className={`inline-flex items-center gap-1 font-medium hover:text-charcoal ${
        active ? 'text-charcoal' : ''
      }`}
    >
      {props.label}
      {active ? (
        props.sortDir === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : null}
    </button>
  )
}

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [qSortKey, setQSortKey] = useState<QSortKey>('correctRate')
  const [qSortDir, setQSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['exam-stats', id],
    queryFn: () => api.get<any>(`/analytics/exams/${id}`),
  })

  const { data: attempts } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => api.get<any[]>(`/exams/${id}/results`),
  })

  const sortedQuestionStats = useMemo(() => {
    const rows = [...(stats?.questionStats ?? [])]
    rows.sort((a: any, b: any) => {
      let cmp = 0
      if (qSortKey === 'content') {
        cmp = String(a.content).localeCompare(String(b.content))
      } else {
        cmp = (a[qSortKey] as number) - (b[qSortKey] as number)
      }
      return qSortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [stats?.questionStats, qSortKey, qSortDir])

  function toggleQSort(key: QSortKey) {
    if (qSortKey === key) {
      setQSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setQSortKey(key)
      setQSortDir(key === 'correctRate' ? 'asc' : 'desc')
    }
  }

  function SortLabel({ label, k }: { label: string; k: QSortKey }) {
    const active = qSortKey === k
    return (
      <button
        type="button"
        onClick={() => toggleQSort(k)}
        className={`inline-flex items-center gap-1 font-medium hover:text-charcoal ${
          active ? 'text-charcoal' : ''
        }`}
      >
        {label}
        {active ? (
          qSortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : null}
      </button>
    )
  }

  if (isLoading) return <p className="text-stone">Loading analytics...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">Exam Results</h1>

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
              <Bar dataKey="count" fill="#0071e3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats?.questionStats?.length > 0 && (
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Question analysis</h2>
          <p className="text-xs text-stone mb-3">Click a column header to sort. Low correct rate first helps spot difficult items.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone">
                <th className="pb-2 text-left">
                  <QuestionSortButton
                    label="Question"
                    colKey="content"
                    sortKey={qSortKey}
                    sortDir={qSortDir}
                    onToggle={toggleQSort}
                  />
                </th>
                <th className="pb-2 text-right">
                  <QuestionSortButton
                    label="Answered"
                    colKey="totalAnswered"
                    sortKey={qSortKey}
                    sortDir={qSortDir}
                    onToggle={toggleQSort}
                  />
                </th>
                <th className="pb-2 text-right">
                  <QuestionSortButton
                    label="Correct rate"
                    colKey="correctRate"
                    sortKey={qSortKey}
                    sortDir={qSortDir}
                    onToggle={toggleQSort}
                  />
                </th>
                <th className="pb-2 text-right">
                  <QuestionSortButton
                    label="Avg time"
                    colKey="averageTimeSpent"
                    sortKey={qSortKey}
                    sortDir={qSortDir}
                    onToggle={toggleQSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedQuestionStats.map((q: any) => (
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
                <th className="pb-2 font-medium text-right">Actions</th>
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
                    <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="py-2 text-right text-stone">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/teacher/exams/${id}/grade/${a.id}`}
                      className={`text-xs font-medium px-3 py-1 rounded transition-colors ${
                        a.status === 'SUBMITTED'
                          ? 'bg-terracotta text-ivory hover:bg-terracotta-light'
                          : 'bg-sand text-charcoal hover:bg-border-warm'
                      }`}
                    >
                      {a.status === 'SUBMITTED' ? 'Grade' : 'Review'}
                    </Link>
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
