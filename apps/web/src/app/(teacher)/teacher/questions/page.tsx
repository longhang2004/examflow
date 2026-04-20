'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Question } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function QuestionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['questions', { search: debouncedSearch, type, difficulty, page }],
    queryFn: () => {
      const params: Record<string, any> = { page, limit: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      if (type) params.type = type
      if (difficulty) params.difficulty = difficulty
      return api.get<any>('/questions', params)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">Question Bank</h1>
        <Link href="/teacher/questions/new">
          <Button>
            <Plus className="w-4 h-4" />
            Create Question
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-stone" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 pr-3 py-2 border border-border-warm rounded-comfortable text-sm w-full focus:outline-none focus:ring-2 focus:ring-terracotta"
          />
        </div>

        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1) }}
          className="border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
        >
          <option value="">All Types</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="MULTIPLE_SELECT">Multiple Select</option>
          <option value="TRUE_FALSE">True / False</option>
          <option value="FILL_BLANK">Fill Blank</option>
          <option value="ESSAY">Essay</option>
        </select>

        <select
          value={difficulty}
          onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
          className="border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
        >
          <option value="">All Difficulty</option>
          <option value="1">Easy</option>
          <option value="2">Medium</option>
          <option value="3">Hard</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-stone text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {data?.data?.map((q: Question) => (
            <div
              key={q.id}
              className="bg-ivory border border-border-cream rounded-comfortable p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{q.type.replaceAll('_', ' ')}</Badge>
                  <span className="text-xs text-amber-600">{'⭐'.repeat(q.difficulty)}</span>
                </div>
                <p className="text-sm text-charcoal truncate">{q.content}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {q.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-sand text-olive px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/teacher/questions/${q.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this question?')) deleteMutation.mutate(q.id)
                  }}
                  className="text-error hover:text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {data?.data?.length === 0 && (
            <p className="text-center text-stone py-8">No questions found.</p>
          )}
        </div>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-olive py-1.5">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
