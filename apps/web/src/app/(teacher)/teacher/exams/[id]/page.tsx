'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Trash2, GripVertical, Sparkles } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { AIGeneratorModal } from '@/components/teacher/AIGeneratorModal'
import { RichText } from '@/components/ui/RichText'
import { TagSelector, type TagOption } from '@/components/ui/TagSelector'

const QUESTION_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'MULTIPLE_SELECT', label: 'Multi-select' },
  { value: 'TRUE_FALSE', label: 'True / false' },
  { value: 'FILL_BLANK', label: 'Fill blank' },
  { value: 'ESSAY', label: 'Essay' },
]

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All difficulty' },
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hard' },
]

function questionTypeLabel(type?: string) {
  return QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type?.replaceAll('_', ' ') ?? 'Question'
}

interface ExamQuestionItem {
  id: string
  questionId: string
  order: number
  point: number
  question?: { content: string; type: string; difficulty?: number; config?: any }
}

function SortableQuestion({
  eq,
  index,
  isDraft,
  onRemove,
}: {
  eq: ExamQuestionItem
  index: number
  isDraft: boolean
  onRemove: (qid: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: eq.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-ivory border rounded-comfortable p-3 flex items-center gap-3">
      {isDraft && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-silver" />
        </button>
      )}
      {!isDraft && <GripVertical className="w-4 h-4 text-gray-200" />}
      <span className="text-xs text-stone w-6">{index + 1}.</span>
      <RichText
        text={eq.question?.content}
        imageUrl={eq.question?.config?.imageUrl}
        className="flex-1 text-sm text-charcoal line-clamp-2"
      />
      {eq.question?.type && <Badge variant="default">{questionTypeLabel(eq.question.type)}</Badge>}
      <DifficultyBadge value={eq.question?.difficulty} />
      <span className="text-xs text-stone">{eq.point}pt</span>
      {isDraft && (
        <button onClick={() => onRemove(eq.questionId)} className="text-silver hover:text-error">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, number>>({})
  const [qSearch, setQSearch] = useState('')
  const [qTags, setQTags] = useState<string[]>([])
  const [qType, setQType] = useState('')
  const [qDifficulty, setQDifficulty] = useState('')
  const [saveError, setSaveError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => api.get<any>(`/exams/${id}`),
  })

  const { data: questionBank } = useQuery({
    queryKey: ['questions', { search: qSearch, tags: qTags, type: qType, difficulty: qDifficulty }],
    queryFn: () => api.get<any>('/questions', {
      search: qSearch || undefined,
      tags: qTags.length ? qTags.join(',') : undefined,
      type: qType || undefined,
      difficulty: qDifficulty || undefined,
      limit: 50,
    }),
    enabled: showQuestionModal,
  })

  const { data: availableTags = [] } = useQuery({
    queryKey: ['question-tags'],
    queryFn: () => api.get<TagOption[]>('/questions/meta/tags'),
    enabled: showQuestionModal,
  })

  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/exams/${id}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam', id] }),
  })

  const archiveMutation = useMutation({
    mutationFn: () => api.patch(`/exams/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam', id] }),
  })

  const removeQuestionMutation = useMutation({
    mutationFn: (qid: string) => api.del(`/exams/${id}/questions/${qid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam', id] }),
  })

  const reorderMutation = useMutation({
    mutationFn: (questions: { questionId: string; point: number; order: number }[]) =>
      api.post(`/exams/${id}/questions`, { questions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam', id] }),
  })

  const addQuestionsMutation = useMutation({
    mutationFn: (questions: any[]) => api.post(`/exams/${id}/questions`, { questions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', id] })
      setShowQuestionModal(false)
      setSelectedQuestions({})
    },
    onError: (e: any) => setSaveError(e?.response?.data?.error?.message ?? 'Failed to add questions'),
  })

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !exam) return

      const items: ExamQuestionItem[] = exam.questions ?? []
      const oldIndex = items.findIndex((q) => q.id === active.id)
      const newIndex = items.findIndex((q) => q.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(items, oldIndex, newIndex)
      const payload = reordered.map((q, i) => ({
        questionId: q.questionId,
        point: q.point,
        order: i + 1,
      }))
      reorderMutation.mutate(payload)
    },
    [exam, reorderMutation],
  )

  if (isLoading) return <p className="text-stone">Loading...</p>
  if (!exam) return null

  const config = exam.config as any
  const questions: ExamQuestionItem[] = exam.questions ?? []
  const totalPoints = questions.reduce((s, q) => s + (q.point ?? 0), 0)
  const isDraft = exam.status === 'DRAFT'

  const handleAddQuestions = () => {
    const entries = Object.entries(selectedQuestions)
    const existingIds = new Set(questions.map((q) => q.questionId))
    const toAdd = entries.filter(([qid]) => !existingIds.has(qid))
    const payload = toAdd.map(([qid, point], i) => ({
      questionId: qid,
      point,
      order: questions.length + i + 1,
    }))
    if (payload.length > 0) addQuestionsMutation.mutate(payload)
    else setShowQuestionModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">{exam.title}</h1>
          <Badge variant={statusBadge(exam.status)}>{exam.status}</Badge>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button onClick={() => publishMutation.mutate()} loading={publishMutation.isPending}>
              Publish
            </Button>
          )}
          {exam.status === 'PUBLISHED' && (
            <>
              <Button variant="secondary" onClick={() => router.push(`/teacher/exams/${id}/results`)}>
                View Results
              </Button>
              <Button variant="danger" onClick={() => archiveMutation.mutate()}>Archive</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-ivory border rounded-comfortable p-4 space-y-3">
            <h2 className="font-semibold text-charcoal">Exam Info</h2>
            {exam.description && <p className="text-sm text-olive">{exam.description}</p>}
            <div className="space-y-1 text-sm text-olive">
              <p>Duration: {config.duration ? `${config.duration} min` : 'Unlimited'}</p>
              <p>Max Attempts: {config.maxAttempts}</p>
              <p>Shuffle Questions: {config.shuffleQuestions ? 'Yes' : 'No'}</p>
              <p>Show Result After: {config.showResultAfter ? 'Yes' : 'No'}</p>
            </div>
            {exam.accessCode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-olive">Code:</span>
                <span className="font-mono text-sm bg-sand px-2 py-0.5 rounded">{exam.accessCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(exam.accessCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-stone" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-charcoal">Questions ({questions.length})</h2>
            {isDraft && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowAIModal(true)}>
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowQuestionModal(true)}>
                  Add from Bank
                </Button>
              </div>
            )}
          </div>

          {questions.length === 0 ? (
            <p className="text-stone text-sm text-center py-8">No questions added yet.</p>
          ) : (
            <div className="space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                  {questions.map((eq, i) => (
                    <SortableQuestion
                      key={eq.id}
                      eq={eq}
                      index={i}
                      isDraft={isDraft}
                      onRemove={(qid) => removeQuestionMutation.mutate(qid)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="text-right text-sm font-medium text-charcoal pt-2">
                Total: {totalPoints} points
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title="Add Questions from Bank" className="max-w-2xl">
        <div className="space-y-3">
          {saveError && <Alert type="error" message={saveError} />}
          <div className="space-y-3 rounded-comfortable border border-border-cream bg-sand/30 p-3">
            <Input placeholder="Search questions..." value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-charcoal">Filter by type</span>
                <select
                  value={qType}
                  onChange={(event) => setQType(event.target.value)}
                  className="w-full rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-terracotta"
                >
                  {QUESTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-charcoal">Filter by difficulty</span>
                <select
                  value={qDifficulty}
                  onChange={(event) => setQDifficulty(event.target.value)}
                  className="w-full rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-terracotta"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TagSelector
              label="Filter by tags"
              selected={qTags}
              available={availableTags}
              onChange={setQTags}
              allowCreate={false}
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {questionBank?.data?.map((q: any) => {
              const selected = q.id in selectedQuestions
              return (
                <div key={q.id} className={`border rounded-comfortable p-3 flex items-center gap-3 cursor-pointer ${selected ? 'border-terracotta bg-terracotta/5' : 'border-border-cream hover:border-ring-warm'}`}
                  onClick={() => setSelectedQuestions(prev => {
                    if (q.id in prev) { const { [q.id]: _, ...rest } = prev; return rest }
                    return { ...prev, [q.id]: 1 }
                  })}>
                  <input type="checkbox" checked={selected} readOnly className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="default">{questionTypeLabel(q.type)}</Badge>
                      <DifficultyBadge value={q.difficulty} />
                    </div>
                    <RichText
                      text={q.content}
                      imageUrl={q.config?.imageUrl}
                      className="text-sm text-charcoal line-clamp-2"
                    />
                    {q.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {q.tags.map((tag: string) => (
                          <span key={tag} className="rounded-pill border border-border-cream bg-sand px-2 py-0.5 text-xs text-olive">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {selected && (
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selectedQuestions[q.id]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSelectedQuestions(prev => ({ ...prev, [q.id]: Number(e.target.value) }))}
                      className="w-16 border border-border-warm rounded px-2 py-1 text-sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-stone">{Object.keys(selectedQuestions).length} selected</span>
            <Button onClick={handleAddQuestions} loading={addQuestionsMutation.isPending} disabled={Object.keys(selectedQuestions).length === 0}>
              Add Selected
            </Button>
          </div>
        </div>
      </Modal>

      <AIGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        examId={id}
        examQuestionStartOrder={questions.length}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['exam', id] })
          setShowAIModal(false)
        }}
      />
    </div>
  )
}
