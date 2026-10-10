import type { Course, Lesson, Question } from './demo-data'
import type { AnswerRecord } from './app-state'

export type LearningQuizContext = {
  kind: 'video' | 'unit' | 'final' | 'course-quiz' | 'retest'
  courseId: string
  unitIndex: number
  lessonId?: string
  questionId?: string
  isRetest?: boolean
}

export type FeedItem =
  | { id: string; type: 'video'; lesson: Lesson; number: number }
  | { id: string; type: 'quiz'; question: Question; context: LearningQuizContext }
  | { id: string; type: 'complete' }

export function createFeed(course: Course, answers: AnswerRecord[] = []): FeedItem[] {
  const items: FeedItem[] = []
  let number = 0
  course.units.forEach((unit, unitIndex) => {
    unit.lessons.forEach(lesson => {
      number += 1
      items.push({ id: lesson.id, type: 'video', lesson, number })
    })
    // 퀴즈는 영상마다가 아니라 섹션이 끝나면 나옴 (단위 확인 퀴즈)
    items.push({
      id: unit.question.id,
      type: 'quiz',
      question: unit.question,
      context: { kind: 'unit', courseId: course.id, unitIndex, questionId: unit.question.id },
    })
  })

  // 세션 퀴즈를 틀린 경우에 코스 종합 퀴즈에 재출제
  course.units.forEach((unit, unitIndex) => {
    const unitAnswers = answers.filter(a => a.questionId === unit.question.id)
    if (unitAnswers.length > 0 && !unitAnswers[0].correct) {
      items.push({
        id: `${unit.question.id}-retest`,
        type: 'quiz',
        question: unit.question,
        context: {
          kind: 'retest',
          courseId: course.id,
          unitIndex,
          questionId: unit.question.id,
          isRetest: true,
        },
      })
    }
  })

  // 코스 종합 퀴즈 본 문항
  const finalQuizzes = course.courseQuizzes && course.courseQuizzes.length > 0 ? course.courseQuizzes : [course.finalQuestion]
  finalQuizzes.forEach(fq => {
    items.push({
      id: fq.id,
      type: 'quiz',
      question: fq,
      context: { kind: 'final', courseId: course.id, unitIndex: course.units.length - 1, questionId: fq.id },
    })
  })
  items.push({ id: `${course.id}-complete`, type: 'complete' })
  return items
}

export function unlockedFrom(start: number, items: FeedItem[], answers: AnswerRecord[]): number {
  let index = start
  while (index < items.length - 1) {
    const item = items[index]
    if (item.type === 'quiz') {
      if (item.context.kind === 'retest') {
        const qAnswers = answers.filter(answer => answer.questionId === item.question.id)
        if (qAnswers.length < 2) break
      } else {
        if (!answers.some(answer => answer.questionId === item.question.id)) break
      }
    }
    index += 1
  }
  return index
}
