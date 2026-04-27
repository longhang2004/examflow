'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowDown, ArrowUp, ShieldAlert, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

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
  const [activeTab, setActiveTab] = useState<'results' | 'anticheat'>('results')
  const [qSortKey, setQSortKey] = useState<QSortKey>('correctRate')
  const [qSortDir, setQSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['exam-stats', id],
    queryFn: () => api.get<any>(`/analytics/exams/${id}`),
  })

  const { data: attempts } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => api.get<any[]>(`/exams/${id}/results`),
  })

  const { data: selectedReport } = useQuery({
    queryKey: ['anticheat-report', selectedAttemptId],
    queryFn: () => api.get<any>(`/attempts/${selectedAttemptId}/anticheat-report`),
    enabled: Boolean(selectedAttemptId),
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

  const antiCheat = stats?.antiCheatSummary
  const flaggedCount = antiCheat?.flaggedAttempts ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">Exam Results</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-sand rounded-lg p-1">
        <button
          onClick={() => setActiveTab('results')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'results' ? 'bg-white text-charcoal shadow-sm' : 'text-stone hover:text-charcoal'}`}
        >
          Kết quả
        </button>
        <button
          onClick={() => setActiveTab('anticheat')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition flex items-center justify-center gap-2 ${activeTab === 'anticheat' ? 'bg-white text-charcoal shadow-sm' : 'text-stone hover:text-charcoal'}`}
        >
          <ShieldAlert className="w-4 h-4" />
          Báo cáo gian lận
          {flaggedCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {flaggedCount}
            </span>
          )}
        </button>
      </div>

      {/* Results Tab */}
      {activeTab === 'results' && (
        <>
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
                      <QuestionSortButton label="Question" colKey="content" sortKey={qSortKey} sortDir={qSortDir} onToggle={toggleQSort} />
                    </th>
                    <th className="pb-2 text-right">
                      <QuestionSortButton label="Answered" colKey="totalAnswered" sortKey={qSortKey} sortDir={qSortDir} onToggle={toggleQSort} />
                    </th>
                    <th className="pb-2 text-right">
                      <QuestionSortButton label="Correct rate" colKey="correctRate" sortKey={qSortKey} sortDir={qSortDir} onToggle={toggleQSort} />
                    </th>
                    <th className="pb-2 text-right">
                      <QuestionSortButton label="Avg time" colKey="averageTimeSpent" sortKey={qSortKey} sortDir={qSortDir} onToggle={toggleQSort} />
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
        </>
      )}

      {/* Anti-cheat Tab */}
      {activeTab === 'anticheat' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card padding="md">
              <p className="text-2xl font-bold text-red-600">{antiCheat?.flaggedAttempts ?? 0}</p>
              <p className="text-sm text-stone">Bài thi bị đánh dấu</p>
            </Card>
            <Card padding="md">
              <p className="text-2xl font-bold text-nearblack">{(antiCheat?.averageTabSwitches ?? 0).toFixed(1)}</p>
              <p className="text-sm text-stone">TB lần rời tab</p>
            </Card>
            <Card padding="md">
              <p className="text-2xl font-bold text-nearblack">{antiCheat?.suspiciousAttempts?.length ?? 0}</p>
              <p className="text-sm text-stone">Bài thi có hoạt động nghi vấn</p>
            </Card>
          </div>

          {/* Suspicious table */}
          {antiCheat?.suspiciousAttempts?.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Danh sách hoạt động nghi vấn
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-stone">
                    <th className="pb-2 font-medium">Học sinh</th>
                    <th className="pb-2 font-medium text-right">Rời tab</th>
                    <th className="pb-2 font-medium text-right">Thoát fullscreen</th>
                    <th className="pb-2 font-medium text-right">Trạng thái</th>
                    <th className="pb-2 font-medium text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {antiCheat.suspiciousAttempts.map((s: any) => (
                    <tr key={s.attemptId} className={s.isFlagged ? 'bg-red-50' : ''}>
                      <td className="py-2 text-charcoal">{s.displayName}</td>
                      <td className="py-2 text-right">
                        <span className={s.tabSwitchCount >= 5 ? 'text-red-600 font-bold' : s.tabSwitchCount >= 3 ? 'text-orange-600' : 'text-stone'}>
                          {s.tabSwitchCount}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span className={s.fullscreenExits >= 3 ? 'text-red-600 font-bold' : 'text-stone'}>
                          {s.fullscreenExits}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {s.isFlagged ? (
                          <Badge variant="error">Bị đánh dấu</Badge>
                        ) : (
                          <Badge variant="warning">Nghi vấn</Badge>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setSelectedAttemptId(s.attemptId)}
                          className="text-xs font-medium px-3 py-1 bg-sand text-charcoal rounded hover:bg-border-warm transition"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="text-center text-stone">
                <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="font-medium text-charcoal">Không phát hiện gian lận</p>
                <p className="text-sm mt-1">Tất cả bài thi đều không có hoạt động nghi vấn.</p>
              </div>
            </Card>
          )}

          {/* Detail modal */}
          <Modal
            isOpen={Boolean(selectedAttemptId)}
            onClose={() => setSelectedAttemptId(null)}
            title="Chi tiết giám sát"
          >
            {selectedReport && (
              <div className="space-y-4">
                <p className="text-sm text-charcoal">
                  <strong>Học sinh:</strong> {selectedReport.student?.displayName}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-sand rounded p-3">
                    <p className="text-2xl font-bold text-nearblack">{selectedReport.tabSwitchCount}</p>
                    <p className="text-stone text-xs">Lần rời tab</p>
                  </div>
                  <div className="bg-sand rounded p-3">
                    <p className="text-2xl font-bold text-nearblack">{selectedReport.fullscreenExits}</p>
                    <p className="text-stone text-xs">Thoát fullscreen</p>
                  </div>
                </div>

                {selectedReport.tabSwitchLog?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-stone uppercase mb-2">Timeline rời tab</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(selectedReport.tabSwitchLog as any[]).map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-stone w-36">{new Date(e.timestamp).toLocaleString()}</span>
                          <span className="text-charcoal">Lần {e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.fullscreenLog?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-stone uppercase mb-2">Timeline fullscreen</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(selectedReport.fullscreenLog as any[]).map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-stone w-36">{new Date(e.timestamp).toLocaleString()}</span>
                          <span className="text-charcoal">{(e.duration / 1000).toFixed(1)}s ngoài fullscreen</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.isFlagged && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <p className="text-sm text-red-800 font-medium">{selectedReport.flagReason}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  )
}
