'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Bookmark, Check, ChevronRight, Clock3, CreditCard, FileText,
  Heart, Home, LockKeyhole, LogOut, Play, Plus, RotateCcw, Search, Sparkles,
  Target, Trash2, UserRound, X,
} from 'lucide-react'
import { allLessons, demoCourses, interests, jobs, minutes, won, type Course, type Lesson, type Question } from '@/lib/demo-data'
import { initialState, loadState, saveState, resetDemoState, progressPercent, nextLearningItemId, hasWrongAnswer, isCourseCompleted, hasReviewQuiz, type AppState, type Role, type Note, type StudyWindow, type PaymentMethod, type LearnerProfile } from '@/lib/app-state'
import { readVideo } from '@/lib/blob-store'
import { CreatorStudio } from '@/components/creator-studio'
import { LearningFeed, type LearningQuizContext } from '@/components/learning-feed'

type Screen = 'welcome' | 'onboarding' | 'home' | 'plan' | 'explore' | 'search' | 'settings' | 'detail' | 'lesson' | 'quiz' | 'library' | 'creator' | 'mypage' | 'course-quiz'
type QuizContext = LearningQuizContext
type LibraryTab = 'courses' | 'likes' | 'notes' | 'quiz'

const demoNotice = '체험용 화면입니다. 결제·STT·AI 문제 생성은 실제 서비스와 연결되지 않습니다.'

export default function BaeugoApp() {
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState<AppState>(initialState)
  const [screen, setScreen] = useState<Screen>('welcome')
  const [courseId, setCourseId] = useState('report')
  const [lessonId, setLessonId] = useState('report-u1-v1')
  const [quizContext, setQuizContext] = useState<QuizContext | null>(null)
  const [courseQuizTarget, setCourseQuizTarget] = useState<{ course: Course; question: Question } | null>(null)
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('courses')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('전체')
  const [otActive, setOtActive] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [backScreen, setBackScreen] = useState<Screen>('explore')

  useEffect(() => {
    const stored = loadState()
    setData(stored)
    setScreen(stored.onboarded ? stored.role === 'creator' ? 'creator' : 'home' : 'welcome')
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) saveState(data) }, [data, hydrated])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timer)
  }, [message])

  const courses = useMemo(() => [...demoCourses, ...data.creatorCourses], [data.creatorCourses])
  const selectedCourse = courses.find(course => course.id === courseId) ?? courses[0]
  const hasAccess = data.purchased.includes(selectedCourse.id)
  const update = (change: (current: AppState) => AppState) => setData(current => change(current))

  function openCourse(course: Course, from: Screen = screen) {
    setCourseId(course.id)
    setBackScreen(from === 'detail' ? 'explore' : from)
    setScreen('detail')
  }
  function openLesson(course: Course, id: string, seek = 0) {
    if (!data.purchased.includes(course.id)) { setCourseId(course.id); setPurchaseOpen(true); return }
    if (screen !== 'detail') setBackScreen(screen)
    setCourseId(course.id)
    setLessonId(id)
    setScreen('lesson')
    if (seek > 0) sessionStorage.setItem('baeugo-seek-once', String(seek))
  }
  function resume(course: Course) {
    const next = nextLearningItemId(course, data)
    if (next) openLesson(course, next)
    else setMessage('이 강좌의 학습을 마쳤습니다. 보관함에서 복습할 수 있어요.')
  }
  function startQuiz(context: QuizContext) { setQuizContext(context); setScreen('quiz') }
  function openCourseQuiz(course: Course, question: Question) {
    setCourseQuizTarget({ course, question })
    setScreen('course-quiz')
  }
  function markVideoWatched(lesson: Lesson) {
    update(current => ({ ...current, progress: { ...current.progress, [lesson.id]: { position: lesson.duration, watched: true, quizDone: current.progress[lesson.id]?.quizDone ?? false } } }))
  }
  function submitAnswer(context: QuizContext, selected: number, correct: boolean, question: Question) {
    update(current => ({
      ...current,
      answers: [...current.answers, { id: crypto.randomUUID(), questionId: question.id, courseId: context.courseId, lessonId: context.lessonId, selected, correct, at: Date.now() }],
      progress: context.kind === 'video' && context.lessonId ? {
        ...current.progress,
        [context.lessonId]: { position: current.progress[context.lessonId]?.position ?? 0, watched: true, quizDone: true },
      } : current.progress,
    }))
  }
  function afterQuiz(context: QuizContext) {
    if (context.kind === 'course-quiz') {
      setScreen('library')
      setMessage('코스 퀴즈를 완료했습니다. 보관함에서 갱신된 점수를 확인하세요.')
      return
    }
    const course = courses.find(item => item.id === context.courseId) ?? selectedCourse
    if (context.kind === 'video') {
      const unit = course.units[context.unitIndex]
      const index = unit.lessons.findIndex(item => item.id === context.lessonId)
      if (index < unit.lessons.length - 1) openLesson(course, unit.lessons[index + 1].id)
      else startQuiz({ kind: 'unit', courseId: course.id, unitIndex: context.unitIndex })
    } else if (context.kind === 'unit') {
      if (context.unitIndex < course.units.length - 1) openLesson(course, course.units[context.unitIndex + 1].lessons[0].id)
      else startQuiz({ kind: 'final', courseId: course.id, unitIndex: context.unitIndex })
    } else { setCourseId(course.id); setScreen('detail'); setMessage('코스 종합 퀴즈를 마쳤습니다. 보관함에서 점수와 퀴즈를 다시 볼 수 있어요.') }
  }
  function handleLogout() {
    update(current => ({ ...current, role: null, onboarded: false }))
    setScreen('welcome')
    setMessage('로그아웃되었습니다.')
  }
  function buySelected() {
    update(current => ({ ...current, purchased: [...new Set([...current.purchased, selectedCourse.id])] }))
    setPurchaseOpen(false)
    setMessage('체험용 구매가 완료되어 강좌가 열렸습니다.')
  }
  function toggleLike(id: string) {
    update(current => ({ ...current, likes: current.likes.includes(id) ? current.likes.filter(item => item !== id) : [...current.likes, id] }))
  }
  function saveNote(note: Omit<Note, 'id'>) {
    update(current => ({ ...current, notes: [{ ...note, id: crypto.randomUUID() }, ...current.notes] }))
    setMessage('메모를 영상과 재생 시점에 저장했습니다.')
  }
  function saveProgress(id: string, position: number) {
    update(current => ({ ...current, progress: { ...current.progress, [id]: { position, watched: current.progress[id]?.watched ?? false, quizDone: current.progress[id]?.quizDone ?? false } } }))
  }

  const isDemoEmpty = data.purchased.length === 0 && data.notes.length === 0 && data.creatorCourses.length === 0
  function handleSwitchDemoState(mode: 'rich' | 'empty') {
    const next = resetDemoState(mode)
    setData(next)
    setMessage(mode === 'rich' ? '풍부한 정상 데모 데이터로 복원되었습니다.' : '빈 상태(Empty State)로 전환되었습니다.')
  }
  function handleToggleDemoState() {
    handleSwitchDemoState(isDemoEmpty ? 'rich' : 'empty')
  }

  if (!hydrated) return <div className="loading-shell">BAEUGO</div>
  if (screen === 'welcome') return <Welcome onChoose={role => { update(current => ({ ...current, role })); setScreen('onboarding') }} />
  if (screen === 'onboarding') return <Onboarding role={data.role ?? 'learner'} onBack={() => setScreen('welcome')} onComplete={partial => {
    update(current => ({ ...current, ...partial, onboarded: true }))
    setScreen(data.role === 'creator' ? 'creator' : 'home')
  }} />
  if (screen === 'creator') return (
    <CreatorStudio
      profile={data.creator}
      courses={data.creatorCourses}
      activity={data}
      isDemoEmpty={isDemoEmpty}
      onToggleDemoState={handleToggleDemoState}
      onPublish={course => {
        update(current => ({ ...current, creatorCourses: [course, ...current.creatorCourses] }))
        setMessage('강좌가 등록되었습니다.')
      }}
      onUpdateCourse={updatedCourse => {
        update(current => ({
          ...current,
          creatorCourses: current.creatorCourses.map(c => (c.id === updatedCourse.id ? updatedCourse : c)),
        }))
        setMessage('강좌 정보가 성공적으로 수정되었습니다.')
      }}
      onDeleteCourse={courseId => {
        update(current => ({
          ...current,
          creatorCourses: current.creatorCourses.filter(c => c.id !== courseId),
        }))
        setMessage('강좌가 삭제되었습니다.')
      }}
      onUpdateProfile={updatedProfile => {
        update(current => ({
          ...current,
          creator: updatedProfile,
        }))
        setMessage('프로필 및 정산 정보가 저장되었습니다.')
      }}
      onSwitch={() => {
        update(current => ({ ...current, role: 'learner' }))
        setScreen('home')
      }}
    />
  )
  if (screen === 'lesson') return <LearningFeed key={`${selectedCourse.id}-${lessonId}`} course={selectedCourse} startId={lessonId} notes={data.notes} likes={data.likes} answers={data.answers} onLike={toggleLike} onNote={saveNote} onProgress={saveProgress} onWatched={markVideoWatched} onAnswer={submitAnswer} onBack={() => setScreen('detail')} onComplete={() => { setScreen('detail'); setMessage('강좌 학습을 마쳤습니다. 오답과 메모는 보관함에서 복습할 수 있어요.') }} />
  if (screen === 'quiz' && quizContext) {
    const course = courses.find(item => item.id === quizContext.courseId) ?? selectedCourse
    const question =
      quizContext.questionId
        ? (course.courseQuizzes?.find(q => q.id === quizContext.questionId) ??
           allLessons(course).find(item => item.id === quizContext.lessonId)?.question ??
           course.finalQuestion)
        : quizContext.kind === 'video'
        ? (allLessons(course).find(item => item.id === quizContext.lessonId)?.question ?? course.finalQuestion)
        : quizContext.kind === 'unit'
        ? course.units[quizContext.unitIndex].question
        : course.finalQuestion
    return (
      <QuizScreen
        key={question.id}
        context={quizContext}
        question={question}
        onSubmit={(answer, correct) => submitAnswer(quizContext, answer, correct, question)}
        onNext={() => afterQuiz(quizContext)}
        onBack={() => {
          if (quizContext.kind === 'course-quiz') setScreen('library')
          else if (quizContext.kind === 'video') setScreen('lesson')
          else setScreen('detail')
        }}
      />
    )
  }

  return (
    <AppShell
      screen={screen}
      hideNav={screen === 'detail' || screen === 'plan' || screen === 'course-quiz' || (screen === 'home' && otActive)}
      onNavigate={next => { setOtActive(false); setScreen(next) }}
      isDemoEmpty={isDemoEmpty}
      onToggleDemoState={handleToggleDemoState}
    >
      {screen === 'home' && <HomeScreen courses={courses} data={data} onCourse={course => openCourse(course, 'home')} onResume={resume} onOtActive={setOtActive} onLike={toggleLike} />}
      {screen === 'plan' && <PlanScreen profile={data.learner} onBack={() => setScreen('home')} onSave={studyWindows => { update(current => ({ ...current, learner: { ...current.learner, studyWindows } })); setScreen('home'); setMessage('학습 계획을 저장했습니다.') }} />}
      {screen === 'explore' && <ExploreScreen courses={courses} data={data} filter={filter} setFilter={setFilter} onSearch={() => setScreen('search')} onCourse={course => openCourse(course, 'explore')} />}
      {screen === 'search' && <SearchScreen courses={courses} query={query} setQuery={setQuery} onBack={() => setScreen('explore')} onCourse={course => openCourse(course, 'search')} />}
      {(screen === 'settings' || screen === 'mypage') && (
        <MyPageScreen
          profile={data.learner}
          isDemoEmpty={isDemoEmpty}
          onSwitchDemoState={handleSwitchDemoState}
          onUpdateLearner={partial => { update(curr => ({ ...curr, learner: { ...curr.learner, ...partial } })); setMessage('마이페이지 정보가 저장되었습니다.') }}
          onRestart={() => { update(curr => ({ ...curr, onboarded: false })); setScreen('welcome') }}
          onCreator={() => { update(curr => ({ ...curr, role: 'creator' })); setScreen('creator') }}
          onLogout={handleLogout}
        />
      )}
      {screen === 'detail' && <CourseDetail course={selectedCourse} data={data} hasAccess={hasAccess} onBack={() => setScreen(backScreen)} onOt={() => { setScreen('home'); window.setTimeout(() => document.getElementById(`ot-${selectedCourse.id}`)?.scrollIntoView({ behavior: 'smooth' }), 80) }} onBuy={() => setPurchaseOpen(true)} onResume={() => resume(selectedCourse)} onLesson={id => openLesson(selectedCourse, id)} />}
      {screen === 'library' && <LibraryScreen courses={courses} data={data} tab={libraryTab} setTab={setLibraryTab} onCourse={course => openCourse(course, 'library')} onLesson={(course, id, seek) => openLesson(course, id, seek)} onExplore={() => setScreen('explore')} onCreator={() => { update(current => ({ ...current, role: 'creator' })); setScreen('creator') }} onSelectCourseQuiz={(course, question) => openCourseQuiz(course, question)} />}
      {screen === 'course-quiz' && courseQuizTarget && (
        <CourseQuizScreen
          course={courseQuizTarget.course}
          question={courseQuizTarget.question}
          answers={data.answers}
          onBack={() => setScreen('library')}
          onSubmitAnswer={(selected, correct) => {
            submitAnswer(
              { kind: 'course-quiz', courseId: courseQuizTarget.course.id, unitIndex: 0, questionId: courseQuizTarget.question.id },
              selected,
              correct,
              courseQuizTarget.question
            )
          }}
        />
      )}
      {purchaseOpen && <div className="modal-backdrop" role="presentation" onClick={() => setPurchaseOpen(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-label="체험용 강좌 구매" onClick={event => event.stopPropagation()}><button className="icon-only modal-close" onClick={() => setPurchaseOpen(false)} aria-label="닫기"><X /></button><p className="eyebrow">체험용 결제</p><h2>{selectedCourse.title}</h2><p>{won(selectedCourse.price)} · 실제 결제는 이루어지지 않습니다.</p><button className="primary-button" onClick={buySelected}>체험용으로 수강 시작</button></div></div>}
      {message && <div className="toast" role="status">{message}</div>}
      <span className="sr-only">{demoNotice}</span>
    </AppShell>
  )
}

function Welcome({ onChoose }: { onChoose: (role: Role) => void }) {
  return <main className="welcome mobile-shell"><div className="wordmark-large">B</div><div><p className="eyebrow">모바일 직무 교육 숏폼</p><h1>짧게 배우고,<br /><em>바로 써먹어요.</em></h1><p className="muted">직무에 맞는 강좌를 찾고, 영상 한 편씩 학습한 뒤 퀴즈로 이해도를 확인하세요.</p></div><div className="stack"><button className="primary-button" onClick={() => onChoose('learner')}>강의를 수강할게요 <ChevronRight /></button><button className="outline-button" onClick={() => onChoose('creator')}>강의를 등록할게요 <ChevronRight /></button><small className="muted center">BAEUGO · 모바일 전용 시연 서비스</small></div></main>
}

function validStudyWindows(windows: StudyWindow[]): boolean {
  if (!windows.length) return true
  if (windows.some(window => !/^\d{2}:\d{2}$/.test(window.start) || !/^\d{2}:\d{2}$/.test(window.end) || window.start >= window.end)) return false
  const ordered = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  return ordered.every((window, index) => index === 0 || ordered[index - 1].end <= window.start)
}

function StudyPlanFields({ windows, setWindows }: { windows: StudyWindow[]; setWindows: React.Dispatch<React.SetStateAction<StudyWindow[]>> }) {
  const updateWindow = (id: string, field: 'start' | 'end', value: string) => setWindows(current => current.map(window => window.id === id ? { ...window, [field]: value } : window))
  const ordered = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const overlap = ordered.some((window, index) => index > 0 && window.start && ordered[index - 1].end && window.start < ordered[index - 1].end)
  return (
    <div className="form-stack study-plan-fields">
      <div className="study-window-header">
        <strong>학습할 시간대 <span className="optional-label">선택 사항</span></strong>
        <p>시간대를 정하지 않고 시작해도 돼요. 필요하면 여러 개를 추가할 수 있습니다.</p>
      </div>
      <div className="study-window-list">
        {windows.map((window, index) => (
          <div className="study-window" key={window.id}>
            <span className="study-window-number">{index + 1}</span>
            <label>
              시작
              <input type="time" aria-label={`${index + 1}번째 시작 시간`} value={window.start} onChange={event => updateWindow(window.id, 'start', event.target.value)} />
            </label>
            <span className="study-window-separator">~</span>
            <label>
              종료
              <input type="time" aria-label={`${index + 1}번째 종료 시간`} value={window.end} onChange={event => updateWindow(window.id, 'end', event.target.value)} />
            </label>
            <button type="button" className="remove-window" aria-label={`${index + 1}번째 시간대 삭제`} onClick={() => setWindows(current => current.filter(item => item.id !== window.id))}>
              <X />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="add-window" onClick={() => setWindows(current => [...current, { id: crypto.randomUUID(), start: '', end: '' }])}>
        <Plus /> 시간대 추가
      </button>
      {windows.some(window => window.start && window.end && window.start >= window.end) && (
        <p className="field-error">종료 시간은 시작 시간보다 늦어야 합니다.</p>
      )}
      {overlap && <p className="field-error">겹치는 시간대는 등록할 수 없습니다.</p>}
    </div>
  )
}

function Onboarding({ role, onBack, onComplete }: { role: Role; onBack: () => void; onComplete: (value: Partial<AppState>) => void }) {
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('')
  const [job, setJob] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [studyWindows, setStudyWindows] = useState<StudyWindow[]>([])
  const [bio, setBio] = useState('')
  const isCreator = role === 'creator'
  const titles = isCreator
    ? ['전문 직무를 알려 주세요', '강의 키워드를 선택해 주세요', '강사 약력을 입력해 주세요']
    : ['현재 어떤 상황인가요?', '현재 또는 희망 직무는?', '관심 주제를 선택해 주세요', '학습 시간대를 정해요']
  const total = titles.length
  const canContinue = isCreator
    ? step === 0 ? Boolean(job) : step === 1 ? topics.length > 0 : bio.trim().length >= 5
    : step === 0 ? Boolean(status) : step === 1 ? Boolean(job) : step === 2 ? topics.length > 0 : validStudyWindows(studyWindows)
  const toggleTopic = (value: string) => setTopics(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  function next() {
    if (!canContinue) return
    if (step < total - 1) setStep(step + 1)
    else if (isCreator) onComplete({ creator: { ...initialState.creator, job, keywords: topics, bio } })
    else onComplete({ learner: { ...initialState.learner, status, job, interests: topics, studyWindows: [...studyWindows].sort((a, b) => a.start.localeCompare(b.start)) } })
  }
  return (
    <main className="onboarding mobile-shell">
      <div className="onboarding-head">
        <button className="icon-only" onClick={() => step ? setStep(step - 1) : onBack()} aria-label="뒤로">
          <ArrowLeft />
        </button>
        <span>{step + 1} / {total}</span>
      </div>
      <div className="step-progress">
        <span style={{ width: `${(step + 1) / total * 100}%` }} />
      </div>
      <section className="onboarding-body">
        <p className="eyebrow">{isCreator ? '강의자 시작하기' : '나에게 맞는 학습'}</p>
        <h1>{titles[step]}</h1>
        {!isCreator && step === 0 && (
          <div className="option-stack">
            {['취업 준비 중', '재직 중', '이직·직무 전환 준비 중'].map(item => (
              <button className={status === item ? 'choice selected' : 'choice'} key={item} onClick={() => setStatus(item)}>
                {item}{status === item && <Check />}
              </button>
            ))}
          </div>
        )}
        {(isCreator ? step === 0 : step === 1) && (
          <div className="chip-grid">
            {jobs.map(item => (
              <button className={job === item ? 'chip selected' : 'chip'} key={item} onClick={() => setJob(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
        {(isCreator ? step === 1 : step === 2) && (
          <>
            <p className="muted">여러 개를 선택할 수 있습니다.</p>
            <div className="chip-grid">
              {interests.map(item => (
                <button className={topics.includes(item) ? 'chip selected' : 'chip'} key={item} onClick={() => toggleTopic(item)}>
                  {item}
                </button>
              ))}
            </div>
          </>
        )}
        {!isCreator && step === 3 && (
          <StudyPlanFields windows={studyWindows} setWindows={setStudyWindows} />
        )}
        {isCreator && step === 2 && (
          <label className="form-stack">
            강사 약력
            <textarea rows={5} value={bio} onChange={event => setBio(event.target.value)} placeholder="전문 경력과 수강생에게 전하고 싶은 내용을 적어 주세요." />
            <small className="muted">5자 이상 입력해 주세요.</small>
          </label>
        )}
      </section>
      <button className="primary-button sticky-inside" disabled={!canContinue} onClick={next}>
        {step === total - 1 ? '완료하고 시작하기' : '다음'} <ChevronRight />
      </button>
    </main>
  )
}

function PlanScreen({ profile, onBack, onSave }: { profile: AppState['learner']; onBack: () => void; onSave: (studyWindows: StudyWindow[]) => void }) {
  const [studyWindows, setStudyWindows] = useState<StudyWindow[]>(profile.studyWindows)
  return (
    <main className="screen-padding plan-screen">
      <div className="step-header">
        <button className="icon-only" onClick={onBack} aria-label="홈으로 돌아가기">
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">MY PLAN</p>
          <h1>학습 시간대 설정</h1>
        </div>
      </div>
      <p className="muted">출근 전과 퇴근 후처럼 필요한 시간대를 여러 개 지정하세요.</p>
      <StudyPlanFields windows={studyWindows} setWindows={setStudyWindows} />
      <button className="primary-button full" disabled={!validStudyWindows(studyWindows)} onClick={() => onSave([...studyWindows].sort((a, b) => a.start.localeCompare(b.start)))}>
        학습 계획 저장
      </button>
    </main>
  )
}

function AppShell({
  children,
  screen,
  hideNav,
  onNavigate,
  isDemoEmpty,
  onToggleDemoState,
}: {
  children: React.ReactNode
  screen: Screen
  hideNav: boolean
  onNavigate: (screen: Screen) => void
  isDemoEmpty?: boolean
  onToggleDemoState?: () => void
}) {
  return (
    <div className="app-frame mobile-shell">
      <header className="app-header">
        <button className="logo" onClick={() => onNavigate('home')}>BAEUGO</button>
      </header>
      <div className={screen === 'home' ? 'app-content home-content' : 'app-content'}>
        {children}
      </div>
      {/* 하단 네비게이션 바: 홈, 탐색, 보관함, 마이페이지 */}
      {!hideNav && (
        <nav className="bottom-nav" aria-label="기본 메뉴">
          <button className={screen === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}>
            <Home /><span>홈</span>
          </button>
          <button className={screen === 'explore' || screen === 'search' ? 'active' : ''} onClick={() => onNavigate('explore')}>
            <Search /><span>탐색</span>
          </button>
          <button className={screen === 'library' ? 'active' : ''} onClick={() => onNavigate('library')}>
            <Bookmark /><span>보관함</span>
          </button>
          <button className={screen === 'mypage' ? 'active' : ''} onClick={() => onNavigate('mypage')}>
            <UserRound /><span>마이페이지</span>
          </button>
        </nav>
      )}
    </div>
  )
}

function HomeScreen({
  courses,
  data,
  onCourse,
  onResume,
  onOtActive,
  onLike,
}: {
  courses: Course[]
  data: AppState
  onCourse: (course: Course) => void
  onResume: (course: Course) => void
  onOtActive: (active: boolean) => void
  onLike: (id: string) => void
}) {
  const enrolled = courses.filter(course => data.purchased.includes(course.id))
  const popular = courses.filter(course => !data.purchased.includes(course.id) && (course.otVideo || course.otBlobId))
  const otRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = otRef.current
    if (!node) return
    const updateVisibility = () => {
      const bounds = node.getBoundingClientRect()
      onOtActive(bounds.top <= window.innerHeight * 0.35 && bounds.bottom >= window.innerHeight * 0.65)
    }
    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)
    return () => {
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
      onOtActive(false)
    }
  }, [onOtActive])

  return (
    <div>
      <div className="home-top">
        {/* 오늘의 학습 목표 부분 제거: 곧바로 '이어서 학습' 표시 */}
        <div className="section-title" style={{ marginTop: 0 }}>
          <div>
            <p className="eyebrow">MY LEARNING</p>
            <h2>이어서 학습</h2>
          </div>
          <span>{enrolled.length}개 강좌</span>
        </div>
        <div className="continue-list">
          {enrolled.length === 0 && <div className="empty-box">수강 중인 강좌가 없습니다. 아래 인기 강좌 OT부터 살펴보세요.</div>}
          {enrolled.map(course => (
            <div className="continue-card" key={course.id}>
              <button className="course-main" onClick={() => onCourse(course)}>
                <div className="progress-ring" style={{ '--progress': `${progressPercent(course, data)}%` } as React.CSSProperties}>
                  <span>{progressPercent(course, data)}%</span>
                </div>
                <div>
                  <strong>{course.title}</strong>
                  <small>{nextLearningItemId(course, data) ? '이어갈 학습이 있어요' : '코스 학습 완료'}</small>
                  <small>메모 {data.notes.filter(note => note.courseId === course.id).length} · 퀴즈 참여 {data.answers.filter(answer => answer.courseId === course.id).length}건</small>
                </div>
              </button>
              <button className="mini-primary" onClick={() => onResume(course)}>이어가기</button>
            </div>
          ))}
        </div>
        <div className="section-title ot-section-title">
          <div>
            <p className="eyebrow">BAEUGO PICK</p>
            <h2>인기 강좌 OT</h2>
          </div>
          <span>아래에서 풀화면으로 보기 ↓</span>
        </div>
      </div>
      <div className="ot-feed" id="home-ot-feed" ref={otRef}>
        {popular.map((course, index) => (
          <OTSlide key={course.id} course={course} index={index} total={popular.length} liked={data.likes.includes(`ot-${course.id}`)} onLike={() => onLike(`ot-${course.id}`)} onCourse={() => onCourse(course)} />
        ))}
      </div>
    </div>
  )
}

function useVideoSource(plain: string, uploadedBlobId?: string) {
  const [source, setSource] = useState(plain)
  useEffect(() => {
    if (!uploadedBlobId) { setSource(plain); return }
    let active = true
    let objectUrl = ''
    readVideo(uploadedBlobId).then(blob => { if (active && blob) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl) } }).catch(() => setSource(''))
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [plain, uploadedBlobId])
  return source
}

function OTSlide({ course, index, total, liked, onLike, onCourse }: { course: Course; index: number; total: number; liked: boolean; onLike: () => void; onCourse: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const slide = useRef<HTMLElement>(null)
  const source = useVideoSource(course.otVideo, course.otBlobId)

  useEffect(() => {
    const node = slide.current
    if (!node) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void video.current?.play().catch(() => {})
      else video.current?.pause()
    }, { root: node.parentElement, threshold: 0.6 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="ot-slide" id={`ot-${course.id}`} ref={slide}>
      <video ref={video} className="cover-video" src={source} poster={course.cover} muted playsInline loop preload="metadata" aria-label={`${course.title} 무료 OT`} />
      <div className="video-shade" />
      <div className="ot-top">
        <span className="tag dark">무료 OT</span>
        <span>{index + 1} / {total}</span>
      </div>
      {/* OT 우측: 재생 버튼 제거, 좋아요 버튼만 유지 */}
      <div className="ot-side">
        <button className={liked ? 'circle-action liked' : 'circle-action'} onClick={onLike} aria-label="OT 좋아요">
          <Heart fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
      {/* OT 하단: 상세 설명에 강의자 프로필(사진, 이름, 약력) 표시 */}
      <div className="ot-bottom">
        <span className="tag dark">{course.job} · {course.level}</span>
        <h2>{course.title}</h2>
        <div className="flex items-center gap-2.5 my-2.5 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
          <div
            className="w-9 h-9 rounded-full bg-cover bg-center shrink-0 border border-white/50 shadow-sm"
            style={{ backgroundImage: `url(${course.teacherAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'})` }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white block leading-tight">{course.teacher}</div>
            <div className="text-xs text-white/80 truncate">{course.teacherBio || `${course.job} 실무 멘토`}</div>
          </div>
        </div>
        <p>{course.summary}</p>
        <button className="white-button" onClick={onCourse}>강좌 자세히 <ChevronRight /></button>
        <small>위로 스와이프해 다음 OT 보기</small>
      </div>
    </section>
  )
}

function ExploreScreen({ courses, data, filter, setFilter, onSearch, onCourse }: { courses: Course[]; data: AppState; filter: string; setFilter: (value: string) => void; onSearch: () => void; onCourse: (course: Course) => void }) {
  const filters = ['전체', ...new Set(courses.map(course => course.job))]
  const displayed = courses.filter(course => filter === '전체' || course.job === filter).sort((a, b) => Number(b.job === data.learner.job) + Number(b.topic === data.learner.interests[0]) - Number(a.job === data.learner.job) - Number(a.topic === data.learner.interests[0]))

  return (
    <div className="screen-padding">
      <div className="screen-heading">
        <p className="eyebrow">DISCOVER</p>
        <h1>강좌를 탐색해요</h1>
      </div>
      <button className="search-bar" onClick={onSearch}>
        <Search /> 직무·주제·강좌 검색
      </button>
      {/* 인기 검색어 제거됨 */}
      <div className="filter-row mt-3">
        {filters.map(item => (
          <button className={filter === item ? 'chip selected' : 'chip'} key={item} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="section-title">
        <div>
          <p className="eyebrow">{data.learner.job ? `${data.learner.job} 관심사 추천` : '인기 강좌'}</p>
          <h2>나에게 맞는 강좌</h2>
        </div>
        <span>{displayed.length}개</span>
      </div>
      <div className="course-grid">
        {displayed.map(course => (
          <button className="course-tile" key={course.id} onClick={() => onCourse(course)}>
            <div className="portrait-cover" style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,#07101e80),url(${course.cover})` }}>
              <span className="tag dark">{course.topic}</span>
              <span className="cover-play"><Play fill="currentColor" /></span>
            </div>
            <div className="tile-copy">
              <strong>{course.title}</strong>
              <span>{course.teacher} · {course.level}</span>
              <small>{minutes(course)}분 · {won(course.price)}</small>
            </div>
          </button>
        ))}
      </div>
      {displayed.length === 0 && <div className="empty-box">이 직무의 강좌가 아직 없습니다. 다른 분류를 선택해 보세요.</div>}
    </div>
  )
}

function SearchScreen({ courses, query, setQuery, onBack, onCourse }: { courses: Course[]; query: string; setQuery: (value: string) => void; onBack: () => void; onCourse: (course: Course) => void }) {
  const [levelFilter, setLevelFilter] = useState<'전체' | '초급' | '중급' | '고급'>('전체')
  const [sortBy, setSortBy] = useState<'popular' | 'level'>('popular')

  const normalized = query.trim().toLocaleLowerCase()
  const baseList = courses.filter(course => {
    const matchesQuery = !normalized || [
      course.title,
      course.teacher,
      course.job,
      course.topic,
      ...course.tags,
      ...course.units.flatMap(unit => unit.lessons.flatMap(lesson => lesson.transcript.map(segment => segment.text))),
    ].join(' ').toLocaleLowerCase().includes(normalized)

    const matchesLevel = levelFilter === '전체' || course.level === levelFilter
    return matchesQuery && matchesLevel
  })

  const levelRank: Record<string, number> = { 초급: 1, 중급: 2, 고급: 3 }
  const results = [...baseList].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.studentCount || 0) - (a.studentCount || 0)
    } else {
      return (levelRank[a.level] || 0) - (levelRank[b.level] || 0)
    }
  })

  return (
    <div className="screen-padding">
      <div className="search-input">
        <button className="icon-only" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button>
        <Search />
        <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="제목·태그·대본 검색" />
        <button className="icon-only" onClick={() => setQuery('')} aria-label="검색어 지우기"><X /></button>
      </div>

      {/* 인기 검색어 제거 & 난이도와 인기순 정렬 필터 버튼 추가 */}
      <div className="my-3 space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">정렬 기준</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${sortBy === 'popular' ? 'bg-indigo-600 text-white border border-indigo-600 shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
              onClick={() => setSortBy('popular')}
            >
              인기순
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${sortBy === 'level' ? 'bg-indigo-600 text-white border border-indigo-600 shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
              onClick={() => setSortBy('level')}
            >
              난이도순
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <span className="text-xs font-semibold text-slate-600 shrink-0">난이도</span>
          {(['전체', '초급', '중급', '고급'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${levelFilter === lvl ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-white text-slate-600 border border-slate-200'}`}
              onClick={() => setLevelFilter(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {!normalized ? (
        <>
          <div className="section-title">
            <h2>카테고리별 탐색</h2>
          </div>
          <div className="category-list mb-4">
            {jobs.map(item => (
              <button key={item} onClick={() => setQuery(item)}>
                {item}
                <ChevronRight />
              </button>
            ))}
          </div>
          <div className="section-title">
            <h2>{levelFilter === '전체' ? '추천 강좌' : `${levelFilter} 강좌`}</h2>
            <span>{sortBy === 'popular' ? '인기순 정렬' : '난이도순 정렬'} ({results.length}개)</span>
          </div>
          <div className="result-list">
            {results.map(course => (
              <button key={course.id} onClick={() => onCourse(course)}>
                <span className="result-cover" style={{ backgroundImage: `url(${course.cover})` }} />
                <span>
                  <strong>{course.title}</strong>
                  <small>{course.teacher} · {course.level} · 수강생 {course.studentCount || 0}명</small>
                  <small>{won(course.price)}</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-title">
            <h2>‘{query}’ 결과</h2>
            <span>{results.length}개</span>
          </div>
          <div className="result-list">
            {results.map(course => (
              <button key={course.id} onClick={() => onCourse(course)}>
                <span className="result-cover" style={{ backgroundImage: `url(${course.cover})` }} />
                <span>
                  <strong>{course.title}</strong>
                  <small>{course.teacher} · {course.level} · 수강생 {course.studentCount || 0}명</small>
                  <small>{won(course.price)}</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
          {results.length === 0 && (
            <div className="empty-box">
              조건에 맞는 강좌가 없습니다.<br />
              다른 검색어 또는 난이도 필터를 선택해 보세요.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CourseDetail({ course, data, hasAccess, onBack, onOt, onBuy, onResume, onLesson }: { course: Course; data: AppState; hasAccess: boolean; onBack: () => void; onOt: () => void; onBuy: () => void; onResume: () => void; onLesson: (id: string) => void }) {
  return (
    <div className="course-detail">
      <div className="detail-cover" style={{ backgroundImage: `linear-gradient(180deg,#08132220,#081322aa),url(${course.cover})` }}>
        <button className="icon-only glass" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button>
        <span className="tag dark">{course.job} · {course.level}</span>
      </div>
      <div className="detail-body">
        <p className="eyebrow">BAEUGO COURSE</p>
        <h1>{course.title}</h1>
        <p className="muted">{course.teacher}</p>
        <p>{course.summary}</p>
        <div className="detail-metrics">
          <span><Clock3 /> 계획 학습 {minutes(course)}분</span>
          <span><Target /> 총 {allLessons(course).length}개 핵심 영상</span>
        </div>
        <small className="muted">시연 영상은 학습 흐름 확인을 위해 짧게 제작했습니다.</small>
        {!hasAccess && (course.otVideo || course.otBlobId) && (
          <button className="ot-preview" onClick={onOt}>
            <Play fill="currentColor" /> 무료 OT 풀화면으로 보기 <ChevronRight />
          </button>
        )}
        <div className="section-title">
          <h2>강좌 목차</h2>
          <span>{allLessons(course).length}개 영상</span>
        </div>
        {course.units.map((unit, unitIndex) => (
          <div className="unit" key={unit.id}>
            <h3>{unitIndex + 1}. {unit.title}</h3>
            {unit.lessons.map((lesson, index) => (
              <button className="lesson-row" key={lesson.id} onClick={() => hasAccess ? onLesson(lesson.id) : onBuy()}>
                <span className="lesson-number">{index + 1}</span>
                <span>
                  <strong>{lesson.title}</strong>
                  <small>영상별 퀴즈 · {data.notes.filter(note => note.lessonId === lesson.id).length}개 메모 {hasWrongAnswer(data, lesson.id) ? '· 오답 있음' : ''}</small>
                </span>
                {hasAccess ? <Play /> : <LockKeyhole />}
              </button>
            ))}
            <div className="unit-quiz-label"><Sparkles /> 단위 확인 퀴즈</div>
          </div>
        ))}
        <div className="unit-quiz-label"><Sparkles /> 코스 종합 퀴즈</div>
      </div>
      <div className="sticky-action">
        <button className="primary-button" onClick={hasAccess ? onResume : onBuy}>
          {hasAccess ? '이어가기' : `${won(course.price)} · 구매하기`} <ChevronRight />
        </button>
      </div>
    </div>
  )
}

function QuizScreen({ context, question, onSubmit, onNext, onBack }: { context: QuizContext; question: Question; onSubmit: (answer: number, correct: boolean) => void; onNext: () => void; onBack: () => void }) {
  const [selection, setSelection] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = selection === question.correct

  return (
    <main className="quiz-screen mobile-shell">
      <div className="quiz-head">
        <button className="icon-only" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button>
        <span>
          {context.kind === 'video'
            ? '영상별 확인 퀴즈'
            : context.kind === 'unit'
            ? '학습 단위 확인 퀴즈'
            : context.kind === 'course-quiz'
            ? '코스 퀴즈 재시험'
            : '코스 종합 퀴즈'}
        </span>
      </div>
      <div className="quiz-body">
        <span className="tag blue"><Sparkles /> 대본 기반 · 강의자 검수</span>
        <h1>{question.prompt}</h1>
        <p className="muted">학습한 핵심 내용을 떠올려 답안을 선택해 주세요.</p>
        <div className="answer-list">
          {question.options.map((option, index) => (
            <button
              className={selection === index ? submitted ? correct ? 'answer selected correct' : 'answer selected wrong' : 'answer selected' : 'answer'}
              key={option}
              disabled={submitted}
              onClick={() => setSelection(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>{option}
            </button>
          ))}
        </div>
        {submitted && (
          <div className={correct ? 'answer-feedback good' : 'answer-feedback'}>
            <strong>{correct ? '정답이에요!' : '오답노트 및 결과에 저장했어요'}</strong>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
      <div className="quiz-bottom">
        {!submitted ? (
          <button className="primary-button" disabled={selection === null} onClick={() => { if (selection !== null) { onSubmit(selection, correct); setSubmitted(true) } }}>
            답안 제출하기
          </button>
        ) : (
          <button className="primary-button" onClick={onNext}>
            결과 확인 및 다음으로 <ChevronRight />
          </button>
        )}
      </div>
    </main>
  )
}

function LibraryScreen({
  courses,
  data,
  tab,
  setTab,
  onCourse,
  onLesson,
  onExplore,
  onCreator,
  onSelectCourseQuiz,
}: {
  courses: Course[]
  data: AppState
  tab: LibraryTab
  setTab: (tab: LibraryTab) => void
  onCourse: (course: Course) => void
  onLesson: (course: Course, id: string, seek?: number) => void
  onExplore: () => void
  onCreator: () => void
  onSelectCourseQuiz: (course: Course, question: Question) => void
}) {
  const tabs: [LibraryTab, string][] = [
    ['courses', '내 강좌'],
    ['likes', '좋아요'],
    ['notes', '메모'],
    ['quiz', '퀴즈'],
  ]

  const [courseFilter, setCourseFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [quizFilter, setQuizFilter] = useState<'all' | 'passed' | 'review' | 'unattempted'>('all')

  const enrolled = courses.filter(course => data.purchased.includes(course.id))
  const inProgressCourses = enrolled.filter(course => progressPercent(course, data) < 100)
  const completedCourses = enrolled.filter(course => progressPercent(course, data) === 100)
  const displayedCourses = courseFilter === 'all' ? enrolled : courseFilter === 'in_progress' ? inProgressCourses : completedCourses

  const findCourse = (id: string) => courses.find(course => course.id === id)

  // 퀴즈 탭에 노출할 강좌 목록 (수강 중인 강좌 우선, 없으면 전체 강좌)
  const coursesForQuizzes = enrolled.length > 0 ? enrolled : courses

  const quizItems = coursesForQuizzes.map(course => {
    const courseQuiz = course.courseQuizzes?.[0] ?? course.finalQuestion
    const answer = [...data.answers].reverse().find(a => a.questionId === courseQuiz.id)
    return { course, courseQuiz, answer }
  })
  const passedQuizCount = quizItems.filter(item => item.answer?.correct === true).length
  const reviewQuizCount = quizItems.filter(item => item.answer !== undefined && !item.answer.correct).length
  const unattemptedQuizCount = quizItems.filter(item => item.answer === undefined).length

  const filteredQuizItems = quizItems.filter(item => {
    if (quizFilter === 'passed') return item.answer?.correct === true
    if (quizFilter === 'review') return item.answer !== undefined && !item.answer.correct
    if (quizFilter === 'unattempted') return item.answer === undefined
    return true
  })

  return (
    <div className="screen-padding library-screen">
      <div className="screen-heading">
        <p className="eyebrow">MY LIBRARY</p>
        <h1>보관함</h1>
        <p className="muted">학습 기록과 저장한 내용을 다시 볼 수 있어요.</p>
        {data.creator.bio && (
          <button className="text-link" onClick={onCreator}>
            강의자 화면으로 돌아가기 <ChevronRight />
          </button>
        )}
      </div>

      <div className="filter-row">
        {tabs.map(([id, label]) => (
          <button className={tab === id ? 'chip selected' : 'chip'} key={id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="library-list">
        {/* 1. 내 강좌 탭 (전체 / 수강 중 / 완강 서브 필터) */}
        {tab === 'courses' && enrolled.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                courseFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setCourseFilter('all')}
            >
              전체 ({enrolled.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                courseFilter === 'in_progress'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setCourseFilter('in_progress')}
            >
              수강 중 ({inProgressCourses.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                courseFilter === 'completed'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setCourseFilter('completed')}
            >
              완강 ({completedCourses.length})
            </button>
          </div>
        )}

        {tab === 'courses' && displayedCourses.map(course => {
          const isCompleted = progressPercent(course, data) === 100
          return (
            <button className="library-item" key={course.id} onClick={() => onCourse(course)}>
              <span className="library-cover" style={{ backgroundImage: `url(${course.cover})` }} />
              <span>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {isCompleted ? '완강' : '수강 중'}
                  </span>
                  <strong>{course.title}</strong>
                </div>
                <small>진도 {progressPercent(course, data)}% · 메모 {data.notes.filter(note => note.courseId === course.id).length}개</small>
              </span>
              <ChevronRight />
            </button>
          )
        })}

        {tab === 'courses' && enrolled.length > 0 && displayedCourses.length === 0 && (
          <div className="empty-box">
            {courseFilter === 'completed'
              ? '완강한 강좌가 아직 없습니다. 수강 중인 강좌를 계속 학습해 보세요!'
              : '수강 중인 강좌가 없습니다.'}
          </div>
        )}

        {/* 2. 좋아요 탭 */}
        {tab === 'likes' && data.likes.map(id => {
          const course = courses.find(item => id === `ot-${item.id}` || allLessons(item).some(lesson => lesson.id === id))
          if (!course) return null
          const lesson = allLessons(course).find(item => item.id === id)
          return (
            <button className="library-item" key={id} onClick={() => lesson ? onLesson(course, lesson.id) : onCourse(course)}>
              <Heart />
              <span>
                <strong>{lesson?.title ?? `${course.title} 무료 OT`}</strong>
                <small>{course.title}</small>
              </span>
              <ChevronRight />
            </button>
          )
        })}

        {/* 3. 메모 탭 */}
        {tab === 'notes' && data.notes.map(note => {
          const course = findCourse(note.courseId)
          if (!course) return null
          return (
            <button className="library-item" key={note.id} onClick={() => onLesson(course, note.lessonId, note.at)}>
              <FileText />
              <span>
                <strong>{note.text}</strong>
                <small>{course.title} · {Math.floor(note.at / 60)}:{String(note.at % 60).padStart(2, '0')}</small>
              </span>
              <ChevronRight />
            </button>
          )
        })}

        {/* 4. 수정 사항: '퀴즈' 탭 (코스 퀴즈는 각 강좌마다 하나, 클릭 시 퀴즈 화면으로 이동하여 재시험 여부 선택) */}
        {tab === 'quiz' && coursesForQuizzes.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                quizFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setQuizFilter('all')}
            >
              전체 ({coursesForQuizzes.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                quizFilter === 'passed'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setQuizFilter('passed')}
            >
              정답 ({passedQuizCount})
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                quizFilter === 'review'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setQuizFilter('review')}
            >
              복습 필요 ({reviewQuizCount})
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                quizFilter === 'unattempted'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setQuizFilter('unattempted')}
            >
              미응시 ({unattemptedQuizCount})
            </button>
          </div>
        )}

        {tab === 'quiz' && (
          <div className="space-y-3 w-full">
            {filteredQuizItems.map(({ course, courseQuiz, answer }) => {
              return (
                <button
                  key={course.id}
                  type="button"
                  className="w-full text-left p-3.5 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs rounded-2xl transition-all flex items-center justify-between gap-3 group"
                  onClick={() => onSelectCourseQuiz(course, courseQuiz)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 border border-slate-100"
                      style={{ backgroundImage: `url(${course.cover})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          코스 퀴즈
                        </span>
                        {answer === undefined ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            미응시
                          </span>
                        ) : answer.correct ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> 100점 (정답)
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-0.5">
                            <X className="w-3.5 h-3.5" /> 0점 (오답/복습 필요)
                          </span>
                        )}
                      </div>
                      <strong className="text-sm font-bold text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                        {course.title}
                      </strong>
                      <p className="text-xs text-slate-500 truncate mb-0 mt-0.5">
                        {courseQuiz.prompt}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )
            })}
            {filteredQuizItems.length === 0 && (
              <div className="empty-box">
                해당 조건에 일치하는 퀴즈가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {(
        (tab === 'courses' && enrolled.length === 0) ||
        (tab === 'likes' && data.likes.length === 0) ||
        (tab === 'notes' && data.notes.length === 0) ||
        (tab === 'quiz' && coursesForQuizzes.length === 0)
      ) && (
        <div className="empty-box">
          아직 이 목록에 저장된 내용이 없습니다.
          <button className="text-link" onClick={onExplore}>강좌 탐색하기 <ChevronRight /></button>
        </div>
      )}
    </div>
  )
}

function CourseQuizScreen({
  course,
  question,
  answers,
  onBack,
  onSubmitAnswer,
}: {
  course: Course
  question: Question
  answers: AppState['answers']
  onBack: () => void
  onSubmitAnswer: (selected: number, correct: boolean) => void
}) {
  const latestAnswer = useMemo(
    () => [...answers].reverse().find(a => a.questionId === question.id),
    [answers, question.id]
  )

  const [mode, setMode] = useState<'decision' | 'testing' | 'result'>('decision')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [currentResult, setCurrentResult] = useState<{ selected: number; correct: boolean } | null>(null)

  const isAlreadyTested = latestAnswer !== undefined

  return (
    <main className="quiz-screen mobile-shell bg-slate-50 min-h-screen flex flex-col justify-between">
      {/* Quiz Head */}
      <div>
        <div className="quiz-head flex items-center justify-between pb-3 border-b border-slate-100">
          <button
            className="icon-only"
            onClick={() => {
              if (mode === 'testing' || mode === 'result') {
                setMode('decision')
              } else {
                onBack()
              }
            }}
            aria-label="뒤로"
          >
            <ArrowLeft />
          </button>
          <span className="font-bold text-slate-800 text-xs">
            {mode === 'testing' ? '코스 퀴즈 풀기' : mode === 'result' ? '퀴즈 채점 결과' : '코스 퀴즈'}
          </span>
          <div className="w-11" />
        </div>

        <div className="quiz-body pt-4">
          {/* 강좌 정보 카드 */}
          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl mb-4 shadow-2xs">
            <span
              className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 border border-slate-100"
              style={{ backgroundImage: `url(${course.cover})` }}
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mb-1 inline-block">
                {course.topic} · {course.level}
              </span>
              <h2 className="text-xs font-bold text-slate-900 truncate mb-0">{course.title}</h2>
              <small className="text-xs text-slate-500 block truncate">{course.teacher}</small>
            </div>
          </div>

          {/* 1. 재시험 여부 선택 화면 (mode === 'decision') */}
          {mode === 'decision' && (
            <div className="space-y-4">
              {isAlreadyTested ? (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-600">이전 응시 기록</span>
                    {latestAnswer.correct ? (
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 100점 (정답)
                      </span>
                    ) : (
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> 0점 (오답)
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <strong className="text-xs font-bold text-slate-800 block">
                      Q. {question.prompt}
                    </strong>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-bold text-slate-500 shrink-0">제출했던 답안:</span>
                        <span className={latestAnswer.correct ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                          {question.options[latestAnswer.selected]}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 mt-1">
                      <strong className="text-slate-800 block mb-0.5">정답 및 해설</strong>
                      {question.explanation}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-indigo-900 mb-0">
                      이미 응시한 코스 퀴즈입니다.
                    </p>
                    <p className="text-xs text-indigo-700 mb-0">
                      재시험에 응시하시면 점수가 새로 반영됩니다. 재시험을 보시겠습니까?
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      className="primary-button full"
                      onClick={() => {
                        setSelectedOption(null)
                        setMode('testing')
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" /> 재시험 응시하기
                    </button>
                    <button
                      type="button"
                      className="outline-button full"
                      onClick={onBack}
                    >
                      보관함으로 돌아가기
                    </button>
                  </div>
                </div>
              ) : (
                /* 미응시 상태 */
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-600">퀴즈 상태</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      미응시
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <span className="tag blue">
                      <Sparkles className="w-3 h-3" /> 코스 종합 확인 문제
                    </span>
                    <strong className="text-xs font-bold text-slate-800 block pt-1">
                      Q. {question.prompt}
                    </strong>
                    <p className="text-xs text-slate-500">
                      코스 완강 후 학습 내용을 총괄 점검하는 1문항 코스 퀴즈입니다.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      className="primary-button full"
                      onClick={() => {
                        setSelectedOption(null)
                        setMode('testing')
                      }}
                    >
                      퀴즈 응시하기 <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                    <button
                      type="button"
                      className="outline-button full"
                      onClick={onBack}
                    >
                      보관함으로 돌아가기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. 퀴즈 풀기 화면 (mode === 'testing') */}
          {mode === 'testing' && (
            <div className="space-y-4">
              <span className="tag blue">
                <Sparkles className="w-3 h-3" /> 대본 기반 · 강의자 검수 코스 퀴즈
              </span>
              <h1 className="text-base font-black text-slate-900 leading-snug">
                {question.prompt}
              </h1>
              <p className="text-xs text-slate-500">
                학습한 핵심 내용을 떠올려 정답을 하나 선택해 주세요.
              </p>

              {/* 사용자 모드 퀴즈 카드 UI (A, B, C, D 배지) */}
              <div className="answer-list">
                {question.options.map((option, index) => {
                  const isSelected = selectedOption === index
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`answer transition-all ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedOption(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      <span className="flex-1">{option}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  )
                })}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  className="primary-button full"
                  disabled={selectedOption === null}
                  onClick={() => {
                    if (selectedOption !== null) {
                      const correct = selectedOption === question.correct
                      onSubmitAnswer(selectedOption, correct)
                      setCurrentResult({ selected: selectedOption, correct })
                      setMode('result')
                    }
                  }}
                >
                  답안 제출하기
                </button>
                <button
                  type="button"
                  className="outline-button full"
                  onClick={() => setMode('decision')}
                >
                  응시 취소하고 돌아가기
                </button>
              </div>
            </div>
          )}

          {/* 3. 퀴즈 제출 결과 화면 (mode === 'result') */}
          {mode === 'result' && currentResult && (
            <div className="space-y-4">
              <div className={currentResult.correct ? 'answer-feedback good' : 'answer-feedback'}>
                <div className="flex items-center gap-2 mb-1.5">
                  {currentResult.correct ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">
                      ✕
                    </span>
                  )}
                  <strong className="text-sm font-extrabold">
                    {currentResult.correct ? '정답입니다! 100점 획득' : '아쉽게도 오답입니다 (0점)'}
                  </strong>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{question.explanation}</p>
              </div>

              <div className="answer-list">
                {question.options.map((option, index) => {
                  const isUserChoice = currentResult.selected === index
                  const isCorrectChoice = question.correct === index
                  let cardClass = 'answer'
                  if (isUserChoice) {
                    cardClass = currentResult.correct ? 'answer selected correct' : 'answer selected wrong'
                  } else if (isCorrectChoice) {
                    cardClass = 'answer correct'
                  }

                  return (
                    <div key={option} className={cardClass}>
                      <span>{String.fromCharCode(65 + index)}</span>
                      <span className="flex-1">{option}</span>
                      {isCorrectChoice && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          정답
                        </span>
                      )}
                      {isUserChoice && !isCorrectChoice && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          내 답안
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  className="primary-button full"
                  onClick={onBack}
                >
                  보관함으로 돌아가기 <ChevronRight className="w-4 h-4 ml-1" />
                </button>
                <button
                  type="button"
                  className="outline-button full"
                  onClick={() => {
                    setSelectedOption(null)
                    setMode('testing')
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1" /> 다시 재시험 보기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function MyPageScreen({
  profile,
  onUpdateLearner,
  onRestart,
  onCreator,
  onLogout,
  isDemoEmpty,
  onSwitchDemoState,
}: {
  profile: LearnerProfile
  onUpdateLearner: (change: Partial<LearnerProfile>) => void
  onRestart: () => void
  onCreator: () => void
  onLogout: () => void
  isDemoEmpty?: boolean
  onSwitchDemoState?: (mode: 'rich' | 'empty') => void
}) {
  // 프로필 상태
  const [name, setName] = useState(profile.name || '김배움')
  const [avatar, setAvatar] = useState(
    profile.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  )

  // 온보딩 정보 상태
  const [status, setStatus] = useState(profile.status || '재직 중')
  const [job, setJob] = useState(profile.job || jobs[0])
  const [topics, setTopics] = useState<string[]>(profile.interests || ['문서 작성', '데이터 분석'])

  // 결제 방식 상태
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(profile.paymentMethods || [])
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [payType, setPayType] = useState<PaymentMethod['type']>('card')
  const [payName, setPayName] = useState('')
  const [payNumber, setPayNumber] = useState('')

  // 로그아웃 모달 상태
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const toggleTopic = (item: string) => {
    setTopics(current =>
      current.includes(item) ? current.filter(t => t !== item) : [...current, item]
    )
  }

  const handleSaveProfile = () => {
    onUpdateLearner({ name, avatar })
  }

  const handleSaveOnboarding = () => {
    onUpdateLearner({ status, job, interests: topics })
  }

  const handleAddPayment = () => {
    if (!payName.trim() || !payNumber.trim()) return
    const newMethod: PaymentMethod = {
      id: `pm-${crypto.randomUUID()}`,
      type: payType,
      name: payName.trim(),
      numberMasked: payNumber.trim(),
      isDefault: paymentMethods.length === 0,
    }
    const updated = [...paymentMethods, newMethod]
    setPaymentMethods(updated)
    onUpdateLearner({ paymentMethods: updated })
    setPayName('')
    setPayNumber('')
    setIsAddingPayment(false)
  }

  const handleDeletePayment = (id: string) => {
    const updated = paymentMethods.filter(m => m.id !== id)
    setPaymentMethods(updated)
    onUpdateLearner({ paymentMethods: updated })
  }

  const handleSetDefaultPayment = (id: string) => {
    const updated = paymentMethods.map(m => ({ ...m, isDefault: m.id === id }))
    setPaymentMethods(updated)
    onUpdateLearner({ paymentMethods: updated })
  }

  return (
    <main className="screen-padding mypage-screen space-y-5 animate-in fade-in duration-200">
      <div className="screen-heading">
        <p className="eyebrow">MY BAEUGO</p>
        <h1>마이페이지</h1>
        <p className="muted">프로필, 온보딩 학습 설정, 결제 방식을 관리하세요.</p>
      </div>

      {/* 1. 프로필 수정 (프로필 사진, 이름) */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
          <UserRound className="w-3.5 h-3.5 text-indigo-600" />
          <span>수강생 프로필</span>
        </h2>

        <div className="flex items-center gap-3.5">
          <div
            className="w-14 h-14 rounded-full bg-cover bg-center shrink-0 border-2 border-indigo-200 shadow-sm"
            style={{ backgroundImage: `url(${avatar})` }}
          />
          <div className="flex-1 space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">프로필 사진 선택</span>
            <div className="flex items-center gap-2">
              {[
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
              ].map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(img)}
                  className={`w-7 h-7 rounded-full bg-cover bg-center border ${
                    avatar === img ? 'ring-2 ring-indigo-600 scale-105' : 'opacity-70'
                  }`}
                  style={{ backgroundImage: `url(${img})` }}
                />
              ))}
            </div>
          </div>
        </div>

        <label className="form-stack">
          수강생 이름
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="이름 입력"
          />
        </label>

        <button type="button" className="outline-button full" onClick={handleSaveProfile}>
          프로필 사진 및 이름 저장
        </button>
      </div>

      {/* 2. 온보딩 정보 수정 */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>온보딩 정보 수정</span>
        </h2>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 block">현재 상황</span>
          <div className="option-stack">
            {['취업 준비 중', '재직 중', '이직·직무 전환 준비 중'].map(item => (
              <button
                key={item}
                type="button"
                className={status === item ? 'choice selected' : 'choice'}
                onClick={() => setStatus(item)}
              >
                {item}
                {status === item && <Check />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 block">현재 또는 희망 직무</span>
          <div className="chip-grid">
            {jobs.map(item => (
              <button
                key={item}
                type="button"
                className={job === item ? 'chip selected' : 'chip'}
                onClick={() => setJob(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 block">관심 주제 (복수 선택)</span>
          <div className="chip-grid">
            {interests.map(item => (
              <button
                key={item}
                type="button"
                className={topics.includes(item) ? 'chip selected' : 'chip'}
                onClick={() => toggleTopic(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="primary-button full" onClick={handleSaveOnboarding}>
          온보딩 정보 저장
        </button>
      </div>

      {/* 3. 결제 방식 관리 */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>결제 방식 관리</span>
          </h2>
          <button
            type="button"
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
            onClick={() => setIsAddingPayment(prev => !prev)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingPayment ? '닫기' : '결제 수단 추가'}</span>
          </button>
        </div>

        {/* 등록된 결제 수단 목록 */}
        <div className="space-y-2">
          {paymentMethods.length === 0 ? (
            <div className="empty-box py-3 text-xs">등록된 결제 수단이 없습니다.</div>
          ) : (
            paymentMethods.map(method => (
              <div
                key={method.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs font-bold text-slate-900">{method.name}</strong>
                    {method.isDefault && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                        기본 결제
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono block mt-0.5">{method.numberMasked}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!method.isDefault && (
                    <button
                      type="button"
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
                      onClick={() => handleSetDefaultPayment(method.id)}
                    >
                      기본 설정
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    onClick={() => handleDeletePayment(method.id)}
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 결제 수단 추가 폼 */}
        {isAddingPayment && (
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 mt-2">
            <span className="text-xs font-bold text-indigo-900 block">새 결제 수단 등록</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-700">
                수단 종류
                <select
                  className="mt-1 w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                  value={payType}
                  onChange={e => setPayType(e.target.value as PaymentMethod['type'])}
                >
                  <option value="card">신용/체크카드</option>
                  <option value="kakaopay">카카오페이</option>
                  <option value="naverpay">네이버페이</option>
                  <option value="toss">토스페이</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">
                카드/간편결제 명칭
                <input
                  className="mt-1 w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                  value={payName}
                  onChange={e => setPayName(e.target.value)}
                  placeholder="예: 신한카드 Deep Dream"
                />
              </label>
            </div>
            <label className="text-xs font-bold text-slate-700 block">
              카드번호 또는 연결 계좌 정보
              <input
                className="mt-1 w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                value={payNumber}
                onChange={e => setPayNumber(e.target.value)}
                placeholder="예: ****-****-****-1234"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="primary-button flex-1 py-1.5 text-xs"
                onClick={handleAddPayment}
                disabled={!payName.trim() || !payNumber.trim()}
              >
                결제 수단 등록
              </button>
              <button
                type="button"
                className="outline-button py-1.5 text-xs"
                onClick={() => setIsAddingPayment(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Mock 데모 데이터 상태 테스트 (정상 상태 vs Empty State) */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>데모 Mock 데이터 상태</span>
          </h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDemoEmpty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {isDemoEmpty ? 'Empty State 모드' : '정상 Mock 모드'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-0">
          모든 화면의 정상 상태(완강/수강중/메모/퀴즈/통계)와 비어 있는 상태(Empty State)를 즉시 전환하여 테스트할 수 있습니다.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${!isDemoEmpty ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            onClick={() => onSwitchDemoState?.('rich')}
          >
            정상 Mock 데이터
          </button>
          <button
            type="button"
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${isDemoEmpty ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            onClick={() => onSwitchDemoState?.('empty')}
          >
            빈 데이터 (Empty State)
          </button>
        </div>
      </div>

      {/* 5. 모드 전환 & 시작 재설정 */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2.5">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">서비스 모드 및 계정</h2>
        <button
          type="button"
          className="settings-row w-full rounded-xl border border-slate-200"
          onClick={onCreator}
        >
          <span>강의자 모드로 전환</span>
          <ChevronRight />
        </button>
        <button
          type="button"
          className="settings-row w-full rounded-xl border border-slate-200"
          onClick={onRestart}
        >
          <span>온보딩 다시 시작</span>
          <ChevronRight />
        </button>
      </div>

      {/* 5. 수정 사항: 로그아웃 옵션 */}
      <div className="pt-2">
        <button
          type="button"
          className="w-full py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors"
          onClick={() => setLogoutModalOpen(true)}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* 로그아웃 확인 모달 */}
      {logoutModalOpen && (
        <div className="modal-backdrop" onClick={() => setLogoutModalOpen(false)}>
          <div className="modal-card text-center" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <LogOut className="w-5 h-5" />
            </div>
            <h2>로그아웃 하시겠습니까?</h2>
            <p className="text-xs text-slate-600 mb-4">
              로그아웃 시 시작 화면으로 이동합니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="outline-button"
                onClick={() => setLogoutModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-button bg-rose-600 hover:bg-rose-700 border-none"
                onClick={() => {
                  setLogoutModalOpen(false)
                  onLogout()
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}




