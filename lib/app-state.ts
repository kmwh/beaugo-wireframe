import type { Course } from './demo-data'

export type Role = 'learner' | 'creator'
export type StudyWindow = { id: string; start: string; end: string }
export type LearnerProfile = {
  status: string
  job: string
  interests: string[]
  dailyMinutes: number
  studyWindows: StudyWindow[]
}
export type CreatorProfile = { job: string; keywords: string[]; bio: string }
export type Note = { id: string; courseId: string; lessonId: string; at: number; segment: number; text: string }
export type LessonProgress = { position: number; watched: boolean; quizDone: boolean }
export type AnswerRecord = { id: string; questionId: string; courseId: string; lessonId?: string; selected: number; correct: boolean; at: number }
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
  learner: { status: '', job: '', interests: [], dailyMinutes: 20, studyWindows: [] },
  creator: { job: '', keywords: [], bio: '' },
  // The two enrolled courses are explicit demo-account data so the Home learning flow can be tried immediately.
  purchased: ['report', 'data'],
  progress: {},
  likes: [],
  notes: [],
  answers: [],
  creatorCourses: [],
}

const key = 'baeugo-prototype-v2'

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
        studyWindows: Array.isArray(stored.learner?.studyWindows)
          ? stored.learner.studyWindows.filter(window => typeof window?.id === 'string' && typeof window.start === 'string' && typeof window.end === 'string')
          : [],
      },
      creator: { ...initialState.creator, ...stored.creator },
      purchased: stored.purchased ?? initialState.purchased,
      progress: stored.progress ?? {},
      likes: stored.likes ?? [],
      notes: stored.notes ?? [],
      answers: stored.answers ?? [],
      creatorCourses: stored.creatorCourses ?? [],
    }
  } catch { return initialState }
}

export function saveState(state: AppState): void {
  try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* Prototype remains usable without storage. */ }
}

export function progressPercent(course: Course, state: AppState): number {
  const lessons = course.units.flatMap(unit => unit.lessons)
  const total = lessons.length + course.units.length + 1
  const completedVideos = lessons.filter(lesson => state.progress[lesson.id]?.quizDone).length
  const completedUnits = course.units.filter(unit => state.answers.some(answer => answer.questionId === unit.question.id)).length
  const completedFinal = state.answers.some(answer => answer.questionId === course.finalQuestion.id) ? 1 : 0
  return Math.round((completedVideos + completedUnits + completedFinal) / total * 100)
}

export function nextLearningItemId(course: Course, state: AppState): string | undefined {
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (!state.progress[lesson.id]?.quizDone) return lesson.id
    }
    if (!state.answers.some(answer => answer.questionId === unit.question.id)) return unit.question.id
  }
  if (!state.answers.some(answer => answer.questionId === course.finalQuestion.id)) return course.finalQuestion.id
  return undefined
}

export function hasWrongAnswer(state: AppState, lessonId: string): boolean {
  return state.answers.some(answer => answer.lessonId === lessonId && !answer.correct)
}
