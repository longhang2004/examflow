import { create } from 'zustand'
import { Attempt, Question } from '@examflow/types'
import { api } from '@/lib/api-client'

interface ExamStore {
  attempt: Attempt | null
  questions: Question[]
  currentIndex: number
  answers: Record<string, any>
  viewedQuestions: Set<string>
  savedStatus: 'saved' | 'saving' | 'error'
  tabSwitchCount: number

  setAttempt: (attempt: Attempt) => void
  setQuestions: (questions: Question[]) => void
  setCurrentIndex: (index: number) => void
  saveAnswer: (questionId: string, answer: any) => void
  markViewed: (questionId: string) => void
  setSavedStatus: (status: 'saved' | 'saving' | 'error') => void
  submitExam: () => Promise<void>
  incrementTabSwitch: () => void
  reset: () => void
}

export const useExamStore = create<ExamStore>((set, get) => ({
  attempt: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  viewedQuestions: new Set(),
  savedStatus: 'saved',
  tabSwitchCount: 0,

  setAttempt: (attempt) => {
    const answers: Record<string, any> = {}
    if (Array.isArray(attempt.answers)) {
      attempt.answers.forEach((a) => {
        answers[a.questionId] = a.answer
      })
    }
    set({ attempt, answers })
  },

  setQuestions: (questions) => set({ questions }),

  setCurrentIndex: (index) => {
    const { questions, markViewed } = get()
    if (questions[index]) markViewed(questions[index].id)
    set({ currentIndex: index })
  },

  saveAnswer: (questionId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
      savedStatus: 'saving' as const,
    }))
  },

  setSavedStatus: (status: 'saved' | 'saving' | 'error') => set({ savedStatus: status }),

  markViewed: (questionId) => {
    set((state) => {
      const next = new Set(state.viewedQuestions)
      next.add(questionId)
      return { viewedQuestions: next }
    })
  },

  submitExam: async () => {
    const { attempt } = get()
    if (!attempt) return
    await api.post(`/attempts/${attempt.id}/submit`)
  },

  incrementTabSwitch: () =>
    set((state) => ({ tabSwitchCount: state.tabSwitchCount + 1 })),

  reset: () =>
    set({
      attempt: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      viewedQuestions: new Set(),
      savedStatus: 'saved',
      tabSwitchCount: 0,
    }),
}))
