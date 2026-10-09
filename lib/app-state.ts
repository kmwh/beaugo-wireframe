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

export const richInitialState: AppState = {
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
    // data 코스 (100% 완강 강좌): 4개 영상 모두 시청 완료 및 퀴즈 통과
    'data-u1-v1': { position: 5, watched: true, quizDone: true },
    'data-u1-v2': { position: 5, watched: true, quizDone: true },
    'data-u2-v1': { position: 5, watched: true, quizDone: true },
    'data-u2-v2': { position: 5, watched: true, quizDone: true },
    // report 코스 (수강 중 강좌 ~29%): 1강 완료, 2강 진행 중
    'report-u1-v1': { position: 5, watched: true, quizDone: true },
    'report-u1-v2': { position: 2, watched: false, quizDone: false },
    // career 코스 (수강 중 강좌 ~14% / 복습 퀴즈 필요): 1강 시청 완료, 퀴즈 오답
    'career-u1-v1': { position: 5, watched: true, quizDone: false },
  },
  likes: ['report-u1-v1', 'ot-excel', 'data-u1-v1', 'ot-career'],
  notes: [
    {
      id: 'note-1',
      courseId: 'report',
      lessonId: 'report-u1-v1',
      at: 120,
      segment: 0,
      text: '보고서의 첫 문장은 결론부터 두괄식으로 작성할 것.',
    },
    {
      id: 'note-2',
      courseId: 'data',
      lessonId: 'data-u1-v1',
      at: 75,
      segment: 1,
      text: '핵심 지표(KPI) 설정 시 정량적 기준과 액션 플랜을 함께 명시하기.',
    },
    {
      id: 'note-3',
      courseId: 'data',
      lessonId: 'data-u2-v1',
      at: 180,
      segment: 0,
      text: '차트 시각화는 3색 이내로 단순화하여 가독성을 최우선으로 확보.',
    },
    {
      id: 'note-4',
      courseId: 'career',
      lessonId: 'career-u1-v1',
      at: 45,
      segment: 0,
      text: '포트폴리오 문제 해결 사례는 STAR(상황-과제-행동-결과) 기법 준수.',
    },
  ],
  answers: [
    // data 코스: 4개 영상 퀴즈 + 2개 유닛 퀴즈 + 최종 코스 퀴즈 모두 정답 (완강 강좌: 진도율 100%)
    {
      id: 'ans-data-u1-v1',
      questionId: 'data-u1-v1-quiz',
      courseId: 'data',
      lessonId: 'data-u1-v1',
      selected: 0,
      correct: true,
      at: Date.now() - 86400000,
    },
    {
      id: 'ans-data-u1-v2',
      questionId: 'data-u1-v2-quiz',
      courseId: 'data',
      lessonId: 'data-u1-v2',
      selected: 0,
      correct: true,
      at: Date.now() - 82800000,
    },
    {
      id: 'ans-data-u1',
      questionId: 'data-unit-1',
      courseId: 'data',
      selected: 0,
      correct: true,
      at: Date.now() - 79200000,
    },
    {
      id: 'ans-data-u2-v1',
      questionId: 'data-u2-v1-quiz',
      courseId: 'data',
      lessonId: 'data-u2-v1',
      selected: 0,
      correct: true,
      at: Date.now() - 75600000,
    },
    {
      id: 'ans-data-u2-v2',
      questionId: 'data-u2-v2-quiz',
      courseId: 'data',
      lessonId: 'data-u2-v2',
      selected: 0,
      correct: true,
      at: Date.now() - 72000000,
    },
    {
      id: 'ans-data-u2',
      questionId: 'data-unit-2',
      courseId: 'data',
      selected: 0,
      correct: true,
      at: Date.now() - 68400000,
    },
    {
      id: 'ans-data-final',
      questionId: 'data-final',
      courseId: 'data',
      selected: 0,
      correct: true,
      at: Date.now() - 64800000,
    },
    // report 코스: 1강 퀴즈 정답, 최종 코스 퀴즈 정답 (수강 중 강좌: 진도율 29%)
    {
      id: 'ans-1',
      questionId: 'report-u1-v1-quiz',
      courseId: 'report',
      lessonId: 'report-u1-v1',
      selected: 0,
      correct: true,
      at: Date.now() - 3600000,
    },
    {
      id: 'ans-report-final',
      questionId: 'report-final',
      courseId: 'report',
      selected: 0,
      correct: true,
      at: Date.now() - 7200000,
    },
    // career 코스: 1강 퀴즈 오답(0점), 최종 코스 퀴즈 오답(0점) (복습 퀴즈/오답노트 대상)
    {
      id: 'ans-career-1',
      questionId: 'career-u1-v1-quiz',
      courseId: 'career',
      lessonId: 'career-u1-v1',
      selected: 1,
      correct: false,
      at: Date.now() - 25200000,
    },
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

export const emptyInitialState: AppState = {
  role: null,
  onboarded: true,
  learner: {
    ...richInitialState.learner,
    paymentMethods: [],
    studyWindows: [],
  },
  creator: {
    ...richInitialState.creator,
  },
  purchased: [],
  progress: {},
  likes: [],
  notes: [],
  answers: [],
  creatorCourses: [],
}

export const initialState: AppState = richInitialState

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

export function isCourseCompleted(course: Course, state: AppState): boolean {
  return progressPercent(course, state) === 100
}

export function hasReviewQuiz(course: Course, state: AppState): boolean {
  const courseQuiz = course.courseQuizzes?.[0] ?? course.finalQuestion
  const answer = [...state.answers].reverse().find(a => a.questionId === courseQuiz.id)
  return answer !== undefined && !answer.correct
}

export function resetDemoState(mode: 'rich' | 'empty'): AppState {
  const next = mode === 'rich' ? { ...richInitialState } : { ...emptyInitialState }
  saveState(next)
  return next
}

