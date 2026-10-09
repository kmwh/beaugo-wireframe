'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileVideo,
  LayoutDashboard,
  ListVideo,
  Plus,
  Sparkles,
  Users,
  UserRound,
  Trash2,
  Edit3,
  Eye,
  Lock,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  X,
  Volume2,
  Clock,
  Camera,
  Building2,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import {
  won,
  jobs,
  type Course,
  type CourseStatus,
  type Lesson,
  type LearningUnit,
  type Question,
} from '@/lib/demo-data'
import { progressPercent, type AppState, type CreatorProfile } from '@/lib/app-state'
import { inspectVideo, saveVideo } from '@/lib/blob-store'

type Stage = 'dashboard' | 'create' | 'stats' | 'mypage'
type UploadKind = 'lesson' | 'ot'
type FileState = {
  status: 'empty' | 'checking' | 'ready' | 'rejected'
  name: string
  duration: number
  error: string
  blobId: string
}

const emptyFile: FileState = { status: 'empty', name: '', duration: 0, error: '', blobId: '' }

type FormLesson = {
  id: string
  title: string
  duration: number
  fileState: FileState
  videoUrl?: string
  transcript: { start: number; text: string }[]
  quiz: Question
}

type FormSection = {
  id: string
  title: string
  lessons: FormLesson[]
}

export function CreatorStudio({
  profile,
  courses,
  activity,
  onPublish,
  onUpdateCourse,
  onDeleteCourse,
  onUpdateProfile,
  onSwitch,
}: {
  profile: CreatorProfile
  courses: Course[]
  activity: AppState
  onPublish: (course: Course) => void
  onUpdateCourse: (course: Course) => void
  onDeleteCourse: (courseId: string) => void
  onUpdateProfile: (profile: CreatorProfile) => void
  onSwitch: () => void
}) {
  const [stage, setStage] = useState<Stage>('dashboard')
  const [manageCourseId, setManageCourseId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  // Course Creation Step (1: 정보, 2: 영상 업로드 & 섹션, 3: 코스 퀴즈)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)

  // Step 1: 강좌 메타데이터
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [topic, setTopic] = useState(profile.keywords[0] ?? '문서 작성')
  const [selectedJob, setSelectedJob] = useState(profile.job || jobs[0])
  const [level, setLevel] = useState('초급')
  const [price, setPrice] = useState(29000)
  const [plannedMinutes, setPlannedMinutes] = useState(40)

  // Step 2: 무료 OT (선택 사항) & 섹션/영상 구조
  const [otFile, setOtFile] = useState<FileState>(emptyFile)
  const [sections, setSections] = useState<FormSection[]>([
    {
      id: 'sec-1',
      title: '섹션 1. 기본 개념 및 구조화',
      lessons: [
        {
          id: 'les-1-1',
          title: '1강. 목적과 해결할 문제 정의',
          duration: 5,
          fileState: emptyFile,
          transcript: [
            { start: 0, text: '핵심 목적과 해결할 과제를 한 문장으로 정의합니다.' },
            { start: 2, text: '실무에 즉시 적용할 수 있는 액션 아이템을 도출해 보세요.' },
          ],
          quiz: {
            id: 'les-1-1-quiz',
            prompt: '강의에서 가장 먼저 정해야 할 핵심 원칙은 무엇인가요?',
            options: ['목적과 해결할 문제', '화면의 색상과 폰트', '문서의 분량 늘이기', '관행 답습하기'],
            correct: 0,
            explanation: '업무 보고서의 첫 단계는 목적과 해결할 문제를 분명하게 정하는 것입니다.',
          },
        },
      ],
    },
  ])

  // Step 3: 코스 퀴즈 목록
  const [courseQuizzes, setCourseQuizzes] = useState<Question[]>([
    {
      id: 'cq-init-1',
      prompt: '코스 종합 퀴즈: 의사결정권자를 설득하기 위한 최우선 요소는?',
      options: ['정량적 근거와 기대효과', '화려한 서식 디자인', '무조건 많은 데이터 분량', '추상적인 표현'],
      correct: 0,
      explanation: '의사결정권자는 정량적 근거와 기대효과를 중심으로 실행 여부를 판단합니다.',
    },
  ])

  // 마이페이지 상태
  const [profileName, setProfileName] = useState(profile.name || '김강사')
  const [profileAvatar, setProfileAvatar] = useState(
    profile.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  )
  const [profileBio, setProfileBio] = useState(profile.bio || '')
  const [bank, setBank] = useState(profile.settlementAccount?.bank || '신한은행')
  const [accountNumber, setAccountNumber] = useState(
    profile.settlementAccount?.accountNumber || '110-384-928172'
  )
  const [holder, setHolder] = useState(profile.settlementAccount?.holder || profile.name || '김강사')

  // 강좌 관리 페이지 (manageCourseId 선택 시) 내부 상태
  const managingCourse = courses.find(c => c.id === manageCourseId) || null
  const [manageTitle, setManageTitle] = useState('')
  const [manageSummary, setManageSummary] = useState('')
  const [manageJob, setManageJob] = useState(jobs[0])
  const [manageTopic, setManageTopic] = useState('')
  const [manageLevel, setManageLevel] = useState('초급')
  const [managePrice, setManagePrice] = useState(29000)
  const [manageMinutes, setManageMinutes] = useState(60)
  const [manageSections, setManageSections] = useState<FormSection[]>([])
  const [manageQuizzes, setManageQuizzes] = useState<Question[]>([])
  const [isAiRegenerating, setIsAiRegenerating] = useState(false)
  const [isReviewed, setIsReviewed] = useState(true)
  const [deleteWarningModal, setDeleteWarningModal] = useState(false)
  const [statsMetric, setStatsMetric] = useState<'views' | 'students' | 'revenue'>('views')
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(8)

  // 동기화: managingCourse가 바뀔 때 수정 폼 채우기
  useEffect(() => {
    if (!managingCourse) return
    setManageTitle(managingCourse.title)
    setManageSummary(managingCourse.summary)
    setManageJob(managingCourse.job)
    setManageTopic(managingCourse.topic)
    setManageLevel(managingCourse.level)
    setManagePrice(managingCourse.price)
    setManageMinutes(managingCourse.plannedMinutes)

    const convertedSections: FormSection[] = managingCourse.units.map(unit => ({
      id: unit.id,
      title: unit.title,
      lessons: unit.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        fileState: {
          status: 'ready',
          name: `${lesson.title}.mp4`,
          duration: lesson.duration,
          error: '',
          blobId: lesson.uploadedBlobId || '',
        },
        videoUrl: lesson.video,
        transcript: lesson.transcript || [
          { start: 0, text: `${lesson.title}의 핵심 개념을 설명합니다.` },
          { start: 2, text: '실무에 적용할 액션 아이템을 정리합니다.' },
        ],
        quiz: lesson.question,
      })),
    }))
    setManageSections(convertedSections)
    setManageQuizzes(
      managingCourse.courseQuizzes || [
        managingCourse.finalQuestion || {
          id: `${managingCourse.id}-final`,
          prompt: `${managingCourse.title} 종합 퀴즈`,
          options: ['정답 보기', '오답 1', '오답 2', '오답 3'],
          correct: 0,
          explanation: '핵심 개념을 복습합니다.',
        },
      ]
    )
    setIsReviewed(true)
  }, [managingCourse])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (msg: string) => setToast(msg)

  // 파일 업로드 핸들러
  async function chooseFile(
    target: 'ot' | { sectionIndex: number; lessonIndex: number; isManage?: boolean },
    file?: File
  ) {
    if (!file) return
    if (target === 'ot') {
      setOtFile({ status: 'checking', name: file.name, duration: 0, error: '', blobId: '' })
      try {
        const duration = await inspectVideo(file)
        const blobId = `ot-${crypto.randomUUID()}`
        await saveVideo(blobId, file)
        setOtFile({ status: 'ready', name: file.name, duration, error: '', blobId })
        showToast('무료 OT 영상 검증이 완료되었습니다.')
      } catch {
        const blobId = `ot-${crypto.randomUUID()}`
        setOtFile({ status: 'ready', name: file.name, duration: 30, error: '', blobId })
        showToast('무료 OT 영상이 선택되었습니다.')
      }
      return
    }

    const { sectionIndex, lessonIndex, isManage } = target
    const currentSections = isManage ? manageSections : sections
    const updateSections = isManage ? setManageSections : setSections

    const updated = [...currentSections]
    updated[sectionIndex].lessons[lessonIndex].fileState = {
      status: 'checking',
      name: file.name,
      duration: 0,
      error: '',
      blobId: '',
    }
    updateSections(updated)

    try {
      const duration = await inspectVideo(file)
      const blobId = `lesson-${crypto.randomUUID()}`
      await saveVideo(blobId, file)
      const finalUpdated = [...currentSections]
      finalUpdated[sectionIndex].lessons[lessonIndex].fileState = {
        status: 'ready',
        name: file.name,
        duration: Math.round(duration),
        error: '',
        blobId,
      }
      updateSections(finalUpdated)
      showToast('학습 영상이 검증되었습니다.')
    } catch {
      const blobId = `lesson-${crypto.randomUUID()}`
      const finalUpdated = [...currentSections]
      finalUpdated[sectionIndex].lessons[lessonIndex].fileState = {
        status: 'ready',
        name: file.name,
        duration: 15,
        error: '',
        blobId,
      }
      updateSections(finalUpdated)
      showToast('학습 영상이 선택되었습니다.')
    }
  }

  // 섹션 & 영상 조작 함수들 (등록 모드)
  function addSection() {
    setSections(prev => [
      ...prev,
      {
        id: `sec-${crypto.randomUUID()}`,
        title: `섹션 ${prev.length + 1}. 새로운 핵심 섹션`,
        lessons: [
          {
            id: `les-${crypto.randomUUID()}`,
            title: `1강. 섹션 개요 및 실습`,
            duration: 5,
            fileState: emptyFile,
            transcript: [
              { start: 0, text: '새로운 섹션의 핵심 학습 내용을 확인합니다.' },
              { start: 2, text: '실무 예제를 통해 즉시 적용할 수 있도록 합니다.' },
            ],
            quiz: {
              id: `quiz-${crypto.randomUUID()}`,
              prompt: '이 섹션의 핵심 포인트는 무엇인가요?',
              options: ['목적과 실행 방안', '임의의 결정', '무관한 정보', '외형적 서식'],
              correct: 0,
              explanation: '목적에 맞는 실행 방안을 정립하는 것이 핵심입니다.',
            },
          },
        ],
      },
    ])
  }

  function addLessonToSection(sectionIdx: number) {
    setSections(prev => {
      const updated = [...prev]
      const count = updated[sectionIdx].lessons.length
      updated[sectionIdx].lessons.push({
        id: `les-${crypto.randomUUID()}`,
        title: `${count + 1}강. 상세 실전 테크닉`,
        duration: 5,
        fileState: emptyFile,
        transcript: [
          { start: 0, text: '상세 테크닉을 익히고 실무 체크리스트를 점검합니다.' },
          { start: 2, text: '결과를 정량 수치로 정리하여 보고합니다.' },
        ],
        quiz: {
          id: `quiz-${crypto.randomUUID()}`,
          prompt: '실전 테크닉 적용 시 유의할 점은?',
          options: ['정량적 지표 기반 실행', '주관적 추측', '형식적 서식', '정보 누락'],
          correct: 0,
          explanation: '정량적 지표를 기반으로 실행하여 성과를 입증해야 합니다.',
        },
      })
      return updated
    })
  }

  // 코스 퀴즈 문제 추가 함수
  function addCourseQuiz(isManage = false) {
    const newQ: Question = {
      id: `cq-${crypto.randomUUID()}`,
      prompt: '새로운 코스 종합 퀴즈 질문을 입력하세요.',
      options: ['정답 보기 A', '오답 보기 B', '오답 보기 C', '오답 보기 D'],
      correct: 0,
      explanation: '정답에 대한 명확한 실무 해설을 입력하세요.',
    }
    if (isManage) {
      setManageQuizzes(prev => [...prev, newQ])
    } else {
      setCourseQuizzes(prev => [...prev, newQ])
    }
  }

  // 새 강좌 저장 (임시 저장 or 검수 요청)
  function handleSaveNewCourse(saveStatus: CourseStatus) {
    if (!title.trim() || !summary.trim() || !topic.trim()) {
      showToast('강좌명, 소개, 주제를 모두 입력해 주세요.')
      return
    }

    const courseId = `creator-${crypto.randomUUID()}`

    const builtUnits: LearningUnit[] = sections.map((sec, secIdx) => ({
      id: `${courseId}-sec-${secIdx + 1}`,
      title: sec.title.trim(),
      lessons: sec.lessons.map((les, lesIdx) => ({
        id: `${courseId}-sec-${secIdx + 1}-les-${lesIdx + 1}`,
        title: les.title.trim(),
        duration: les.fileState.duration || 5,
        video: '/demo/report.webm',
        uploadedBlobId: les.fileState.blobId || undefined,
        transcript: les.transcript,
        question: les.quiz,
      })),
      question: {
        id: `${courseId}-sec-${secIdx + 1}-q`,
        prompt: `${sec.title} 확인 퀴즈`,
        options: ['핵심 목적 달성', '오답 1', '오답 2', '오답 3'],
        correct: 0,
        explanation: '섹션의 핵심 원칙을 확인합니다.',
      },
    }))

    const defaultFinalQ: Question = courseQuizzes[0] || {
      id: `${courseId}-final`,
      prompt: `${title} 코스 종합 평가`,
      options: ['목적과 기대효과', '형식적 서식', '임의의 결정', '길이 늘이기'],
      correct: 0,
      explanation: '코스 핵심을 완벽히 숙지해야 합니다.',
    }

    const newCourse: Course = {
      id: courseId,
      title: title.trim(),
      teacher: profile.name || '김강사',
      job: selectedJob,
      topic: topic.trim(),
      tags: [...profile.keywords, topic.trim()],
      level,
      price: Math.max(0, price),
      plannedMinutes: Math.max(1, plannedMinutes),
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      summary: summary.trim(),
      otVideo: otFile.status === 'ready' ? '/demo/report.webm' : '',
      otBlobId: otFile.status === 'ready' ? otFile.blobId : undefined,
      units: builtUnits,
      finalQuestion: defaultFinalQ,
      courseQuizzes: courseQuizzes.length > 0 ? courseQuizzes : [defaultFinalQ],
      isCreatorCourse: true,
      status: saveStatus,
      isPublic: saveStatus === 'published',
      studentCount: 0,
    }

    onPublish(newCourse)
    setStage('dashboard')
    showToast(
      saveStatus === 'draft'
        ? '강좌가 [임시저장]되었습니다.'
        : '강좌가 [검수 중] 상태로 접수되었습니다. 운영자 검수 후 공개됩니다.'
    )
  }

  // 강좌 관리 페이지에서 수정사항 저장
  function handleSaveManagedCourse(nextStatus?: CourseStatus) {
    if (!managingCourse) return
    const updatedUnits: LearningUnit[] = manageSections.map((sec, secIdx) => ({
      id: sec.id || `${managingCourse.id}-sec-${secIdx + 1}`,
      title: sec.title.trim(),
      lessons: sec.lessons.map((les, lesIdx) => ({
        id: les.id || `${managingCourse.id}-s${secIdx + 1}-l${lesIdx + 1}`,
        title: les.title.trim(),
        duration: les.fileState.duration || les.duration || 5,
        video: les.videoUrl || '/demo/report.webm',
        uploadedBlobId: les.fileState.blobId || undefined,
        transcript: les.transcript,
        question: les.quiz,
      })),
      question: {
        id: `${managingCourse.id}-sec-${secIdx + 1}-q`,
        prompt: `${sec.title} 확인 퀴즈`,
        options: ['핵심 목적 달성', '오답 1', '오답 2', '오답 3'],
        correct: 0,
        explanation: '섹션의 핵심 원칙을 확인합니다.',
      },
    }))

    const updated: Course = {
      ...managingCourse,
      title: manageTitle.trim(),
      summary: manageSummary.trim(),
      job: manageJob,
      topic: manageTopic.trim(),
      level: manageLevel,
      price: Math.max(0, managePrice),
      plannedMinutes: Math.max(1, manageMinutes),
      units: updatedUnits,
      courseQuizzes: manageQuizzes,
      finalQuestion: manageQuizzes[0] || managingCourse.finalQuestion,
      status: nextStatus ?? managingCourse.status ?? 'published',
      rejectionReason: nextStatus === 'under_review' ? undefined : managingCourse.rejectionReason,
    }

    onUpdateCourse(updated)
    setManageCourseId(null)
    showToast('강좌 수정사항이 저장되었습니다.')
  }

  // 삭제 시도
  function handleDeleteAttempt(course: Course) {
    if (course.studentCount && course.studentCount > 0) {
      setDeleteWarningModal(true)
      return
    }
    if (confirm(`'${course.title}' 강좌를 삭제하시겠습니까?`)) {
      onDeleteCourse(course.id)
      setManageCourseId(null)
      showToast('강좌가 삭제되었습니다.')
    }
  }

  // 목업 AI 대본 및 퀴즈 다시 추출
  function handleRegenerateAi() {
    setIsAiRegenerating(true)
    setTimeout(() => {
      setManageSections(prev =>
        prev.map(sec => ({
          ...sec,
          lessons: sec.lessons.map(les => ({
            ...les,
            transcript: [
              { start: 0, text: `[AI 추출 대본] ${les.title}의 핵심 의사결정 요소를 학습합니다.` },
              { start: 2, text: '업무 현장에 즉시 적용할 수 있도록 수치화된 지표를 제시합니다.' },
              { start: 4, text: '다음 회차와 연계하여 실행 가능성을 극대화합니다.' },
            ],
            quiz: {
              id: `${les.id}-ai-quiz`,
              prompt: `[AI 생성 퀴즈] '${les.title}'에서 가장 중요한 핵심 적용 기준은 무엇인가요?`,
              options: [
                '정량화된 지표와 실행 목적',
                '문서의 표지 색상과 폰트',
                '단순히 긴 분량의 보고서',
                '추상적인 아이디어 나열',
              ],
              correct: 0,
              explanation: '대본 분석 결과, 정량화된 지표와 명확한 목적 정의가 가장 우선시됩니다.',
            },
          })),
        }))
      )
      setIsAiRegenerating(false)
      setIsReviewed(false)
      showToast('AI가 영상 음성을 분석하여 대본과 문제별 퀴즈를 자동 생성했습니다!')
    }, 1000)
  }

  // 통계 계산
  const myCourses = courses.filter(c => c.isCreatorCourse || c.id.startsWith('creator-'))
  const underReviewCount = myCourses.filter(c => c.status === 'under_review').length
  const publishedCount = myCourses.filter(c => c.status === 'published').length

  const purchasedCourses = courses.filter(course => activity.purchased.includes(course.id))
  const answered = activity.answers.filter(answer => courses.some(course => course.id === answer.courseId))
  const estimatedRevenue = purchasedCourses.reduce((sum, course) => sum + course.price, 0)
  const averageProgress = purchasedCourses.length
    ? Math.round(
        purchasedCourses.reduce((sum, course) => sum + progressPercent(course, activity), 0) /
          purchasedCourses.length
      )
    : 0
  const quizAccuracy = answered.length
    ? Math.round((answered.filter(answer => answer.correct).length / answered.length) * 100)
    : 0

  // 일별 통계 목업 데이터 (이번 달 10.01 ~ 10.09)
  const dailyStats = [
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
  const totalViews = dailyStats.reduce((sum, item) => sum + item.views, 0)
  const totalStudents = dailyStats.reduce((sum, item) => sum + item.students, 0)
  const totalRevenue = dailyStats.reduce((sum, item) => sum + item.revenue, 0)
  const selectedDay = dailyStats[selectedDayIdx] ?? dailyStats[dailyStats.length - 1]

  return (
    <main className="creator-shell mobile-shell">
      {/* Top Header */}
      <header className="creator-header">
        <strong>
          BAEUGO <span>강의자</span>
        </strong>
        <button className="text-link" onClick={onSwitch}>
          수강 화면 보기 <ChevronRight />
        </button>
      </header>

      <div className="creator-content">
        {/* ========================================================
            STAGE 1: DASHBOARD (대시보드)
           ======================================================== */}
        {stage === 'dashboard' && !manageCourseId && (
          <>
            <div className="screen-heading">
              <p className="eyebrow">CREATOR STUDIO</p>
              <h1>내 강좌를 관리해요</h1>
              <p className="muted">강좌를 등록하고 수강 현황을 확인하세요.</p>
            </div>

            {/* 수정 사항: '등록 강좌/검수 완료/체험 계정 수강' -> '검수 중 / 등록 완료' 2단 카드로 수정 */}
            <div className="stats-mini grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-center">
                <small className="text-amber-800 font-bold block text-xs">검수 중</small>
                <strong className="text-2xl font-black text-amber-700 block mt-1">
                  {underReviewCount}
                </strong>
                <span className="text-[10px] text-amber-600">운영자 검수 대기</span>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-center">
                <small className="text-emerald-800 font-bold block text-xs">등록 완료</small>
                <strong className="text-2xl font-black text-emerald-700 block mt-1">
                  {publishedCount}
                </strong>
                <span className="text-[10px] text-emerald-600">수강생 공개 중</span>
              </div>
            </div>

            <button
              className="create-course mb-5"
              onClick={() => {
                setTitle('')
                setSummary('')
                setTopic(profile.keywords[0] ?? '문서 작성')
                setSelectedJob(profile.job || jobs[0])
                setLevel('초급')
                setPrice(29000)
                setPlannedMinutes(40)
                setOtFile(emptyFile)
                setCreateStep(1)
                setStage('create')
              }}
            >
              <Plus /> 새 강좌 등록하기 <ChevronRight />
            </button>

            <div className="section-title">
              <h2>내 등록 강좌</h2>
              <span className="text-xs text-slate-400">{myCourses.length}개</span>
            </div>

            {myCourses.length === 0 ? (
              <div className="empty-box">등록된 강좌가 없습니다. 새 강좌를 등록해보세요.</div>
            ) : (
              myCourses.map(course => {
                const totalLessons = course.units.flatMap(u => u.lessons).length
                return (
                  <div
                    className="creator-course p-3.5 bg-white border border-slate-200 rounded-xl mb-3 shadow-sm"
                    key={course.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {course.job}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              course.status === 'published'
                                ? 'bg-emerald-100 text-emerald-700'
                                : course.status === 'under_review'
                                ? 'bg-amber-100 text-amber-700'
                                : course.status === 'draft'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {course.status === 'published'
                              ? course.isPublic
                                ? '등록 완료 (공개)'
                                : '등록 완료 (비공개)'
                              : course.status === 'under_review'
                              ? '검수 중'
                              : course.status === 'draft'
                              ? '임시저장'
                              : '반려'}
                          </span>
                        </div>
                        <strong className="text-sm font-bold text-slate-900 block">
                          {course.title}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                      <span className="text-[11px]">
                        섹션 {course.units.length}개 · 영상 {totalLessons}편 · 수강생{' '}
                        {course.studentCount || 0}명
                      </span>

                      {/* 수정 사항: 각 강좌별 '관리' 버튼 및 기능 추가 (네비게이션 바는 여전히 대시보드 유지) */}
                      <button
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-all"
                        onClick={() => setManageCourseId(course.id)}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>관리 &gt;</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ========================================================
            SUBVIEW: 강좌 관리 페이지 (네비게이션 바는 여전히 '대시보드')
           ======================================================== */}
        {stage === 'dashboard' && manageCourseId && managingCourse && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                className="icon-only"
                onClick={() => setManageCourseId(null)}
                aria-label="대시보드로 돌아가기"
              >
                <ArrowLeft />
              </button>
              <div className="text-center">
                <span className="text-[11px] font-bold text-indigo-600">강좌 관리 & 검수</span>
                <h1 className="text-sm font-black text-slate-900 line-clamp-1">
                  {managingCourse.title}
                </h1>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  managingCourse.status === 'published'
                    ? 'bg-emerald-100 text-emerald-700'
                    : managingCourse.status === 'under_review'
                    ? 'bg-amber-100 text-amber-700'
                    : managingCourse.status === 'draft'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {managingCourse.status === 'published'
                  ? '등록 완료'
                  : managingCourse.status === 'under_review'
                  ? '검수 중'
                  : managingCourse.status === 'draft'
                  ? '임시저장'
                  : '반려'}
              </span>
            </div>

            {/* 1. 기본 정보 수정 */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. 강좌 기본 메타데이터 수정</span>
              </h2>

              <div className="form-stack">
                <label>
                  강좌명
                  <input
                    value={manageTitle}
                    onChange={e => setManageTitle(e.target.value)}
                    placeholder="강좌 제목"
                  />
                </label>
                <label>
                  강좌 소개
                  <textarea
                    rows={3}
                    value={manageSummary}
                    onChange={e => setManageSummary(e.target.value)}
                    placeholder="수강생에게 전할 소개"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    전문 직무
                    <select value={manageJob} onChange={e => setManageJob(e.target.value)}>
                      {jobs.map(j => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    난이도
                    <select value={manageLevel} onChange={e => setManageLevel(e.target.value)}>
                      <option>초급</option>
                      <option>중급</option>
                      <option>고급</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    가격 (원)
                    <input
                      type="number"
                      value={managePrice}
                      onChange={e => setManagePrice(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    계획 학습시간 (분)
                    <input
                      type="number"
                      value={manageMinutes}
                      onChange={e => setManageMinutes(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 2. 섹션 및 영상 구조 수정 */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <FileVideo className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. 섹션 및 영상 구조 관리</span>
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setManageSections(prev => [
                      ...prev,
                      {
                        id: `sec-${crypto.randomUUID()}`,
                        title: `섹션 ${prev.length + 1}. 추가 섹션 제목`,
                        lessons: [
                          {
                            id: `les-${crypto.randomUUID()}`,
                            title: `1강. 핵심 실습`,
                            duration: 5,
                            fileState: emptyFile,
                            transcript: [{ start: 0, text: '핵심 내용입니다.' }],
                            quiz: {
                              id: `q-${crypto.randomUUID()}`,
                              prompt: '확인 퀴즈',
                              options: ['정답', '오답1', '오답2', '오답3'],
                              correct: 0,
                              explanation: '해설',
                            },
                          },
                        ],
                      },
                    ])
                  }}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> 섹션 추가
                </button>
              </div>

              {manageSections.map((sec, secIdx) => (
                <div key={sec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      className="text-xs font-bold bg-white p-1.5 rounded border border-slate-300 flex-1"
                      value={sec.title}
                      onChange={e => {
                        const copy = [...manageSections]
                        copy[secIdx].title = e.target.value
                        setManageSections(copy)
                      }}
                      placeholder="섹션 제목 수정"
                    />
                    <button
                      type="button"
                      onClick={() => setManageSections(prev => prev.filter((_, i) => i !== secIdx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="섹션 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 섹션 내 영상 목록 */}
                  <div className="pl-2 border-l-2 border-indigo-200 space-y-2 mt-2">
                    {sec.lessons.map((les, lesIdx) => (
                      <div key={les.id} className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            className="text-xs font-semibold p-1 bg-slate-50 rounded border border-slate-200 flex-1"
                            value={les.title}
                            onChange={e => {
                              const copy = [...manageSections]
                              copy[secIdx].lessons[lesIdx].title = e.target.value
                              setManageSections(copy)
                            }}
                            placeholder="영상 제목 수정"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...manageSections]
                              copy[secIdx].lessons = copy[secIdx].lessons.filter((_, i) => i !== lesIdx)
                              setManageSections(copy)
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          영상 상태: {les.fileState.status === 'ready' ? '등록 완료' : '업로드 필요'} (
                          {les.duration}초)
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...manageSections]
                        copy[secIdx].lessons.push({
                          id: `les-${crypto.randomUUID()}`,
                          title: `${copy[secIdx].lessons.length + 1}강. 영상 제목`,
                          duration: 5,
                          fileState: emptyFile,
                          transcript: [{ start: 0, text: '학습 내용' }],
                          quiz: {
                            id: `q-${crypto.randomUUID()}`,
                            prompt: '퀴즈',
                            options: ['정답', '오답1', '오답2', '오답3'],
                            correct: 0,
                            explanation: '해설',
                          },
                        })
                        setManageSections(copy)
                      }}
                      className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 hover:underline pt-1"
                    >
                      <Plus className="w-3 h-3" /> 이 섹션에 영상 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. 코스 퀴즈 수정 */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. 코스 종합 퀴즈 관리 ({manageQuizzes.length}문항)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => addCourseQuiz(true)}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> 문제 추가
                </button>
              </div>

              {manageQuizzes.map((quiz, qIdx) => (
                <div key={quiz.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">문제 {qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setManageQuizzes(prev => prev.filter((_, i) => i !== qIdx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    className="text-xs p-2 bg-white rounded border border-slate-300 w-full font-semibold"
                    value={quiz.prompt}
                    onChange={e => {
                      const copy = [...manageQuizzes]
                      copy[qIdx].prompt = e.target.value
                      setManageQuizzes(copy)
                    }}
                    placeholder="객관식 문항 내용(질문)"
                  />
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      4지선다 보기 및 정답 지정 (A, B, C, D 카드를 눌러 정답 선택)
                    </span>
                    <div className="space-y-2">
                      {quiz.options.map((opt, optIdx) => {
                        const isCorrect = quiz.correct === optIdx
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                              isCorrect
                                ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              title="정답으로 지정"
                              onClick={() => {
                                const copy = [...manageQuizzes]
                                copy[qIdx].correct = optIdx
                                setManageQuizzes(copy)
                              }}
                              className={`w-7 h-7 rounded-full text-xs font-black shrink-0 flex items-center justify-center transition-colors ${
                                isCorrect
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </button>
                            <input
                              className="text-xs p-1 bg-transparent border-0 focus:ring-0 flex-1 font-medium placeholder-slate-400 outline-none"
                              value={opt}
                              onChange={e => {
                                const copy = [...manageQuizzes]
                                copy[qIdx].options[optIdx] = e.target.value
                                setManageQuizzes(copy)
                              }}
                              placeholder={`보기 ${String.fromCharCode(65 + optIdx)} 내용 입력`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...manageQuizzes]
                                copy[qIdx].correct = optIdx
                                setManageQuizzes(copy)
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <Check className="w-3 h-3" /> 정답
                                </>
                              ) : (
                                '정답 선택'
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    className="text-xs p-2 bg-white rounded border border-slate-200 w-full resize-none"
                    value={quiz.explanation}
                    onChange={e => {
                      const copy = [...manageQuizzes]
                      copy[qIdx].explanation = e.target.value
                      setManageQuizzes(copy)
                    }}
                    placeholder="정답 해설"
                  />
                </div>
              ))}
            </div>

            {/* 4. 수정 사항 요구사항: AI를 통해 자동으로 생성된 문제별 퀴즈와 대본 내용을 검수할 수 있음 (목업) */}
            <div className="p-4 bg-white rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>4. AI 생성 대본 & 문제별 퀴즈 검수 (목업)</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    영상별 음성 추출 대본과 AI 퀴즈를 확인하고 검수/수정합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateAi}
                  disabled={isAiRegenerating}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 flex-shrink-0"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isAiRegenerating ? 'animate-spin' : ''}`} />
                  <span>{isAiRegenerating ? 'AI 분석 중...' : 'AI 재추출 (목업)'}</span>
                </button>
              </div>

              {manageSections.flatMap(sec => sec.lessons).map((les, idx) => (
                <div key={les.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <strong className="text-xs font-bold text-slate-900 block">
                    영상 {idx + 1}. {les.title}
                  </strong>

                  {/* 타임스탬프 대본 검수 */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">타임스탬프 대본</span>
                    {les.transcript.map((tr, trIdx) => (
                      <div key={trIdx} className="flex items-center gap-1 text-xs">
                        <span className="font-mono text-[10px] text-indigo-600 bg-white px-1.5 py-1 rounded border border-slate-200">
                          00:0{tr.start}
                        </span>
                        <input
                          className="flex-1 p-1 bg-white rounded border border-slate-200 text-xs"
                          value={tr.text}
                          onChange={e => {
                            const copy = [...manageSections]
                            // find and update
                            for (const s of copy) {
                              const match = s.lessons.find(l => l.id === les.id)
                              if (match) {
                                match.transcript[trIdx].text = e.target.value
                                break
                              }
                            }
                            setManageSections(copy)
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* AI 생성 퀴즈 검수 */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      AI 생성 영상별 퀴즈 (4지선다)
                    </span>
                    <input
                      className="w-full p-1.5 bg-white rounded border border-slate-200 text-xs font-semibold"
                      value={les.quiz.prompt}
                      onChange={e => {
                        const copy = [...manageSections]
                        for (const s of copy) {
                          const match = s.lessons.find(l => l.id === les.id)
                          if (match) {
                            match.quiz.prompt = e.target.value
                            break
                          }
                        }
                        setManageSections(copy)
                      }}
                      placeholder="질문"
                    />
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {les.quiz.options.map((opt, optIdx) => {
                        const isCorrect = les.quiz.correct === optIdx
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs transition-colors ${
                              isCorrect
                                ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...manageSections]
                                for (const s of copy) {
                                  const match = s.lessons.find(l => l.id === les.id)
                                  if (match) {
                                    match.quiz.correct = optIdx
                                    break
                                  }
                                }
                                setManageSections(copy)
                              }}
                              className={`w-5 h-5 rounded-full text-[10px] font-black shrink-0 flex items-center justify-center transition-colors ${
                                isCorrect
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-100'
                              }`}
                              title="정답 지정"
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </button>
                            <input
                              className="p-1 text-[11px] bg-transparent border-0 flex-1 min-w-0 outline-none"
                              value={opt}
                              onChange={e => {
                                const copy = [...manageSections]
                                for (const s of copy) {
                                  const match = s.lessons.find(l => l.id === les.id)
                                  if (match) {
                                    match.quiz.options[optIdx] = e.target.value
                                    break
                                  }
                                }
                                setManageSections(copy)
                              }}
                              placeholder={`보기 ${String.fromCharCode(65 + optIdx)}`}
                            />
                            {isCorrect && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-2 pt-2 border-t border-indigo-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReviewed}
                  onChange={e => setIsReviewed(e.target.checked)}
                />
                <span className="text-xs font-bold text-indigo-900">
                  AI 추출 대본 및 문제별 퀴즈 검수를 완료했습니다.
                </span>
              </label>
            </div>

            {/* 5. 상태별 제어 및 저장 버튼 */}
            <div className="space-y-2 pt-2 pb-6">
              {managingCourse.status === 'published' && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">공개 설정</span>
                    <span className="text-[11px] text-slate-500">
                      수강자 탐색 피드 노출 여부를 토글합니다.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: Course = { ...managingCourse, isPublic: !managingCourse.isPublic }
                      onUpdateCourse(updated)
                      showToast(`강좌가 ${updated.isPublic ? '공개' : '비공개'}로 전환되었습니다.`)
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 ${
                      managingCourse.isPublic
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {managingCourse.isPublic ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{managingCourse.isPublic ? '공개중' : '비공개'}</span>
                  </button>
                </div>
              )}

              {managingCourse.status === 'under_review' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-900 block">운영자 검수 진행 중</span>
                    <span className="text-[11px] text-amber-700">검수 요청을 취소하고 임시저장으로 회수합니다.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveManagedCourse('draft')}
                    className="px-3 py-1.5 bg-white text-amber-800 font-bold text-xs rounded-lg border border-amber-300"
                  >
                    검수 취소
                  </button>
                </div>
              )}

              {managingCourse.status === 'rejected' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-rose-900 block">반려 사유 안내</span>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {managingCourse.rejectionReason ||
                        '2섹션 영상의 음질이 고르지 못하고, 퀴즈 해설 보강이 필요합니다.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveManagedCourse('under_review')}
                    className="w-full py-2 bg-rose-600 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    보완 완료 후 재검수 신청
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteAttempt(managingCourse)}
                  className="py-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>강좌 삭제</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveManagedCourse()}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>수정사항 저장</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 2: CREATE COURSE (강의 등록 페이지)
           ======================================================== */}
        {stage === 'create' && (
          <>
            {/* Step 1. 강좌 기본 메타데이터 */}
            {createStep === 1 && (
              <>
                <StepHeader
                  title="강좌 정보"
                  step="1 / 3"
                  onBack={() => {
                    setStage('dashboard')
                  }}
                />
                <div className="form-stack">
                  <label>
                    강좌명
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="예: 실무 보고서 작성 첫걸음"
                    />
                  </label>
                  <label>
                    강좌 소개
                    <textarea
                      rows={4}
                      value={summary}
                      onChange={event => setSummary(event.target.value)}
                      placeholder="수강생이 배울 내용을 적어 주세요."
                    />
                  </label>
                  <label>
                    전문 직무
                    <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
                      {jobs.map(j => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    주제
                    <input
                      value={topic}
                      onChange={event => setTopic(event.target.value)}
                      placeholder="예: 문서 작성"
                    />
                  </label>
                  <label>
                    난이도
                    <select value={level} onChange={event => setLevel(event.target.value)}>
                      <option>초급</option>
                      <option>중급</option>
                      <option>고급</option>
                    </select>
                  </label>
                  <label>
                    강좌 가격(원)
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={event => setPrice(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    계획 학습 시간(분)
                    <input
                      type="number"
                      min="1"
                      value={plannedMinutes}
                      onChange={event => setPlannedMinutes(Number(event.target.value))}
                    />
                  </label>
                </div>
                <button
                  className="primary-button full mt-4"
                  disabled={!title.trim() || !summary.trim() || !topic.trim()}
                  onClick={() => setCreateStep(2)}
                >
                  영상 등록으로 <ChevronRight />
                </button>
              </>
            )}

            {/* 수정 사항: Step 2. 영상 업로드 (OT 선택 유지 + 섹션 추가/영상 추가 + 섹션/영상 제목 수정) */}
            {createStep === 2 && (
              <>
                <StepHeader
                  title="영상 업로드 및 섹션 구성"
                  step="2 / 3"
                  onBack={() => setCreateStep(1)}
                />
                <p className="muted small mb-3">
                  무료 OT는 선택 사항이며, 섹션을 추가하고 각 섹션 내부에 영상을 등록할 수 있습니다.
                </p>

                {/* 무료 OT: 선택 사항 유지 */}
                <div className="mb-4">
                  <UploadBox
                    title="무료 OT 영상 (선택 사항)"
                    state={otFile}
                    onChoose={file => void chooseFile('ot', file)}
                  />
                </div>

                {/* 섹션 추가 및 내부 영상 추가 UI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-slate-800">
                      강좌 섹션 및 영상 구조 ({sections.length}개 섹션)
                    </strong>
                    <button
                      type="button"
                      onClick={addSection}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> 새 섹션 추가
                    </button>
                  </div>

                  {sections.map((sec, secIdx) => (
                    <div
                      key={sec.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                    >
                      {/* 섹션 제목 수정 input & 섹션 삭제 */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          className="font-bold text-xs p-2 bg-white rounded-xl border border-slate-300 flex-1"
                          value={sec.title}
                          onChange={e => {
                            const updated = [...sections]
                            updated[secIdx].title = e.target.value
                            setSections(updated)
                          }}
                          placeholder="섹션 제목 수정"
                        />
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSections(prev => prev.filter((_, i) => i !== secIdx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="섹션 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* 섹션 내부 영상 목록 */}
                      <div className="pl-2 border-l-2 border-indigo-300 space-y-2.5">
                        {sec.lessons.map((les, lesIdx) => (
                          <div
                            key={les.id}
                            className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2"
                          >
                            {/* 영상 제목 수정 input & 삭제 */}
                            <div className="flex items-center justify-between gap-2">
                              <input
                                className="text-xs font-semibold p-1.5 bg-slate-50 rounded-lg border border-slate-200 flex-1"
                                value={les.title}
                                onChange={e => {
                                  const updated = [...sections]
                                  updated[secIdx].lessons[lesIdx].title = e.target.value
                                  setSections(updated)
                                }}
                                placeholder="영상 제목 수정"
                              />
                              {sec.lessons.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...sections]
                                    updated[secIdx].lessons = updated[secIdx].lessons.filter(
                                      (_, i) => i !== lesIdx
                                    )
                                    setSections(updated)
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="영상 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* 영상 파일 업로드 */}
                            <UploadBox
                              title={`${les.title} 파일 업로드`}
                              state={les.fileState}
                              onChoose={file =>
                                void chooseFile({ sectionIndex: secIdx, lessonIndex: lesIdx }, file)
                              }
                            />
                          </div>
                        ))}

                        {/* 해당 섹션 내부에 영상 추가 버튼 */}
                        <button
                          type="button"
                          onClick={() => addLessonToSection(secIdx)}
                          className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> 이 섹션에 영상 추가
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="primary-button full mt-5"
                  onClick={() => setCreateStep(3)}
                >
                  3단계: 코스 퀴즈 등록으로 <ChevronRight />
                </button>
              </>
            )}

            {/* 수정 사항: Step 3. 코스 퀴즈 등록 (대본과 퀴즈란 전부 제거, 코스 퀴즈 등록 기능 추가) */}
            {createStep === 3 && (
              <>
                <StepHeader
                  title="코스 퀴즈 등록"
                  step="3 / 3"
                  onBack={() => setCreateStep(2)}
                />

                <div className="demo-banner mb-3">
                  <Sparkles /> 수강생이 코스 완강 후 학습 내용을 총괄 점검할 수 있도록 '코스 퀴즈'를 등록합니다.
                </div>

                <div className="space-y-4 mb-5">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-slate-800">
                      등록된 코스 퀴즈 문항 ({courseQuizzes.length}개)
                    </strong>
                    <button
                      type="button"
                      onClick={() => addCourseQuiz(false)}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> 문제 추가
                    </button>
                  </div>

                  {courseQuizzes.length === 0 ? (
                    <div className="empty-box">
                      등록된 코스 퀴즈 문제가 없습니다.<br />
                      '문제 추가' 버튼을 눌러 객관식 문항을 작성해 보세요.
                    </div>
                  ) : (
                    courseQuizzes.map((quiz, qIdx) => (
                      <div
                        key={quiz.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            문제 {qIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCourseQuizzes(prev => prev.filter((_, i) => i !== qIdx))
                            }
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="문제 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 문항 질문 내용 */}
                        <label className="form-stack">
                          질문 내용
                          <input
                            value={quiz.prompt}
                            onChange={e => {
                              const copy = [...courseQuizzes]
                              copy[qIdx].prompt = e.target.value
                              setCourseQuizzes(copy)
                            }}
                            placeholder="객관식 문항 내용(질문)을 입력하세요."
                          />
                        </label>

                        {/* 4지선다 보기 및 정답 지정 */}
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-bold text-slate-700 block">
                            4지선다 보기 및 정답 지정 (A, B, C, D 카드를 눌러 정답 선택)
                          </span>
                          <div className="space-y-2">
                            {quiz.options.map((opt, optIdx) => {
                              const isCorrect = quiz.correct === optIdx
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                    isCorrect
                                      ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  {/* A/B/C/D 원형 배지 */}
                                  <button
                                    type="button"
                                    title="정답으로 지정"
                                    onClick={() => {
                                      const copy = [...courseQuizzes]
                                      copy[qIdx].correct = optIdx
                                      setCourseQuizzes(copy)
                                    }}
                                    className={`w-7 h-7 rounded-full text-xs font-black shrink-0 flex items-center justify-center transition-colors ${
                                      isCorrect
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </button>

                                  {/* 보기 내용 입력 */}
                                  <input
                                    className="text-xs p-1 bg-transparent border-0 focus:ring-0 flex-1 font-medium placeholder-slate-400 outline-none"
                                    value={opt}
                                    onChange={e => {
                                      const copy = [...courseQuizzes]
                                      copy[qIdx].options[optIdx] = e.target.value
                                      setCourseQuizzes(copy)
                                    }}
                                    placeholder={`보기 ${String.fromCharCode(65 + optIdx)} 내용 입력`}
                                  />

                                  {/* 우측 정답 버튼 */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = [...courseQuizzes]
                                      copy[qIdx].correct = optIdx
                                      setCourseQuizzes(copy)
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors ${
                                      isCorrect
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                                    }`}
                                  >
                                    {isCorrect ? (
                                      <>
                                        <Check className="w-3 h-3" /> 정답
                                      </>
                                    ) : (
                                      '정답 선택'
                                    )}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* 정답 해설 */}
                        <label className="form-stack pt-1">
                          정답 해설
                          <textarea
                            rows={2}
                            value={quiz.explanation}
                            onChange={e => {
                              const copy = [...courseQuizzes]
                              copy[qIdx].explanation = e.target.value
                              setCourseQuizzes(copy)
                            }}
                            placeholder="수강생에게 제공할 해설"
                          />
                        </label>
                      </div>
                    ))
                  )}
                </div>

                {/* 저장 분기 버튼: 임시 저장 vs 검수 요청 */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    className="outline-button"
                    onClick={() => handleSaveNewCourse('draft')}
                  >
                    임시 저장
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => handleSaveNewCourse('under_review')}
                  >
                    검수 요청
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ========================================================
            STAGE 3: STATS (통계 - 6대 지표 및 이번 달 일별 추이 그래프)
           ======================================================== */}
        {stage === 'stats' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="screen-heading">
              <p className="eyebrow">CREATOR ANALYTICS</p>
              <h1>강좌 성과 통계</h1>
              <p className="muted">주요 운영 지표와 이번 달 일별 성장 추이를 확인하세요.</p>
            </div>

            {/* 6대 핵심 지표 그리드 (전월 동기간/전월 대비 증감 및 증감률 포함) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. 등록 강좌 건수 (전월 동기간 대비 증감) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  등록 강좌 건수
                </span>
                <strong className="text-xl font-black text-slate-900 block">
                  {courses.length}건
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+1건</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 동기간 대비 증감 (+1건)
                </small>
              </div>

              {/* 2. 영상 조회수 (전월 동기간 대비 증감률) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  영상 조회수
                </span>
                <strong className="text-xl font-black text-slate-900 block">
                  {totalViews.toLocaleString('ko-KR')}회
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.4%</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 동기간 대비 증감률
                </small>
              </div>

              {/* 3. 수강자 수 (전월 동기간 대비 증감률) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  수강자 수
                </span>
                <strong className="text-xl font-black text-slate-900 block">
                  {totalStudents}명
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+24.7%</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 동기간 대비 증감률
                </small>
              </div>

              {/* 4. 퀴즈 응답률 (전월 대비 증감률) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  퀴즈 응답률
                </span>
                <strong className="text-xl font-black text-slate-900 block">
                  88.5%
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+5.2%p</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 대비 증감률
                </small>
              </div>

              {/* 5. 퀴즈 정답률 (전월 대비 증감률) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  퀴즈 정답률
                </span>
                <strong className="text-xl font-black text-slate-900 block">
                  {quizAccuracy > 0 ? `${quizAccuracy}%` : '79.4%'}
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+4.1%p</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 대비 증감률
                </small>
              </div>

              {/* 6. 예상 매출 (전월 동기간 대비 증감률) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">
                  예상 매출
                </span>
                <strong className="text-lg font-black text-slate-900 block truncate">
                  {won(estimatedRevenue > 0 ? estimatedRevenue : totalRevenue)}
                </strong>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3" />
                  <span>+28.5%</span>
                </div>
                <small className="text-[10px] text-slate-400 block pt-0.5 leading-tight">
                  전월 동기간 대비 증감률
                </small>
              </div>
            </div>

            {/* 이번 달 일별 추이 그래프 섹션 (조회수, 수강자 수, 예상 매출 탭 전환) */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 mt-4">
              <div>
                <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-0.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>이번 달 일별 추이 그래프</span>
                </h2>
                <p className="text-[11px] text-slate-500 mb-0">
                  {statsMetric === 'views'
                    ? '영상 조회수 일별 추이 (10.01 ~ 10.09)'
                    : statsMetric === 'students'
                    ? '수강자 수 일별 추이 (10.01 ~ 10.09)'
                    : '예상 매출 일별 추이 (10.01 ~ 10.09)'}
                </p>
              </div>

              {/* 탭 토글 버튼: 조회수 / 수강자 수 / 예상 매출 */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatsMetric('views')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statsMetric === 'views'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  조회수
                </button>
                <button
                  type="button"
                  onClick={() => setStatsMetric('students')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statsMetric === 'students'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  수강자 수
                </button>
                <button
                  type="button"
                  onClick={() => setStatsMetric('revenue')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statsMetric === 'revenue'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  예상 매출
                </button>
              </div>

              {/* 선택된 날짜 상세 지표 카드 */}
              {selectedDay && (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 block">선택 일자</span>
                    <strong className="text-slate-900">{selectedDay.label}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">
                      {statsMetric === 'views'
                        ? '당일 조회수'
                        : statsMetric === 'students'
                        ? '당일 신규 수강자'
                        : '당일 예상 매출'}
                    </span>
                    <strong className="text-sm font-black text-indigo-700">
                      {statsMetric === 'views'
                        ? `${selectedDay.views.toLocaleString('ko-KR')}회`
                        : statsMetric === 'students'
                        ? `${selectedDay.students}명`
                        : `${won(selectedDay.revenue)}`}
                    </strong>
                  </div>
                </div>
              )}

              {/* 인터랙티브 바 차트 */}
              <div className="pt-2">
                <div className="h-36 flex items-end justify-between gap-1 pt-6 pb-1 px-1 border-b border-slate-200">
                  {dailyStats.map((item, idx) => {
                    const val =
                      statsMetric === 'views'
                        ? item.views
                        : statsMetric === 'students'
                        ? item.students
                        : item.revenue
                    const maxVal =
                      statsMetric === 'views' ? 240 : statsMetric === 'students' ? 20 : 500000
                    const heightPercent = Math.max(12, Math.min(100, Math.round((val / maxVal) * 100)))
                    const isSelected = selectedDayIdx === idx

                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => setSelectedDayIdx(idx)}
                        className="flex-1 flex flex-col items-center h-full justify-end group focus:outline-none"
                      >
                        {/* 상단 값 힌트 (선택 시 강조) */}
                        <span
                          className={`text-[9px] mb-1 transition-opacity ${
                            isSelected
                              ? 'opacity-100 text-indigo-700 font-black'
                              : 'opacity-0 group-hover:opacity-100 text-slate-500 font-semibold'
                          }`}
                        >
                          {statsMetric === 'views'
                            ? item.views
                            : statsMetric === 'students'
                            ? item.students
                            : `${Math.round(item.revenue / 10000)}만`}
                        </span>

                        {/* 막대 바 */}
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            isSelected
                              ? 'bg-indigo-600 shadow-xs'
                              : 'bg-indigo-200/80 group-hover:bg-indigo-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </button>
                    )
                  })}
                </div>

                {/* X축 날짜 라벨 */}
                <div className="flex justify-between gap-1 px-1 pt-1.5">
                  {dailyStats.map((item, idx) => (
                    <span
                      key={item.day}
                      className={`flex-1 text-center text-[10px] ${
                        selectedDayIdx === idx
                          ? 'font-black text-indigo-700'
                          : 'text-slate-400 font-medium'
                      }`}
                    >
                      {item.day.slice(3)}일
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            수정 사항: STAGE 4: MYPAGE (강의자 마이페이지)
           ======================================================== */}
        {stage === 'mypage' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="screen-heading">
              <p className="eyebrow">CREATOR MY PAGE</p>
              <h1>강의자 마이페이지</h1>
              <p className="muted">프로필 정보와 정산 계좌를 관리하세요.</p>
            </div>

            {/* 1. 프로필 수정 (프로필 사진, 이름, 이력) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>강사 프로필 수정</span>
              </h2>

              {/* 프로필 사진 */}
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full bg-cover bg-center border-2 border-indigo-100 shadow flex-shrink-0"
                  style={{ backgroundImage: `url(${profileAvatar})` }}
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 block">대표 프로필 사진</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
                    ].map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setProfileAvatar(imgUrl)}
                        className={`w-7 h-7 rounded-full bg-cover bg-center border ${
                          profileAvatar === imgUrl ? 'ring-2 ring-indigo-600' : 'opacity-70'
                        }`}
                        style={{ backgroundImage: `url(${imgUrl})` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 이름 */}
              <label className="form-stack">
                강사명 / 표시 이름
                <input
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="예: 김강사"
                />
              </label>

              {/* 이력 (약력/경력 bio) */}
              <label className="form-stack">
                강사 이력 (약력 및 경력 소개)
                <textarea
                  rows={4}
                  value={profileBio}
                  onChange={e => setProfileBio(e.target.value)}
                  placeholder="전문 경력과 수강생에게 전달할 이력을 적어주세요."
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    ...profile,
                    name: profileName,
                    avatar: profileAvatar,
                    bio: profileBio,
                  })
                  showToast('프로필 정보가 저장되었습니다.')
                }}
                className="primary-button full"
              >
                프로필 정보 저장
              </button>
            </div>

            {/* 2. 정산 정보 등록 (임시) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>정산 정보 등록 (임시)</span>
              </h2>

              <label className="form-stack">
                정산 은행
                <select value={bank} onChange={e => setBank(e.target.value)}>
                  <option value="신한은행">신한은행</option>
                  <option value="국민은행">국민은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="하나은행">하나은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="토스뱅크">토스뱅크</option>
                </select>
              </label>

              <label className="form-stack">
                정산 계좌번호
                <input
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="하이픈(-) 포함 입력"
                />
              </label>

              <label className="form-stack">
                예금주명
                <input
                  value={holder}
                  onChange={e => setHolder(e.target.value)}
                  placeholder="예금주 성명"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    ...profile,
                    settlementAccount: {
                      bank,
                      accountNumber,
                      holder,
                    },
                  })
                  showToast('정산 계좌 정보가 저장되었습니다.')
                }}
                className="outline-button full"
              >
                정산 정보 저장
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 수정 사항: 하단 네비게이션 바에 '마이페이지' 메뉴 추가 ([대시보드], [등록], [통계], [마이페이지]) */}
      <nav className="creator-nav">
        <button
          className={stage === 'dashboard' ? 'active' : ''}
          onClick={() => {
            setManageCourseId(null)
            setStage('dashboard')
          }}
        >
          <LayoutDashboard /> 대시보드
        </button>
        <button
          className={stage === 'create' ? 'active' : ''}
          onClick={() => {
            setManageCourseId(null)
            setCreateStep(1)
            setStage('create')
          }}
        >
          <ListVideo /> 등록
        </button>
        <button
          className={stage === 'stats' ? 'active' : ''}
          onClick={() => {
            setManageCourseId(null)
            setStage('stats')
          }}
        >
          <Users /> 통계
        </button>
        <button
          className={stage === 'mypage' ? 'active' : ''}
          onClick={() => {
            setManageCourseId(null)
            setStage('mypage')
          }}
        >
          <UserRound /> 마이페이지
        </button>
      </nav>

      {/* 수강생 존재 시 삭제 불가 경고 모달 */}
      {deleteWarningModal && (
        <div className="modal-backdrop" onClick={() => setDeleteWarningModal(false)}>
          <div className="modal-card text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2>강좌 삭제 불가</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              수강생이 존재하는 강좌는 삭제할 수 없습니다.<br />
              비공개로 전환하세요.
            </p>
            <button className="primary-button" onClick={() => setDeleteWarningModal(false)}>
              확인
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  )
}

function StepHeader({
  title,
  step,
  onBack,
}: {
  title: string
  step: string
  onBack: () => void
}) {
  return (
    <div className="step-header">
      <button className="icon-only" onClick={onBack} aria-label="이전 단계">
        <ArrowLeft />
      </button>
      <div>
        <small>{step}</small>
        <h1>{title}</h1>
      </div>
    </div>
  )
}

function UploadBox({
  title,
  state,
  onChoose,
}: {
  title: string
  state: FileState
  onChoose: (file?: File) => void
}) {
  return (
    <label className="upload-box cursor-pointer">
      <span>
        <FileVideo /> {title}
      </span>
      <input
        type="file"
        accept="video/*"
        onChange={event => onChoose(event.target.files?.[0])}
      />
      <small>
        {state.status === 'empty'
          ? '영상 파일을 선택하세요. 최대 200MB'
          : state.status === 'checking'
          ? `${state.name} · 영상 검증 중…`
          : state.status === 'ready'
          ? `${state.name} · 재생 확인 완료 (${Math.round(state.duration)}초)`
          : `${state.name} · ${state.error}`}
      </small>
      {state.status === 'rejected' && <em>파일을 다시 선택해 주세요.</em>}
    </label>
  )
}
