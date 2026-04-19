'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

export default function HistoryPage() {
  const router = useRouter()

  const { data: attempts, isLoading, error } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => api.get<any[]>('/attempts'),
  })

  if (isLoading) return <p className="text-stone p-4">Loading...</p>

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-nearblack">Attempt History</h1>
        <Card>
          <p className="text-center text-error py-8">Failed to load attempts. Please try again later.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-nearblack">Attempt History</h1>

      {!attempts?.length ? (
        <Card>
          <p className="text-center text-stone py-8">No attempts yet. Enter an exam code to get started!</p>
        </Card>
      ) : (
        <Card padding="sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone">
                <th className="pb-2 font-medium px-3">Exam</th>
                <th className="pb-2 font-medium px-3 text-right">Score</th>
                <th className="pb-2 font-medium px-3 text-right">%</th>
                <th className="pb-2 font-medium px-3 text-right">Submitted</th>
                <th className="pb-2 font-medium px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(attempts as any[]).map((a) => {
                const pct = a.maxScore ? Math.round((a.totalScore / a.maxScore) * 100) : null
                return (
                  <tr
                    key={a.id}
                    onClick={() => router.push(a.status !== 'IN_PROGRESS' ? `/attempts/${a.id}/result` : `/attempts/${a.id}`)}
                    className="hover:bg-sand/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-3 font-medium text-charcoal">{a.exam?.title ?? 'Exam'}</td>
                    <td className="py-3 px-3 text-right text-olive">
                      {a.totalScore !== null ? `${a.totalScore}/${a.maxScore}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-olive">{pct !== null ? `${pct}%` : '-'}</td>
                    <td className="py-3 px-3 text-right text-stone">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
