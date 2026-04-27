'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search, Sparkles } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Question } from '@examflow/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIGeneratorModal } from '@/components/teacher/AIGeneratorModal'
import { RichText } from '@/components/ui/RichText'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { TagSelector, type TagOption } from '@/components/ui/TagSelector'

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
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['questions', { search: debouncedSearch, type, difficulty, selectedTags, page }],
    queryFn: () => {
      const params: Record<string, any> = { page, limit: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      if (type) params.type = type
      if (difficulty) params.difficulty = difficulty
      if (selectedTags.length) params.tags = selectedTags.join(',')
      return api.get<any>('/questions', params)
    },
  })

  const { data: availableTags = [] } = useQuery({
    queryKey: ['question-tags'],
    queryFn: () => api.get<TagOption[]>('/questions/meta/tags'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Create reusable questions manually or generate them from PDF, DOCX, TXT, or pasted text."
        actions={
          <>
          <Button variant="secondary" onClick={() => setAiModalOpen(true)}>
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Button>
          <Link href="/teacher/questions/new">
            <Button>
              <Plus className="w-4 h-4" />
              Create Question
            </Button>
          </Link>
          </>
        }
      />

      <div className="space-y-3 rounded-comfortable border border-border-cream bg-ivory p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-stone" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-2 border border-border-warm rounded-comfortable text-sm w-full bg-ivory focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
          </div>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1) }}
            className="border border-border-warm bg-ivory rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
          >
            <option value="">All Types</option>
            <option value="MULTIPLE_CHOICE">Single choice</option>
            <option value="MULTIPLE_SELECT">Multiple select</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill Blank</option>
            <option value="ESSAY">Essay</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
            className="border border-border-warm bg-ivory rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
          >
            <option value="">All Difficulty</option>
            <option value="1">Easy</option>
            <option value="2">Medium</option>
            <option value="3">Hard</option>
          </select>
        </div>

        <TagSelector
          label="Filter by tags"
          selected={selectedTags}
          available={availableTags}
          onChange={(tags) => { setSelectedTags(tags); setPage(1) }}
          allowCreate={false}
        />
      </div>

      {isLoading ? (
        <LoadingState label="Loading questions..." />
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
                  <DifficultyBadge value={q.difficulty} />
                </div>
                <RichText
                  text={q.content}
                  imageUrl={q.config?.imageUrl}
                  className="text-sm text-charcoal line-clamp-2"
                />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {q.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-sand text-olive px-2 py-0.5 rounded-pill border border-border-cream">
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
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No questions found"
              description="Adjust your filters, create a question manually, or generate questions from a document."
              action={
                <Button variant="secondary" onClick={() => setAiModalOpen(true)}>
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>
              }
            />
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

      <AIGeneratorModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  )
}
