import { Course, initialCreatorCourses, demoCourses } from './demo-data'

export type Role = 'learner' | 'creator'
export type StudyWindow = { id: string; start: string; end: string }

export type SettlementAccount = {
  bank: string
  accountNumber: string
  holder: string
}

export type PaymentMethod = {
  id: string
  type: 'card' | 'kakaopay' | 'naverpay' | 'toss'
  name: string
  numberMasked: string
  isDefault: boolean
}

export type LearnerProfile = {
  name: string
  avatar: string
  status: string
  job: string
  interests: string[]
  dailyMinutes: number
  studyWindows: StudyWindow[]
  paymentMethods: PaymentMethod[]
}

export type CreatorProfile = {
  name: string
  avatar: string
  job: string
  keywords: string[]
  bio: string
  settlementAccount: SettlementAccount
}

export type Note = {
  id: string
  courseId: string
  lessonId: string
  at: number
  segment: number
  text: string
}

export type LessonProgress = {
  position: number
  watched: boolean
  quizDone: boolean
}

export type AnswerRecord = {
  id: string
  questionId: string
  courseId: string
  lessonId?: string
  selected: number
  correct: boolean
  at: number
}

export type AppState = {
  role: Role | null
  onboarded: boolean
  learner: LearnerProfile
  creator: CreatorProfile
  purchased: string[]
  progress: Record<string, LessonProgress>
  likes: string[]
  notes: Note[]
  answers: AnswerRecord[]
  creatorCourses: Course[]
}

export const initialState: AppState = {
  role: null,
  onboarded: false,
  learner: {
    name: '김배움',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    status: '재직 중',
    job: '기획·PM',
    interests: ['문서 작성', '데이터 분석'],
    dailyMinutes: 20,
    studyWindows: [],
    paymentMethods: [
      {
        id: 'pm-1',
        type: 'card',
        name: '현대카드 M3',
        numberMasked: '****-****-****-4291',
        isDefault: true,
      },
      {
        id: 'pm-2',
        type: 'kakaopay',
        name: '카카오페이 머니',
        numberMasked: '카카오뱅크 3333-**-****',
        isDefault: false,
      },
    ],
  },
  creator: {
    name: '김강사',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    job: '기획·PM',
    keywords: ['문서 작성', '보고서'],
    bio: '10년 차 IT 서비스 기획 리드이자 사내 직무 전문 강사입니다.',
    settlementAccount: {
      bank: '신한은행',
      accountNumber: '110-384-928172',
      holder: '김강사',
    },
  },
  purchased: ['report', 'data', 'career', 'excel'],
  progress: {
    'report-u1-v1': { position: 5, watched: true, quizDone: true },
    'data-u1-v1': { position: 5, watched: true, quizDone: true },
    'data-u1-v2': { position: 5, watched: true, quizDone: true },
    'data-u2-v1': { position: 5, watched: true, quizDone: true },
    'data-u2-v2': { position: 5, watched: true, quizDone: true },
  },
  likes: ['report-u1-v1', 'ot-excel'],
  notes: [
    {
      id: 'note-1',
      courseId: 'report',
      lessonId: 'report-u1-v1',
      at: 2,
      segment: 0,
      text: '보고서의 첫 문장은 결론부터 두괄식으로 작성할 것.',
    },
  ],
  answers: [
    {
      id: 'ans-1',
      questionId: 'report-u1-v1-quiz',
      courseId: 'report',
      lessonId: 'report-u1-v1',
      selected: 0,
      correct: true,
      at: Date.now() - 3600000,
    },
    // report 코스 퀴즈 1문항 (정답 100점)
    {
      id: 'ans-report-final',
      questionId: 'report-final',
      courseId: 'report',
      selected: 0,
      correct: true,
      at: Date.now() - 7200000,
    },
    // data 코스 퀴즈 1문항 (정답 100점)
    {
      id: 'ans-data-final',
      questionId: 'data-final',
      courseId: 'data',
      selected: 0,
      correct: true,
      at: Date.now() - 14400000,
    },
    // career 코스 퀴즈 1문항 (오답 0점)
    {
      id: 'ans-career-final',
      questionId: 'career-final',
      courseId: 'career',
      selected: 2,
      correct: false,
      at: Date.now() - 21600000,
    },
  ],
  creatorCourses: initialCreatorCourses,
}

const key = 'baeugo-prototype-v3'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return initialState
    const stored = JSON.parse(raw) as Partial<AppState>
    return {
      ...initialState,
      ...stored,
      learner: {
        ...initialState.learner,
        ...stored.learner,
        name: stored.learner?.name || initialState.learner.name,
        avatar: stored.learner?.avatar || initialState.learner.avatar,
        paymentMethods:
          Array.isArray(stored.learner?.paymentMethods) && stored.learner.paymentMethods.length > 0
            ? stored.learner.paymentMethods
            : initialState.learner.paymentMethods,
        studyWindows: Array.isArray(stored.learner?.studyWindows)
          ? stored.learner.studyWindows.filter(
              window =>
                typeof window?.id === 'string' &&
                typeof window.start === 'string' &&
                typeof window.end === 'string'
            )
          : [],
      },
      creator: {
        ...initialState.creator,
        ...stored.creator,
        settlementAccount: stored.creator?.settlementAccount ?? initialState.creator.settlementAccount,
      },
      purchased: stored.purchased ?? initialState.purchased,
      progress: stored.progress ?? initialState.progress,
      likes: stored.likes ?? initialState.likes,
      notes: stored.notes ?? initialState.notes,
      answers: stored.answers ?? initialState.answers,
      creatorCourses:
        Array.isArray(stored.creatorCourses) && stored.creatorCourses.length > 0
          ? stored.creatorCourses
          : initialState.creatorCourses,
    }
  } catch {
    return initialState
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    /* Prototype remains usable without storage. */
  }
}

export function progressPercent(course: Course, state: AppState): number {
  const lessons = course.units.flatMap(unit => unit.lessons)
  if (lessons.length === 0) return 0
  const total = lessons.length + course.units.length + 1
  const completedVideos = lessons.filter(lesson => state.progress[lesson.id]?.quizDone).length
  const completedUnits = course.units.filter(unit =>
    state.answers.some(answer => answer.questionId === unit.question.id)
  ).length
  const completedFinal = state.answers.some(answer => answer.questionId === course.finalQuestion.id) ? 1 : 0
  return Math.min(100, Math.round(((completedVideos + completedUnits + completedFinal) / total) * 100))
}

export function nextLearningItemId(course: Course, state: AppState): string | undefined {
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (!state.progress[lesson.id]?.quizDone) return lesson.id
    }
    if (!state.answers.some(answer => answer.questionId === unit.question.id)) return unit.question.id
  }
  if (!state.answers.some(answer => answer.questionId === course.finalQuestion.id))
    return course.finalQuestion.id
  return undefined
}

export function hasWrongAnswer(state: AppState, lessonId: string): boolean {
  return state.answers.some(answer => answer.lessonId === lessonId && !answer.correct)
}
