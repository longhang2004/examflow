import { useExamStore } from '../store/exam.store'

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

describe('ExamStore', () => {
  beforeEach(() => {
    useExamStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const state = useExamStore.getState()
      expect(state.attempt).toBeNull()
      expect(state.questions).toEqual([])
      expect(state.currentIndex).toBe(0)
      expect(state.answers).toEqual({})
      expect(state.savedStatus).toBe('saved')
      expect(state.tabSwitchCount).toBe(0)
    })
  })

  describe('setAttempt', () => {
    it('should set attempt and pre-populate answers', () => {
      const attempt = {
        id: 'att-1',
        examId: 'exam-1',
        status: 'IN_PROGRESS' as const,
        answers: [
          { questionId: 'q1', answer: 'b', timeSpent: 10 },
          { questionId: 'q2', answer: true, timeSpent: 5 },
        ],
        questionOrder: ['q1', 'q2'],
        startedAt: new Date().toISOString(),
      }

      useExamStore.getState().setAttempt(attempt)

      const state = useExamStore.getState()
      expect(state.attempt).toBe(attempt)
      expect(state.answers).toEqual({ q1: 'b', q2: true })
    })

    it('should handle attempt with no answers', () => {
      const attempt = {
        id: 'att-2',
        examId: 'exam-1',
        status: 'IN_PROGRESS' as const,
        answers: [],
        questionOrder: ['q1'],
        startedAt: new Date().toISOString(),
      }

      useExamStore.getState().setAttempt(attempt)
      expect(useExamStore.getState().answers).toEqual({})
    })
  })

  describe('setQuestions', () => {
    it('should set questions list', () => {
      const questions = [
        { id: 'q1', type: 'MULTIPLE_CHOICE' as const, content: 'Q1', config: {}, tags: [], difficulty: 1, isPublic: false, createdAt: '' },
      ]

      useExamStore.getState().setQuestions(questions)
      expect(useExamStore.getState().questions).toHaveLength(1)
    })
  })

  describe('setCurrentIndex', () => {
    it('should update index and mark question as viewed', () => {
      const questions = [
        { id: 'q1', type: 'MULTIPLE_CHOICE' as const, content: 'Q1', config: {}, tags: [], difficulty: 1, isPublic: false, createdAt: '' },
        { id: 'q2', type: 'TRUE_FALSE' as const, content: 'Q2', config: {}, tags: [], difficulty: 1, isPublic: false, createdAt: '' },
      ]

      useExamStore.getState().setQuestions(questions)
      useExamStore.getState().setCurrentIndex(1)

      const state = useExamStore.getState()
      expect(state.currentIndex).toBe(1)
      expect(state.viewedQuestions.has('q2')).toBe(true)
    })
  })

  describe('saveAnswer', () => {
    it('should save answer and set status to saving', () => {
      useExamStore.getState().saveAnswer('q1', 'option-b')

      const state = useExamStore.getState()
      expect(state.answers['q1']).toBe('option-b')
      expect(state.savedStatus).toBe('saving')
    })

    it('should overwrite existing answer', () => {
      useExamStore.getState().saveAnswer('q1', 'a')
      useExamStore.getState().saveAnswer('q1', 'b')

      expect(useExamStore.getState().answers['q1']).toBe('b')
    })
  })

  describe('setSavedStatus', () => {
    it('should update saved status', () => {
      useExamStore.getState().setSavedStatus('error')
      expect(useExamStore.getState().savedStatus).toBe('error')

      useExamStore.getState().setSavedStatus('saved')
      expect(useExamStore.getState().savedStatus).toBe('saved')
    })
  })

  describe('incrementTabSwitch', () => {
    it('should increment tab switch counter', () => {
      useExamStore.getState().incrementTabSwitch()
      useExamStore.getState().incrementTabSwitch()
      useExamStore.getState().incrementTabSwitch()

      expect(useExamStore.getState().tabSwitchCount).toBe(3)
    })
  })

  describe('markViewed', () => {
    it('should add question to viewed set', () => {
      useExamStore.getState().markViewed('q1')
      useExamStore.getState().markViewed('q2')
      useExamStore.getState().markViewed('q1')

      const viewed = useExamStore.getState().viewedQuestions
      expect(viewed.size).toBe(2)
      expect(viewed.has('q1')).toBe(true)
      expect(viewed.has('q2')).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      useExamStore.getState().saveAnswer('q1', 'a')
      useExamStore.getState().incrementTabSwitch()
      useExamStore.getState().setCurrentIndex(5)

      useExamStore.getState().reset()

      const state = useExamStore.getState()
      expect(state.attempt).toBeNull()
      expect(state.questions).toEqual([])
      expect(state.currentIndex).toBe(0)
      expect(state.answers).toEqual({})
      expect(state.savedStatus).toBe('saved')
      expect(state.tabSwitchCount).toBe(0)
    })
  })
})
