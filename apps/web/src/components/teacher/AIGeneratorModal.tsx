'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Upload, FileText, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface AIGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm 1 đáp án' },
  { value: 'MULTIPLE_SELECT', label: 'Nhiều đáp án' },
  { value: 'TRUE_FALSE', label: 'Đúng-Sai' },
  { value: 'FILL_BLANK', label: 'Điền vào chỗ trống' },
  { value: 'ESSAY', label: 'Tự luận' },
]

const DIFFICULTIES = [
  { value: 1, label: 'Dễ', icon: '⭐' },
  { value: 2, label: 'Trung bình', icon: '⭐⭐' },
  { value: 3, label: 'Khó', icon: '⭐⭐⭐' },
]

export function AIGeneratorModal({ isOpen, onClose }: AIGeneratorModalProps) {
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
        if (!res.ok) throw new Error('Failed to generate')
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
    try {
      const toSave = generatedQuestions.filter((_, i) => selectedQuestions.has(i))
      for (const q of toSave) {
        const config = q.explanation
          ? { ...q.config, explanation: q.explanation }
          : q.config
        await api.post('/questions', {
          type: q.type,
          content: q.content,
          config,
          tags: q.tags ?? [],
          difficulty: q.difficulty ?? difficulty,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      onClose()
      resetState()
    } catch {
      // Handle error silently
    } finally {
      setSaving(false)
    }
  }, [generatedQuestions, selectedQuestions, difficulty, queryClient, onClose])

  const resetState = () => {
    setStep(1)
    setFile(null)
    setText('')
    setGeneratedQuestions([])
    setSelectedQuestions(new Set())
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
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="min-w-[500px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-nearblack">Sinh câu hỏi bằng AI</h2>
            <p className="text-xs text-stone">
              Bước {step}/3 — {usage ? `Còn ${usage.limit - usage.used} lượt trong giờ này` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-sand'}`}
            />
          ))}
        </div>

        {/* Step 1: Upload/Paste */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 px-4 py-2 text-sm rounded-lg transition ${inputMode === 'text' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-sand text-stone'}`}
              >
                <FileText className="w-4 h-4 inline mr-1" /> Dán văn bản
              </button>
              <button
                onClick={() => setInputMode('file')}
                className={`flex-1 px-4 py-2 text-sm rounded-lg transition ${inputMode === 'file' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-sand text-stone'}`}
              >
                <Upload className="w-4 h-4 inline mr-1" /> Upload file
              </button>
            </div>

            {inputMode === 'text' ? (
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Dán nội dung tài liệu vào đây..."
                  className="w-full h-48 border border-border-warm rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-xs text-stone mt-1 text-right">{text.length} / 15000</p>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border-warm rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-indigo-500" />
                    <p className="text-sm text-charcoal font-medium">{file.name}</p>
                    <p className="text-xs text-stone">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-error hover:underline"
                    >
                      Xóa và chọn lại
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-stone" />
                    <p className="text-sm text-stone">Kéo thả hoặc click để chọn file</p>
                    <p className="text-xs text-stone">PDF, DOCX, TXT — tối đa 10MB</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
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
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => toggleType(t.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition ${
                      selectedTypes.includes(t.value) ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-border-warm text-stone hover:border-ring-warm'
                    }`}
                  >
                    {selectedTypes.includes(t.value) && <Check className="w-3 h-3 inline mr-1" />}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Số câu hỏi: {count}</label>
              <input
                type="range"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-stone">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Độ khó</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value as 1 | 2 | 3)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition ${
                      difficulty === d.value ? 'bg-indigo-50 border border-indigo-400 text-indigo-700 font-medium' : 'bg-sand text-stone'
                    }`}
                  >
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-2">Ngôn ngữ</label>
              <div className="flex gap-2">
                {[{ v: 'vi' as const, l: '🇻🇳 Tiếng Việt' }, { v: 'en' as const, l: '🇬🇧 English' }].map((lang) => (
                  <button
                    key={lang.v}
                    onClick={() => setLanguage(lang.v)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition ${
                      language === lang.v ? 'bg-indigo-50 border border-indigo-400 text-indigo-700' : 'bg-sand text-stone'
                    }`}
                  >
                    {lang.l}
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
                className="w-full h-20 border border-border-warm rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                disabled={!canProceedStep2}
              >
                <Sparkles className="w-4 h-4" />
                {generateMutation.isPending ? 'AI đang phân tích...' : 'Sinh câu hỏi'}
              </Button>
            </div>

            {generateMutation.isError && (
              <p className="text-sm text-error text-center">Có lỗi xảy ra. Vui lòng thử lại.</p>
            )}
          </div>
        )}

        {/* Step 3: Review & Save */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone">
                Đã sinh {generatedQuestions.length} câu hỏi. Chọn câu muốn thêm vào ngân hàng.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)))}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={() => setSelectedQuestions(new Set())}
                  className="text-xs text-stone hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
              {generatedQuestions.map((q, i) => (
                <div
                  key={i}
                  onClick={() => toggleQuestion(i)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedQuestions.has(i) ? 'border-indigo-400 bg-indigo-50/50' : 'border-border-cream bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedQuestions.has(i) ? 'border-indigo-500 bg-indigo-500' : 'border-border-warm'
                    }`}>
                      {selectedQuestions.has(i) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{q.type?.replaceAll('_', ' ')}</Badge>
                        <span className="text-xs text-amber-600">{'⭐'.repeat(q.difficulty || 2)}</span>
                      </div>
                      <p className="text-sm text-charcoal">{q.content}</p>
                      {q.explanation && (
                        <p className="text-xs text-stone mt-1 italic">💡 {q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4" /> Quay lại
                </Button>
                <Button variant="secondary" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                  <RefreshCw className="w-4 h-4" /> Sinh lại
                </Button>
              </div>
              <Button
                onClick={handleSaveSelected}
                loading={saving}
                disabled={selectedQuestions.size === 0}
              >
                Thêm {selectedQuestions.size} câu vào ngân hàng
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
