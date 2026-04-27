export type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ORG_ADMIN' | 'SUPER_ADMIN'
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'FILL_BLANK' | 'ESSAY'

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  role: Role
  plan: Plan
  organizationId?: string
  createdAt: string
}

export interface QuestionOption {
  id: string
  text: string
  imageUrl?: string
}

export interface QuestionConfig {
  options?: QuestionOption[]
  correctAnswer?: string | boolean
  correctAnswers?: string[]
  explanation?: string
  imageUrl?: string
  caseSensitive?: boolean
  rubric?: string[]
  maxWords?: number
}

export interface Question {
  id: string
  type: QuestionType
  content: string
  config: QuestionConfig
  tags: string[]
  difficulty: number
  isPublic: boolean
  createdAt: string
  creator?: { id: string; displayName: string }
}

export interface ExamConfig {
  duration: number | null
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResultAfter: boolean
  startAt: string | null
  endAt: string | null
}

export interface ExamQuestion {
  id: string
  examId: string
  questionId: string
  order: number
  point: number
  question?: Question
}

export interface Exam {
  id: string
  title: string
  description?: string
  config: ExamConfig
  accessCode?: string
  status: ExamStatus
  questions?: ExamQuestion[]
  createdAt: string
}

export interface AnswerEntry {
  questionId: string
  answer: string | string[] | boolean | null
  timeSpent: number
  isCorrect?: boolean | null
  pointEarned?: number | null
}

export interface Attempt {
  id: string
  examId: string
  status: AttemptStatus
  answers: AnswerEntry[]
  questionOrder: string[]
  totalScore?: number | null
  maxScore?: number | null
  startedAt: string
  submittedAt?: string | null
  exam?: Exam
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  tokens: Tokens
}
