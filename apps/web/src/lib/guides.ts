import type { Role } from '@examflow/types'

export interface GuideStep {
  title: string
  description: string
  bullets: string[]
}

export interface SectionGuide {
  key: string
  title: string
  summary: string
  bullets: string[]
  related?: string[]
}

const teacherSteps: GuideStep[] = [
  {
    title: 'Start with your question bank',
    description: 'Questions are the reusable building blocks for every exam.',
    bullets: [
      'Create questions manually or use the AI generator from the question bank.',
      'Use tags and difficulty consistently so analytics and review suggestions stay useful.',
      'Attach images when a diagram or visual prompt is part of the question.',
    ],
  },
  {
    title: 'Build and publish an exam',
    description: 'An exam combines questions, timing, attempt limits, and result visibility.',
    bullets: [
      'Draft exams stay private until you publish them.',
      'Published exams get an access code that students can enter from their dashboard.',
      'Use timed exams when you want server-enforced auto-submit behavior.',
    ],
  },
  {
    title: 'Review results and integrity signals',
    description: 'After students submit, use analytics and anti-cheat reports to decide what needs review.',
    bullets: [
      'Objective questions are graded automatically.',
      'Essay submissions stay in review until you grade them.',
      'Use the anti-cheat tab to inspect tab switches, fullscreen exits, and flagged attempts.',
    ],
  },
]

const studentSteps: GuideStep[] = [
  {
    title: 'Join an exam',
    description: 'Use the exam code from your teacher to open an available exam.',
    bullets: [
      'Enter the code exactly as shared by your teacher.',
      'Check the exam title, duration, and attempt limit before starting.',
      'Timed exams sync with the server, so refreshing does not reset the timer.',
    ],
  },
  {
    title: 'Take the exam carefully',
    description: 'Answers auto-save while you work, and exam integrity rules run in the background.',
    bullets: [
      'Use the question navigator to jump between questions.',
      'Fullscreen exits and tab switches can create warnings or flags.',
      'Submit manually when finished, or the server will submit when time expires.',
    ],
  },
  {
    title: 'Review and improve',
    description: 'After submission, missed questions can become review cards.',
    bullets: [
      'Open Review to practice due cards with spaced repetition.',
      'Use My learning to find weak topics and recent performance.',
      'History keeps your completed attempts and scores in one place.',
    ],
  },
]

const parentSteps: GuideStep[] = [
  {
    title: 'Link a student account',
    description: 'Parents can monitor progress only after the student accepts a link request.',
    bullets: [
      'Send a request using the student email address.',
      'The student approves or rejects the request from their settings page.',
      'Only accepted links appear in your dashboard.',
    ],
  },
  {
    title: 'Read weekly progress',
    description: 'The parent dashboard summarizes attempts, average scores, and review workload.',
    bullets: [
      'Use each student card for a quick weekly snapshot.',
      'Open student details to inspect recent attempts and weak topics.',
      'Parent views are read-only and do not expose exam content.',
    ],
  },
]

export function getOnboardingSteps(role?: Role | string | null): GuideStep[] {
  if (role === 'TEACHER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') return teacherSteps
  if (role === 'PARENT') return parentSteps
  return studentSteps
}

export function getRoleLabel(role?: Role | string | null) {
  if (role === 'TEACHER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') return 'Teacher guide'
  if (role === 'PARENT') return 'Parent guide'
  return 'Student guide'
}

export const sectionGuides: SectionGuide[] = [
  {
    key: 'teacher-dashboard',
    title: 'Teacher dashboard',
    summary: 'Your command center for recent exams, question count, and next actions.',
    bullets: [
      'Use the stat cards to spot whether your bank and exams are growing.',
      'Recent exams show what needs editing, publishing, or review.',
      'Start from questions when you need reusable content, or exams when you already have content ready.',
    ],
    related: ['Question bank', 'Exam builder', 'Analytics'],
  },
  {
    key: 'question-bank',
    title: 'Question bank',
    summary: 'Create, search, edit, and reuse questions across exams.',
    bullets: [
      'Use tags for subject, chapter, and skill so analytics can group performance.',
      'Difficulty should reflect expected student effort, not point value.',
      'AI generation can create drafts, but review answers and explanations before publishing.',
    ],
    related: ['AI generator', 'Tags', 'Difficulty'],
  },
  {
    key: 'exam-builder',
    title: 'Exam builder',
    summary: 'Assemble questions, configure timing, publish, and share access codes.',
    bullets: [
      'Draft exams are editable and hidden from students.',
      'Published exams are available through their access code.',
      'Shuffle settings reduce answer sharing, while duration enables server-side timer enforcement.',
    ],
    related: ['Access code', 'Timer', 'Publishing'],
  },
  {
    key: 'exam-results',
    title: 'Exam results',
    summary: 'Inspect submissions, grade essays, analyze questions, and review anti-cheat signals.',
    bullets: [
      'Use low correct-rate rows to find confusing questions or weak lessons.',
      'Essay attempts marked SUBMITTED need manual grading.',
      'The anti-cheat tab shows flagged attempts, tab switches, fullscreen exits, and event timelines.',
    ],
    related: ['Manual grading', 'Anti-cheat report', 'Question analysis'],
  },
  {
    key: 'teacher-analytics',
    title: 'Teacher analytics',
    summary: 'Compare published exam performance and identify content that needs attention.',
    bullets: [
      'Average score and pass rate help you compare exams at a glance.',
      'Question-level stats reveal topics that need reteaching.',
      'Analytics update as attempts are submitted and graded.',
    ],
    related: ['Exam results', 'Weak topics'],
  },
  {
    key: 'student-dashboard',
    title: 'Student dashboard',
    summary: 'Join exams, resume work, and see what needs review today.',
    bullets: [
      'Enter your teacher’s exam code to start an exam.',
      'Review cards come from missed or ungraded questions after attempts.',
      'Recent attempts help you jump back to results and progress.',
    ],
    related: ['Exam code', 'Review widget', 'Recent attempts'],
  },
  {
    key: 'attempt',
    title: 'Taking an exam',
    summary: 'Answer questions with autosave, server timer sync, and exam integrity checks.',
    bullets: [
      'Your answers save after a short delay, shown by the saved status.',
      'Use the sidebar to navigate questions and see answered/viewed status.',
      'Leaving fullscreen or switching tabs can trigger warnings and flags.',
    ],
    related: ['Autosave', 'Timer', 'Anti-cheat warnings'],
  },
  {
    key: 'review',
    title: 'Review mode',
    summary: 'Practice due cards using spaced repetition and self-rated recall.',
    bullets: [
      'Try answering first, then reveal the correct answer.',
      'Rate how well you remembered it so the next review date is scheduled correctly.',
      'Hard or forgotten cards return sooner; easy cards are spaced farther apart.',
    ],
    related: ['SM-2 scheduling', 'Due cards'],
  },
  {
    key: 'learning',
    title: 'My learning',
    summary: 'Track score trends, weak topics, and recent attempts.',
    bullets: [
      'Weak topics are inferred from tags on questions you answered.',
      'Recent attempts show score and submission history.',
      'Use this page with Review to decide what to practice next.',
    ],
    related: ['Weak topics', 'Review'],
  },
  {
    key: 'history',
    title: 'Attempt history',
    summary: 'A record of your submitted and graded exam attempts.',
    bullets: [
      'Open results to see scoring when your teacher allows result visibility.',
      'Attempts with essays may show partial information until grading is complete.',
      'Use history to revisit older scores and progress over time.',
    ],
    related: ['Results', 'Submitted attempts'],
  },
  {
    key: 'parent-dashboard',
    title: 'Parent dashboard',
    summary: 'Link student accounts and monitor accepted students.',
    bullets: [
      'Send link requests by student email.',
      'Students must approve requests before data appears.',
      'Cards summarize weekly attempts, average score, and due review cards.',
    ],
    related: ['Student linking', 'Weekly progress'],
  },
  {
    key: 'parent-student',
    title: 'Student progress detail',
    summary: 'Read-only progress details for a linked student.',
    bullets: [
      'Weekly bars show activity and average score by day.',
      'Recent attempts list submitted exams without exposing protected exam content.',
      'Weak topics help guide conversations and study support.',
    ],
    related: ['Recent attempts', 'Weak topics', 'Review due'],
  },
  {
    key: 'settings',
    title: 'Settings',
    summary: 'Manage account preferences, display settings, and connected parent requests.',
    bullets: [
      'Account settings identify the current signed-in user.',
      'Preferences control language, theme, compact mode, and motion.',
      'Students can approve or reject parent link requests here.',
    ],
    related: ['Account', 'Preferences', 'Parent requests'],
  },
]

export const defaultGuide: SectionGuide = {
  key: 'general',
  title: 'ExamFlow guide',
  summary: 'Use the guide to understand the current page and the main workflow.',
  bullets: [
    'Teachers create questions, build exams, publish access codes, and review results.',
    'Students join exams by code, submit answers, and practice missed questions in Review.',
    'Parents link to students and monitor progress after student approval.',
  ],
  related: ['Questions', 'Exams', 'Review', 'Analytics'],
}

export function getGuideForPath(pathname: string): SectionGuide {
  if (pathname.startsWith('/teacher/questions')) return sectionGuides.find((g) => g.key === 'question-bank')!
  if (pathname.startsWith('/teacher/exams/') && pathname.includes('/results')) return sectionGuides.find((g) => g.key === 'exam-results')!
  if (pathname.startsWith('/teacher/exams')) return sectionGuides.find((g) => g.key === 'exam-builder')!
  if (pathname.startsWith('/teacher/analytics')) return sectionGuides.find((g) => g.key === 'teacher-analytics')!
  if (pathname.startsWith('/teacher/settings')) return sectionGuides.find((g) => g.key === 'settings')!
  if (pathname.startsWith('/teacher/dashboard')) return sectionGuides.find((g) => g.key === 'teacher-dashboard')!
  if (pathname.startsWith('/attempts/')) return sectionGuides.find((g) => g.key === 'attempt')!
  if (pathname.startsWith('/review')) return sectionGuides.find((g) => g.key === 'review')!
  if (pathname.startsWith('/learning')) return sectionGuides.find((g) => g.key === 'learning')!
  if (pathname.startsWith('/history')) return sectionGuides.find((g) => g.key === 'history')!
  if (pathname.startsWith('/settings')) return sectionGuides.find((g) => g.key === 'settings')!
  if (pathname.startsWith('/dashboard')) return sectionGuides.find((g) => g.key === 'student-dashboard')!
  if (pathname.startsWith('/parent/students')) return sectionGuides.find((g) => g.key === 'parent-student')!
  if (pathname.startsWith('/parent/settings')) return sectionGuides.find((g) => g.key === 'settings')!
  if (pathname.startsWith('/parent/dashboard')) return sectionGuides.find((g) => g.key === 'parent-dashboard')!
  return defaultGuide
}

export function getGuideByKey(key?: string | null) {
  if (!key) return null
  return sectionGuides.find((guide) => guide.key === key) ?? null
}
