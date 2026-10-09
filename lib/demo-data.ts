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

export type CourseStatus = 'draft' | 'under_review' | 'published' | 'rejected'

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
  courseQuizzes?: Question[]
  teacherAvatar?: string
  teacherBio?: string
  isCreatorCourse?: boolean
  status?: CourseStatus
  isPublic?: boolean
  studentCount?: number
  rejectionReason?: string
}

const cover = {
  report: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80',
  data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  excel: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80',
  career: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
}

function question(id: string, topic: string, promptText?: string, options?: string[], correct?: number, explanation?: string): Question {
  return {
    id,
    prompt: promptText ?? `${topic}에서 가장 먼저 확인해야 할 것은 무엇인가요?`,
    options: options ?? ['목적과 해결할 문제', '화면의 색상', '파일 이름', '무조건 많은 정보'],
    correct: correct ?? 0,
    explanation: explanation ?? `${topic}의 첫 단계는 목적과 해결할 문제를 분명하게 정하는 것입니다.`,
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
  id: string
  title: string
  teacher: string
  teacherAvatar?: string
  teacherBio?: string
  job: string
  topic: string
  tags: string[]
  level: string
  price: number
  plannedMinutes: number
  cover: string
  summary: string
  titles: [string, string, string, string]
  status?: CourseStatus
  isPublic?: boolean
  studentCount?: number
  rejectionReason?: string
  courseQuizzes?: Question[]
}): Course {
  const video = `/demo/${input.id.includes('report') || input.id.includes('data') || input.id.includes('excel') || input.id.includes('career') ? input.id : 'report'}.webm`
  return {
    ...input,
    teacherAvatar:
      input.teacherAvatar ??
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    teacherBio: input.teacherBio ?? `${input.teacher} · ${input.job} 실무 멘토`,
    status: input.status ?? 'published',
    isPublic: input.isPublic ?? true,
    studentCount: input.studentCount ?? 24,
    otVideo: video,
    units: [
      {
        id: `${input.id}-u1`,
        title: '섹션 1. 기본 개념 및 구조화',
        lessons: [lesson(input.id, 1, 1, input.titles[0], video), lesson(input.id, 1, 2, input.titles[1], video)],
        question: question(`${input.id}-unit-1`, '기본 개념'),
      },
      {
        id: `${input.id}-u2`,
        title: '섹션 2. 실무 적용 및 스킬업',
        lessons: [lesson(input.id, 2, 1, input.titles[2], video), lesson(input.id, 2, 2, input.titles[3], video)],
        question: question(`${input.id}-unit-2`, '실무 적용'),
      },
    ],
    finalQuestion: question(
      `${input.id}-final`,
      input.title,
      `${input.title} 코스 종합 퀴즈: 실무 적용을 위한 가장 중요한 원칙은?`,
      ['목적과 해결할 과제 정의', '문서 서식만 화려하게 꾸미기', '추상적인 아이디어만 나열하기', '불필요한 분량 늘리기'],
      0,
      '코스 학습의 핵심은 목적과 해결할 문제를 분명하게 규명하고 실무에 즉시 적용하는 것입니다.'
    ),
    courseQuizzes: [
      question(
        `${input.id}-final`,
        input.title,
        `${input.title} 코스 종합 퀴즈: 실무 적용을 위한 가장 중요한 원칙은?`,
        ['목적과 해결할 과제 정의', '문서 서식만 화려하게 꾸미기', '추상적인 아이디어만 나열하기', '불필요한 분량 늘리기'],
        0,
        '코스 학습의 핵심은 목적과 해결할 문제를 분명하게 규명하고 실무에 즉시 적용하는 것입니다.'
      ),
    ],
  }
}

export const demoCourses: Course[] = [
  course({
    id: 'report',
    title: '일잘러의 보고서 작성법',
    teacher: '김지윤 강사',
    teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    teacherBio: '대기업 12년 차 기획 리드 · 누적 수강생 1.2만 명의 기획 멘토',
    job: '기획·PM',
    topic: '문서 작성',
    tags: ['보고서', '문서', '기획서'],
    level: '초급',
    price: 29000,
    plannedMinutes: 120,
    cover: cover.report,
    summary: '핵심부터 전달하는 보고서의 구조와 문장을 짧게 배웁니다.',
    titles: ['보고서의 목적 정하기', '핵심 구조 잡기', '설득력 있는 문장', '다음 행동 제안하기'],
    status: 'published',
    isPublic: true,
    studentCount: 120,
  }),
  course({
    id: 'data',
    title: '데이터로 설득하는 기획',
    teacher: '박도현 강사',
    teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    teacherBio: '빅테크 수석 데이터 사이언티스트 · 비즈니스 의사결정 전문가',
    job: '데이터 분석',
    topic: '데이터 분석',
    tags: ['데이터', '기획', '시각화'],
    level: '중급',
    price: 39000,
    plannedMinutes: 150,
    cover: cover.data,
    summary: '질문을 정하고 수치를 읽어 의사결정으로 연결합니다.',
    titles: ['분석 질문 세우기', '필요한 데이터 고르기', '표와 그래프 읽기', '인사이트 전달하기'],
    status: 'published',
    isPublic: true,
    studentCount: 75,
  }),
  course({
    id: 'excel',
    title: '실무자를 위한 엑셀 자동화',
    teacher: '이하늘 강사',
    teacherAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    teacherBio: '업무 자동화 컨설턴트 · 마이크로소프트 공인 MVP',
    job: '사무 생산성',
    topic: '업무 자동화',
    tags: ['엑셀', '자동화', '함수'],
    level: '초급',
    price: 34000,
    plannedMinutes: 110,
    cover: cover.excel,
    summary: '반복 업무를 찾아 함수와 자동화로 시간을 줄입니다.',
    titles: ['반복 작업 찾기', '데이터 정리하기', '함수로 연결하기', '자동화 점검하기'],
    status: 'published',
    isPublic: true,
    studentCount: 160,
  }),
  course({
    id: 'career',
    title: '커리어 전환 포트폴리오',
    teacher: '최유나 강사',
    teacherAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    teacherBio: '커리어 멘토링 8년 차 · 이직 및 포트폴리오 전문 디렉터',
    job: '커리어',
    topic: '직무 전환',
    tags: ['이직', '포트폴리오', '취업'],
    level: '중급',
    price: 24000,
    plannedMinutes: 90,
    cover: cover.career,
    summary: '기존 경험을 목표 직무의 성과로 설명하는 방법을 배웁니다.',
    titles: ['경험 정리하기', '성과를 수치로 표현하기', '포트폴리오 구성', '지원 전략 점검'],
    status: 'published',
    isPublic: true,
    studentCount: 52,
  }),
]

// Mock creator courses covering '검수 중' and '등록 완료'
export const initialCreatorCourses: Course[] = [
  course({
    id: 'creator-c1',
    title: '신임 팀장을 위한 1on1 미팅 가이드',
    teacher: '김강사',
    job: '기획·PM',
    topic: '커뮤니케이션',
    tags: ['리더십', '1on1', '피드백'],
    level: '중급',
    price: 35000,
    plannedMinutes: 80,
    cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    summary: '팀원의 잠재력을 이끌어내는 정기 1on1 질문 프레임워크와 피드백 기술을 공유합니다.',
    titles: ['1on1 미팅의 목적과 아젠다', '신뢰를 쌓는 경청의 기술', '성장을 돕는 피드백 공식', '액션 플랜 점검과 팔로업'],
    status: 'published',
    isPublic: true,
    studentCount: 18,
  }),
  course({
    id: 'creator-c2',
    title: '프롬프트 엔지니어링 실전 업무 팁',
    teacher: '김강사',
    job: '사무 생산성',
    topic: '업무 자동화',
    tags: ['AI', 'ChatGPT', '프롬프트'],
    level: '초급',
    price: 29000,
    plannedMinutes: 60,
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    summary: '업무 보고서, 이메일, 번역에 최적화된 프롬프트 작성 공식 5가지를 배웁니다.',
    titles: ['역할 부여와 맥락 설정', '구체적 제약조건 부여법', 'Few-shot 예시 작성법', '원하는 출력 포맷 지정하기'],
    status: 'under_review',
    isPublic: false,
    studentCount: 0,
  }),
  course({
    id: 'creator-c3',
    title: '데이터 기반 B2B 세일즈 제안서',
    teacher: '김강사',
    job: '기획·PM',
    topic: '문서 작성',
    tags: ['세일즈', '제안서', 'B2B'],
    level: '고급',
    price: 49000,
    plannedMinutes: 90,
    cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    summary: '고객사의 비즈니스 Pain Point를 정량 분석하여 수주 확률을 높이는 제안서 작성법입니다.',
    titles: ['고객사 문제점 정의와 가설', '정량적 ROI 산출 로직', '경쟁사 대비 차별화 제안', '리스크 대응 및 구축 일정'],
    status: 'draft',
    isPublic: false,
    studentCount: 0,
  }),
]

export const jobs = ['기획·PM', '마케팅', '데이터 분석', '개발·IT', '디자인', '사무 생산성', '커리어']
export const interests = ['문서 작성', '업무 자동화', '데이터 분석', '커뮤니케이션', '직무 전환', '포트폴리오']
export const timeSlots = ['출근 전', '출퇴근 중', '점심시간', '퇴근 후', '자기 전']

export function allLessons(course: Course): Lesson[] {
  return course.units.flatMap(unit => unit.lessons)
}

export function minutes(course: Course): number {
  return course.plannedMinutes
}

export function won(value: number): string {
  return value === 0 ? '무료' : `${value.toLocaleString('ko-KR')}원`
}

export type CreatorDailyStat = {
  day: string
  label: string
  views: number
  students: number
  revenue: number
}

export const richDailyStats: CreatorDailyStat[] = [
  { day: '10.01', label: '10월 1일', views: 110, students: 6, revenue: 174000 },
  { day: '10.02', label: '10월 2일', views: 135, students: 8, revenue: 232000 },
  { day: '10.03', label: '10월 3일', views: 98, students: 5, revenue: 145000 },
  { day: '10.04', label: '10월 4일', views: 160, students: 11, revenue: 319000 },
  { day: '10.05', label: '10월 5일', views: 185, students: 14, revenue: 406000 },
  { day: '10.06', label: '10월 6일', views: 220, students: 16, revenue: 464000 },
  { day: '10.07', label: '10월 7일', views: 175, students: 10, revenue: 290000 },
  { day: '10.08', label: '10월 8일', views: 195, students: 12, revenue: 348000 },
  { day: '10.09', label: '10월 9일', views: 142, students: 9, revenue: 261000 },
]

export const emptyDailyStats: CreatorDailyStat[] = []

export const richPurchasedCourseIds: string[] = ['report', 'data', 'career', 'excel']
export const emptyPurchasedCourseIds: string[] = []

export const richLikes: string[] = ['report-u1-v1', 'ot-excel', 'data-u1-v1', 'ot-career']
export const emptyLikes: string[] = []

export const emptyCreatorCourses: Course[] = []

