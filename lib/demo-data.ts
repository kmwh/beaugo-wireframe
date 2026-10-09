export type Question = {
  id: string
  prompt: string
  options: string[]
  correct: number
  explanation: string
}

export type TranscriptSegment = { start: number; text: string }

export type Lesson = {
  id: string
  title: string
  duration: number
  video: string
  transcript: TranscriptSegment[]
  question: Question
  uploadedBlobId?: string
}

export type LearningUnit = {
  id: string
  title: string
  lessons: Lesson[]
  question: Question
}

export type Course = {
  id: string
  title: string
  teacher: string
  job: string
  topic: string
  tags: string[]
  level: string
  price: number
  plannedMinutes: number
  cover: string
  summary: string
  otVideo: string
  otBlobId?: string
  units: LearningUnit[]
  finalQuestion: Question
  isCreatorCourse?: boolean
}

const cover = {
  report: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80',
  data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  excel: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80',
  career: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
}

function question(id: string, topic: string): Question {
  return {
    id,
    prompt: `${topic}에서 가장 먼저 확인해야 할 것은 무엇인가요?`,
    options: ['목적과 해결할 문제', '화면의 색상', '파일 이름', '무조건 많은 정보'],
    correct: 0,
    explanation: `${topic}의 첫 단계는 목적과 해결할 문제를 분명하게 정하는 것입니다.`,
  }
}

function lesson(courseId: string, unit: number, index: number, title: string, video: string): Lesson {
  const id = `${courseId}-u${unit}-v${index}`
  return {
    id,
    title,
    duration: 5,
    video,
    transcript: [
      { start: 0, text: `${title}를 시작하기 전에 목적과 해결할 문제를 정리합니다.` },
      { start: 2, text: '핵심을 한 문장으로 쓰고, 실제 업무에 적용할 다음 행동을 선택해 보세요.' },
    ],
    question: question(`${id}-quiz`, title),
  }
}

function course(input: {
  id: string; title: string; teacher: string; job: string; topic: string; tags: string[];
  level: string; price: number; plannedMinutes: number; cover: string; summary: string; titles: [string, string, string, string];
}): Course {
  const video = `/demo/${input.id}.webm`
  return {
    ...input,
    otVideo: video,
    units: [
      {
        id: `${input.id}-u1`, title: '기본 개념',
        lessons: [lesson(input.id, 1, 1, input.titles[0], video), lesson(input.id, 1, 2, input.titles[1], video)],
        question: question(`${input.id}-unit-1`, '기본 개념'),
      },
      {
        id: `${input.id}-u2`, title: '실무 적용',
        lessons: [lesson(input.id, 2, 1, input.titles[2], video), lesson(input.id, 2, 2, input.titles[3], video)],
        question: question(`${input.id}-unit-2`, '실무 적용'),
      },
    ],
    finalQuestion: question(`${input.id}-final`, input.title),
  }
}

export const demoCourses: Course[] = [
  course({
    id: 'report', title: '일잘러의 보고서 작성법', teacher: '김지윤 강사', job: '기획·PM', topic: '문서 작성',
    tags: ['보고서', '문서', '기획서'], level: '초급', price: 29000, plannedMinutes: 120, cover: cover.report,
    summary: '핵심부터 전달하는 보고서의 구조와 문장을 짧게 배웁니다.',
    titles: ['보고서의 목적 정하기', '핵심 구조 잡기', '설득력 있는 문장', '다음 행동 제안하기'],
  }),
  course({
    id: 'data', title: '데이터로 설득하는 기획', teacher: '박도현 강사', job: '데이터 분석', topic: '데이터 분석',
    tags: ['데이터', '기획', '시각화'], level: '중급', price: 39000, plannedMinutes: 150, cover: cover.data,
    summary: '질문을 정하고 수치를 읽어 의사결정으로 연결합니다.',
    titles: ['분석 질문 세우기', '필요한 데이터 고르기', '표와 그래프 읽기', '인사이트 전달하기'],
  }),
  course({
    id: 'excel', title: '실무자를 위한 엑셀 자동화', teacher: '이하늘 강사', job: '사무 생산성', topic: '업무 자동화',
    tags: ['엑셀', '자동화', '함수'], level: '초급', price: 34000, plannedMinutes: 110, cover: cover.excel,
    summary: '반복 업무를 찾아 함수와 자동화로 시간을 줄입니다.',
    titles: ['반복 작업 찾기', '데이터 정리하기', '함수로 연결하기', '자동화 점검하기'],
  }),
  course({
    id: 'career', title: '커리어 전환 포트폴리오', teacher: '최유나 강사', job: '커리어', topic: '직무 전환',
    tags: ['이직', '포트폴리오', '취업'], level: '중급', price: 24000, plannedMinutes: 90, cover: cover.career,
    summary: '기존 경험을 목표 직무의 성과로 설명하는 방법을 배웁니다.',
    titles: ['경험 정리하기', '성과를 수치로 표현하기', '포트폴리오 구성', '지원 전략 점검'],
  }),
]

export const jobs = ['기획·PM', '마케팅', '데이터 분석', '개발·IT', '디자인', '사무 생산성', '커리어']
export const interests = ['문서 작성', '업무 자동화', '데이터 분석', '커뮤니케이션', '직무 전환', '포트폴리오']
export const timeSlots = ['출근 전', '출퇴근 중', '점심시간', '퇴근 후', '자기 전']

export function allLessons(course: Course): Lesson[] { return course.units.flatMap(unit => unit.lessons) }
export function minutes(course: Course): number { return course.plannedMinutes }
export function won(value: number): string { return value === 0 ? '무료' : `${value.toLocaleString('ko-KR')}원` }
