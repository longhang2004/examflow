'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Upload, FileText, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { RichText } from '@/components/ui/RichText'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'

interface AIGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  examId?: string
  examQuestionStartOrder?: number
  onSaved?: () => void
}

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm 1 đáp án' },
  { value: 'MULTIPLE_SELECT', label: 'Nhiều đáp án' },
  { value: 'TRUE_FALSE', label: 'Đúng-Sai' },
  { value: 'FILL_BLANK', label: 'Điền vào chỗ trống' },
  { value: 'ESSAY', label: 'Tự luận' },
]

const DIFFICULTIES = [
  { value: 1, label: 'Dễ' },
  { value: 2, label: 'Trung bình' },
  { value: 3, label: 'Khó' },
]

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function AIGeneratorModal({
  isOpen,
  onClose,
  examId,
  examQuestionStartOrder = 0,
  onSaved,
}: AIGeneratorModalProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [inputMode, setInputMode] = useState<'file' | 'text'>('text')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['MULTIPLE_CHOICE'])
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2)
  const [language, setLanguage] = useState<'vi' | 'en'>('vi')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [inputError, setInputError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: usage } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<any>('/ai/usage'),
    enabled: isOpen,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (inputMode === 'file' && file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('count', String(count))
        formData.append('difficulty', String(difficulty))
        formData.append('language', language)
        selectedTypes.forEach((t) => formData.append('questionTypes', t))
        if (additionalInstructions) formData.append('additionalInstructions', additionalInstructions)

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai/generate/file`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        })
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error?.message ?? 'Failed to generate questions from this file')
        }
        const payload = await res.json()
        return payload?.data ?? payload
      } else {
        return api.post<any>('/ai/generate/text', {
          text,
          count,
          difficulty,
          language,
          questionTypes: selectedTypes,
          additionalInstructions: additionalInstructions || undefined,
        })
      }
    },
    onSuccess: (data) => {
      const questions = data.questions ?? []
      setGeneratedQuestions(questions)
      setSelectedQuestions(new Set(questions.map((_: any, i: number) => i)))
      setStep(3)
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })

  const handleSaveSelected = useCallback(async () => {
    setSaving(true)
    setSaveError('')
    try {
      const toSave = generatedQuestions.filter((_, i) => selectedQuestions.has(i))
      const savedQuestions = []
      for (const q of toSave) {
        const config = q.explanation
          ? { ...q.config, explanation: q.explanation }
          : q.config
        const saved = await api.post<any>('/questions', {
          type: q.type,
          content: q.content,
          config,
          tags: q.tags ?? [],
          difficulty: q.difficulty ?? difficulty,
        })
        savedQuestions.push(saved)
      }

      if (examId && savedQuestions.length > 0) {
        await api.post(`/exams/${examId}/questions`, {
          questions: savedQuestions.map((q, i) => ({
            questionId: q.id,
            point: 1,
            order: examQuestionStartOrder + i + 1,
          })),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      if (examId) {
        queryClient.invalidateQueries({ queryKey: ['exam', examId] })
      }
      onSaved?.()
      onClose()
      resetState()
    } catch (error: any) {
      setSaveError(error?.response?.data?.error?.message ?? error?.message ?? 'Could not save generated questions')
    } finally {
      setSaving(false)
    }
  }, [
    generatedQuestions,
    selectedQuestions,
    difficulty,
    examId,
    examQuestionStartOrder,
    queryClient,
    onSaved,
    onClose,
  ])

  const handleFileSelect = (nextFile: File | null) => {
    setInputError('')
    if (!nextFile) {
      setFile(null)
      return
    }

    if (!ACCEPTED_MIME_TYPES.includes(nextFile.type)) {
      setInputError('Only PDF, DOCX, and TXT files are supported.')
      setFile(null)
      return
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setInputError('File must be 10MB or smaller.')
      setFile(null)
      return
    }

    setFile(nextFile)
  }

  const resetState = () => {
    setStep(1)
    setFile(null)
    setText('')
    setGeneratedQuestions([])
    setSelectedQuestions(new Set())
    setSaveError('')
    setInputError('')
  }

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  const toggleQuestion = (i: number) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const canProceedStep1 = inputMode === 'file' ? Boolean(file) : text.length >= 100
  const canProceedStep2 = selectedTypes.length > 0 && count >= 1

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-3xl">
      <div className="min-w-0 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-comfortable bg-terracotta/10 ring-1 ring-inset ring-terracotta/20">
            <Sparkles className="h-5 w-5 text-terracotta" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-nearblack">
              {examId ? 'Sinh câu hỏi cho đề thi' : 'Sinh câu hỏi bằng AI'}
            </h2>
            <p className="text-sm text-stone">
              Bước {step}/3{usage ? ` · Còn ${Math.max(usage.limit - usage.used, 0)} lượt trong giờ này` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-terracotta' : 'bg-sand'}`}
            />
          ))}
        </div>

        {/* Step 1: Upload/Paste */}
        {step === 1 && (
          <div className="space-y-4">
            <SegmentedControl
              ariaLabel="AI input source"
              value={inputMode}
              onChange={(value) => setInputMode(value as 'file' | 'text')}
              options={[
                { value: 'text', label: 'Dán văn bản' },
                { value: 'file', label: 'Upload file' },
              ]}
            />

            {inputMode === 'text' ? (
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Dán nội dung tài liệu vào đây..."
                  className="h-48 w-full resize-none rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm text-nearblack focus:outline-none focus:ring-2 focus:ring-focus/20"
                />
                <p className="mt-1 text-right text-xs text-stone">{text.length} / 15000</p>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileSelect(e.dataTransfer.files?.[0] ?? null)
                }}
                className="cursor-pointer rounded-comfortable border-2 border-dashed border-border-warm bg-sand/30 p-8 text-center transition hover:border-terracotta hover:bg-terracotta/5"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto h-8 w-8 text-terracotta" />
                    <p className="text-sm text-charcoal font-medium">{file.name}</p>
                    <p className="text-xs text-stone">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-error hover:underline"
                    >
                      Xóa và chọn lại
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-stone" />
                    <p className="text-sm font-medium text-charcoal">Kéo thả hoặc click để chọn file</p>
                    <p className="text-xs text-stone">PDF, DOCX, TXT — tối đa 10MB</p>
                  </div>
                )}
              </div>
            )}
            {inputError && <Alert type="error" message={inputError} />}

            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Tiếp tục <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Loại câu hỏi cần sinh</label>
              <div className="grid min-w-0 gap-2 md:grid-cols-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => toggleType(t.value)}
                    className={`flex min-w-0 items-center justify-between gap-2 rounded-comfortable border px-3 py-2 text-left text-sm transition ${
                      selectedTypes.includes(t.value) ? 'border-terracotta bg-terracotta/5 text-nearblack' : 'border-border-warm text-stone hover:border-ring-warm'
                    }`}
                  >
                    <span className="min-w-0 truncate">{t.label}</span>
                    {selectedTypes.includes(t.value) && <Check className="h-4 w-4 shrink-0 text-terracotta" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-charcoal">Số câu hỏi</label>
                <span className="rounded-subtle bg-sand px-2 py-0.5 text-xs font-medium text-charcoal">{count}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-terracotta"
              />
              <div className="flex justify-between text-xs text-stone">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Độ khó</label>
              <div className="grid min-w-0 grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => setDifficulty(d.value as 1 | 2 | 3)}
                    className={`min-w-0 rounded-comfortable border px-2 py-2 text-sm transition ${
                      difficulty === d.value ? 'border-terracotta bg-terracotta/5 text-nearblack font-medium' : 'border-transparent bg-sand text-stone'
                    }`}
                  >
                    <span className="block truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Ngôn ngữ</label>
              <div className="grid min-w-0 grid-cols-2 gap-2">
                {[{ v: 'vi' as const, l: 'Tiếng Việt' }, { v: 'en' as const, l: 'English' }].map((lang) => (
                  <button
                    type="button"
                    key={lang.v}
                    onClick={() => setLanguage(lang.v)}
                    className={`min-w-0 rounded-comfortable border px-2 py-2 text-sm transition ${
                      language === lang.v ? 'border-terracotta bg-terracotta/5 text-nearblack font-medium' : 'border-transparent bg-sand text-stone'
                    }`}
                  >
                    <span className="block truncate">{lang.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Hướng dẫn thêm (tùy chọn)</label>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="VD: Tập trung vào phần định nghĩa và ví dụ"
                maxLength={500}
                className="h-20 w-full resize-none rounded-comfortable border border-border-warm bg-ivory px-3 py-2 text-sm text-nearblack focus:outline-none focus:ring-2 focus:ring-focus/20"
              />
            </div>

            <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} className="w-full sm:w-auto">
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </Button>
              <Button
                type="button"
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                disabled={!canProceedStep2}
                className="w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span className="truncate">{generateMutation.isPending ? 'AI đang phân tích...' : 'Sinh câu hỏi'}</span>
              </Button>
            </div>

            {generateMutation.isError && (
              <Alert
                type="error"
                message={
                  generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : 'Có lỗi xảy ra. Vui lòng thử lại.'
                }
              />
            )}
          </div>
        )}

        {/* Step 3: Review & Save */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-sm text-stone">
                Đã sinh {generatedQuestions.length} câu hỏi. Chọn câu muốn thêm vào{' '}
                {examId ? 'đề thi' : 'ngân hàng'}.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)))}
                  className="text-xs text-link hover:underline"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuestions(new Set())}
                  className="text-xs text-stone hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
            {saveError && <Alert type="error" message={saveError} />}

            <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
              {generatedQuestions.map((q, i) => (
                <div
                  key={i}
                  onClick={() => toggleQuestion(i)}
                  className={`cursor-pointer rounded-comfortable border p-3 transition ${
                    selectedQuestions.has(i) ? 'border-terracotta bg-terracotta/5' : 'border-border-cream bg-ivory'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedQuestions.has(i) ? 'border-terracotta bg-terracotta' : 'border-border-warm'
                    }`}>
                      {selectedQuestions.has(i) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge>{q.type?.replaceAll('_', ' ')}</Badge>
                        <DifficultyBadge value={q.difficulty || 2} />
                      </div>
                      <RichText
                        text={q.content}
                        imageUrl={q.config?.imageUrl}
                        className="text-sm text-charcoal"
                      />
                      {q.explanation && (
                        <RichText text={q.explanation} className="text-xs text-stone mt-1 italic" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="secondary" onClick={() => setStep(2)} className="w-full sm:w-auto">
                  <ChevronLeft className="w-4 h-4" /> Quay lại
                </Button>
                <Button type="button" variant="secondary" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending} className="w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4" /> Sinh lại
                </Button>
              </div>
              <Button
                type="button"
                onClick={handleSaveSelected}
                loading={saving}
                disabled={selectedQuestions.size === 0}
                className="w-full sm:w-auto"
              >
                <span className="truncate">Thêm {selectedQuestions.size} câu vào {examId ? 'đề thi' : 'ngân hàng'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
