import test from 'node:test'
import assert from 'node:assert/strict'
import { demoCourses } from '../lib/demo-data'
import { createFeed, unlockedFrom } from '../lib/quiz-feed'
import {
  getWrongSessionQuizzes,
  isCourseCompleted,
  hasReviewQuiz,
  nextLearningItemId,
  richInitialState,
  type AnswerRecord,
  type AppState,
} from '../lib/app-state'

test('세션 퀴즈를 모두 맞힌 경우 코스 종합 퀴즈에 세션 재출제 문항이 포함되지 않음', () => {
  const reportCourse = demoCourses.find(c => c.id === reportCourseId)!
  // All unit quizzes answered correctly
  const answers: AnswerRecord[] = [
    { id: '1', questionId: reportCourse.units[0].question.id, courseId: reportCourse.id, selected: 0, correct: true, at: 1 },
    { id: '2', questionId: reportCourse.units[1].question.id, courseId: reportCourse.id, selected: 0, correct: true, at: 2 },
  ]

  const items = createFeed(reportCourse, answers)
  const retestItems = items.filter(item => item.type === 'quiz' && item.context.isRetest)
  assert.equal(retestItems.length, 0, '오답이 없으므로 재출제 문항이 없어야 함')

  // Comprehensive quiz final question still present
  const finalItem = items.find(item => item.type === 'quiz' && item.context.kind === 'final')
  assert.ok(finalItem, '코스 종합 퀴즈 본 문항은 포함되어야 함')
})

const reportCourseId = 'report'

test('세션 퀴즈를 틀린 경우 코스 종합 퀴즈에 해당 오답 문항이 재출제 문항으로 포함됨', () => {
  const course = demoCourses.find(c => c.id === 'report')!
  const wrongUnitQuestion = course.units[0].question

  // 1번 세션 퀴즈 오답
  const answers: AnswerRecord[] = [
    { id: 'ans-1', questionId: wrongUnitQuestion.id, courseId: course.id, selected: 2, correct: false, at: 1 },
    { id: 'ans-2', questionId: course.units[1].question.id, courseId: course.id, selected: 0, correct: true, at: 2 },
  ]

  const items = createFeed(course, answers)
  const retestItems = items.filter(item => item.type === 'quiz' && item.context.isRetest)
  assert.equal(retestItems.length, 1, '틀린 세션 퀴즈 1문항이 재출제되어야 함')
  assert.equal(retestItems[0].id, `${wrongUnitQuestion.id}-retest`)
  if (retestItems[0].type === 'quiz') {
    assert.equal(retestItems[0].question.id, wrongUnitQuestion.id)
    assert.equal(retestItems[0].context.kind, 'retest')
    assert.equal(retestItems[0].context.isRetest, true)
  }

  // Check ordering: Retest item must come in comprehensive section before complete slide
  const retestIndex = items.findIndex(item => item.id === `${wrongUnitQuestion.id}-retest`)
  const finalIndex = items.findIndex(item => item.id === course.finalQuestion.id)
  const completeIndex = items.findIndex(item => item.type === 'complete')

  assert.ok(retestIndex < finalIndex, '재출제 문항은 최종 코스 퀴즈 앞에 위치해야 함')
  assert.ok(finalIndex < completeIndex, '최종 코스 퀴즈는 완료 슬라이드 앞에 위치해야 함')
})

test('여러 세션 퀴즈를 틀린 경우 모든 오답 세션 문항이 코스 종합 퀴즈에 재출제됨', () => {
  const course = demoCourses.find(c => c.id === 'report')!

  // 1번, 2번 세션 퀴즈 모두 오답
  const answers: AnswerRecord[] = [
    { id: 'ans-1', questionId: course.units[0].question.id, courseId: course.id, selected: 1, correct: false, at: 1 },
    { id: 'ans-2', questionId: course.units[1].question.id, courseId: course.id, selected: 2, correct: false, at: 2 },
  ]

  const items = createFeed(course, answers)
  const retestItems = items.filter(item => item.type === 'quiz' && item.context.isRetest)
  assert.equal(retestItems.length, 2, '2개의 오답 세션 퀴즈 모두 재출제되어야 함')

  const wrongQuizzes = getWrongSessionQuizzes(course, answers)
  assert.equal(wrongQuizzes.length, 2)
  assert.equal(wrongQuizzes[0].id, course.units[0].question.id)
  assert.equal(wrongQuizzes[1].id, course.units[1].question.id)
})

test('재출제 문항 풀이 전후 unlockedFrom 동작 검증', () => {
  const course = demoCourses.find(c => c.id === 'report')!
  const wrongUnitQuestion = course.units[0].question

  // Session quiz answered wrong (only 1 answer)
  const answersBeforeRetest: AnswerRecord[] = [
    { id: 'ans-1', questionId: wrongUnitQuestion.id, courseId: course.id, selected: 1, correct: false, at: 1 },
    { id: 'ans-2', questionId: course.units[1].question.id, courseId: course.id, selected: 0, correct: true, at: 2 },
  ]

  const items = createFeed(course, answersBeforeRetest)
  const retestIndex = items.findIndex(item => item.id === `${wrongUnitQuestion.id}-retest`)

  // Unlocked index should stop at retest item because it has not been answered a 2nd time yet
  const unlockedBefore = unlockedFrom(0, items, answersBeforeRetest)
  assert.equal(unlockedBefore, retestIndex, '재출제 문제를 풀기 전에는 다음으로 넘어가지 못해야 함')

  // User submits retest answer (now 2 answers exist for this question)
  const answersAfterRetest: AnswerRecord[] = [
    ...answersBeforeRetest,
    { id: 'ans-retest', questionId: wrongUnitQuestion.id, courseId: course.id, selected: wrongUnitQuestion.correct, correct: true, at: 3 },
  ]

  const unlockedAfter = unlockedFrom(0, items, answersAfterRetest)
  assert.ok(unlockedAfter > retestIndex, '재출제 문제 제출 후 다음 코스 종합 퀴즈로 진행 가능해야 함')
})

test('세션 퀴즈 오답 재출제 정답 시 코스 수료(isCourseCompleted) 상태 반영 검증', () => {
  const dataCourse = demoCourses.find(c => c.id === 'data')!
  const allUnitQuestions = dataCourse.units.map(u => u.question)

  // Initial state where 1 unit question is incorrect
  const baseProgress = {
    'data-u1-v1': { position: 5, watched: true, quizDone: true },
    'data-u1-v2': { position: 5, watched: true, quizDone: true },
    'data-u2-v1': { position: 5, watched: true, quizDone: true },
    'data-u2-v2': { position: 5, watched: true, quizDone: true },
  }

  const stateWithWrongSession: AppState = {
    ...richInitialState,
    progress: baseProgress,
    answers: [
      { id: 'u1', questionId: allUnitQuestions[0].id, courseId: dataCourse.id, selected: 1, correct: false, at: 1 },
      { id: 'u2', questionId: allUnitQuestions[1].id, courseId: dataCourse.id, selected: 0, correct: true, at: 2 },
      { id: 'f', questionId: dataCourse.finalQuestion.id, courseId: dataCourse.id, selected: 0, correct: true, at: 3 },
    ],
  }

  // Course must NOT be completed because session quiz was wrong
  assert.equal(isCourseCompleted(dataCourse, stateWithWrongSession), false, '세션 퀴즈 오답이 남아있으면 수료 불가')
  assert.equal(hasReviewQuiz(dataCourse, stateWithWrongSession), true, '세션 퀴즈 오답이 있으면 복습 필요 상태여야 함')
  assert.equal(getWrongSessionQuizzes(dataCourse, stateWithWrongSession.answers).length, 1, '재출제 전에는 미해결 세션 오답 1문항이 존재해야 함')

  // Now, in course comprehensive quiz, user solves the retest question correctly!
  const stateAfterPassingRetest: AppState = {
    ...stateWithWrongSession,
    answers: [
      ...stateWithWrongSession.answers,
      { id: 'u1-retest', questionId: allUnitQuestions[0].id, courseId: dataCourse.id, selected: 0, correct: true, at: 4 },
    ],
  }

  // Course is now completed (진도 100% + 미응시 0 + 오답 0)
  assert.equal(isCourseCompleted(dataCourse, stateAfterPassingRetest), true, '재출제 정답 후 수료 요건 충족')
  assert.equal(hasReviewQuiz(dataCourse, stateAfterPassingRetest), false, '오답이 해소되어 복습 필요 목록에서 제외')
  assert.equal(getWrongSessionQuizzes(dataCourse, stateAfterPassingRetest.answers).length, 0, '재출제 정답 후 미해결 세션 오답 목록에서 완전히 해소되어야 함')
})

test('풍부한 데모 데이터에서 career 강좌에 세션 퀴즈 오답이 반영되어 재출제 대상임을 검증', () => {
  const careerCourse = demoCourses.find(c => c.id === 'career')!
  const wrongSessionQuizzes = getWrongSessionQuizzes(careerCourse, richInitialState.answers)
  assert.ok(wrongSessionQuizzes.length >= 1, 'career 강좌는 기본 데모 데이터에서 세션 퀴즈 오답이 존재해야 함')

  const items = createFeed(careerCourse, richInitialState.answers)
  const retests = items.filter(item => item.type === 'quiz' && item.context.isRetest)
  assert.ok(retests.length >= 1, 'career 강좌는 세션 오답 재출제 문항이 코스 종합 퀴즈에 포함되어야 함')
})

test('재출제 시 또 다시 오답을 제출한 경우 미해결 상태가 유지되고 수료되지 않음', () => {
  const course = demoCourses.find(c => c.id === 'data')!
  const unitQuestion = course.units[0].question

  const baseAnswers: AnswerRecord[] = [
    { id: 'u1', questionId: unitQuestion.id, courseId: course.id, selected: 1, correct: false, at: 1 },
    { id: 'u2', questionId: course.units[1].question.id, courseId: course.id, selected: 0, correct: true, at: 2 },
    { id: 'final', questionId: course.finalQuestion.id, courseId: course.id, selected: 0, correct: true, at: 3 },
  ]

  // 재출제 문제에서도 또 틀린 경우 (2회차 답안도 오답)
  const answersWithRepeatedWrong: AnswerRecord[] = [
    ...baseAnswers,
    { id: 'u1-retest-wrong', questionId: unitQuestion.id, courseId: course.id, selected: 2, correct: false, at: 4 },
  ]

  const wrongQuizzes = getWrongSessionQuizzes(course, answersWithRepeatedWrong)
  assert.equal(wrongQuizzes.length, 1, '재출제에서 또 틀렸으므로 여전히 미해결 오답 문항으로 남아있어야 함')
  assert.equal(wrongQuizzes[0].id, unitQuestion.id)

  const testState: AppState = {
    ...richInitialState,
    answers: answersWithRepeatedWrong,
  }
  assert.equal(isCourseCompleted(course, testState), false, '재출제 오답이 남아있으면 수료될 수 없음')
  assert.equal(hasReviewQuiz(course, testState), true, '복습 필요 상태가 유지되어야 함')
})

test('nextLearningItemId가 세션 퀴즈 오답 시 재출제 슬라이드로 안내하고 완료 후 다음으로 진행', () => {
  const course = demoCourses.find(c => c.id === 'report')!
  const u1Question = course.units[0].question

  const allVideoWatchedProgress = Object.fromEntries(
    course.units.flatMap(u => u.lessons).map(l => [l.id, { position: l.duration, watched: true, quizDone: true }])
  )

  // 1유닛 퀴즈 오답, 2유닛 퀴즈 정답
  const stateDuringCourse: AppState = {
    ...richInitialState,
    progress: allVideoWatchedProgress,
    answers: [
      { id: 'ans-u1', questionId: u1Question.id, courseId: course.id, selected: 2, correct: false, at: 1 },
      { id: 'ans-u2', questionId: course.units[1].question.id, courseId: course.id, selected: 0, correct: true, at: 2 },
    ],
  }

  // 아직 재출제 문항을 풀지 않았으므로 nextLearningItemId는 해당 재출제 슬라이드를 가리켜야 함
  const nextTarget = nextLearningItemId(course, stateDuringCourse)
  assert.equal(nextTarget, `${u1Question.id}-retest`, '세션 퀴즈 오답이 있으면 종합 퀴즈의 재출제 문항으로 안내해야 함')

  // 재출제 문항 응시 후
  const stateAfterRetest: AppState = {
    ...stateDuringCourse,
    answers: [
      ...stateDuringCourse.answers,
      { id: 'ans-u1-retest', questionId: u1Question.id, courseId: course.id, selected: 0, correct: true, at: 3 },
    ],
  }

  const nextAfterRetest = nextLearningItemId(course, stateAfterRetest)
  assert.equal(nextAfterRetest, course.finalQuestion.id, '재출제 후에는 코스 종합 퀴즈 본 문항으로 진행해야 함')

  // 코스 종합 퀴즈까지 완료 후
  const stateAfterFinal: AppState = {
    ...stateAfterRetest,
    answers: [
      ...stateAfterRetest.answers,
      { id: 'ans-final', questionId: course.finalQuestion.id, courseId: course.id, selected: 0, correct: true, at: 4 },
    ],
  }

  const nextAfterFinal = nextLearningItemId(course, stateAfterFinal)
  assert.equal(nextAfterFinal, undefined, '모든 학습 및 퀴즈가 끝나면 다음 항목이 없어야 함')
})

test('다중 코스 종합 퀴즈(courseQuizzes)가 있는 강좌의 종합 퀴즈 피드 항목 생성 검증', () => {
  const baseCourse = demoCourses.find(c => c.id === 'report')!
  const multiQuizCourse = {
    ...baseCourse,
    courseQuizzes: [
      baseCourse.finalQuestion,
      {
        id: `${baseCourse.id}-extra-quiz`,
        prompt: '추가 종합 평가 문항',
        options: ['1번', '2번'],
        correct: 0,
        explanation: '해설',
      },
    ],
  }

  // 1유닛 퀴즈 오답
  const answers: AnswerRecord[] = [
    { id: '1', questionId: multiQuizCourse.units[0].question.id, courseId: multiQuizCourse.id, selected: 1, correct: false, at: 1 },
    { id: '2', questionId: multiQuizCourse.units[1].question.id, courseId: multiQuizCourse.id, selected: 0, correct: true, at: 2 },
  ]

  const items = createFeed(multiQuizCourse, answers)
  const retests = items.filter(item => item.type === 'quiz' && item.context.isRetest)
  const finals = items.filter(item => item.type === 'quiz' && item.context.kind === 'final')

  assert.equal(retests.length, 1, '세션 오답 재출제 1문항 포함')
  assert.equal(finals.length, 2, '다중 종합 퀴즈 2문항 모두 피드에 포함되어야 함')

  // 순서: 재출제 -> 종합 퀴즈들 -> 완료 슬라이드
  const retestIdx = items.findIndex(item => item.id === retests[0].id)
  const final1Idx = items.findIndex(item => item.id === finals[0].id)
  const final2Idx = items.findIndex(item => item.id === finals[1].id)
  const completeIdx = items.findIndex(item => item.type === 'complete')

  assert.ok(retestIdx < final1Idx && final1Idx < final2Idx && final2Idx < completeIdx, '재출제 -> 종합1 -> 종합2 -> 완료 순서 보장')
})
