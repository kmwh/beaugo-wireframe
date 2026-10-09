'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Bookmark, Check, ChevronRight, Clock3, FileText,
  Heart, Home, LockKeyhole, Play, Plus, Search, Sparkles,
  Target, UserRound, X,
} from 'lucide-react'
import { allLessons, demoCourses, interests, jobs, minutes, won, type Course, type Lesson, type Question } from '@/lib/demo-data'
import { initialState, loadState, saveState, progressPercent, nextLearningItemId, hasWrongAnswer, type AppState, type Role, type Note, type StudyWindow } from '@/lib/app-state'
import { readVideo } from '@/lib/blob-store'
import { CreatorStudio } from '@/components/creator-studio'
import { LearningFeed, type LearningQuizContext } from '@/components/learning-feed'

type Screen = 'welcome' | 'onboarding' | 'home' | 'plan' | 'explore' | 'search' | 'settings' | 'detail' | 'lesson' | 'quiz' | 'library' | 'creator'
type QuizContext = LearningQuizContext
type LibraryTab = 'courses' | 'likes' | 'transcripts' | 'notes' | 'wrong'

const demoNotice = '체험용 화면입니다. 결제·STT·AI 문제 생성은 실제 서비스와 연결되지 않습니다.'

export default function BaeugoApp() {
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState<AppState>(initialState)
  const [screen, setScreen] = useState<Screen>('welcome')
  const [courseId, setCourseId] = useState('report')
  const [lessonId, setLessonId] = useState('report-u1-v1')
  const [quizContext, setQuizContext] = useState<QuizContext | null>(null)
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
    const course = courses.find(item => item.id === context.courseId) ?? selectedCourse
    if (context.kind === 'video') {
      const unit = course.units[context.unitIndex]
      const index = unit.lessons.findIndex(item => item.id === context.lessonId)
      if (index < unit.lessons.length - 1) openLesson(course, unit.lessons[index + 1].id)
      else startQuiz({ kind: 'unit', courseId: course.id, unitIndex: context.unitIndex })
    } else if (context.kind === 'unit') {
      if (context.unitIndex < course.units.length - 1) openLesson(course, course.units[context.unitIndex + 1].lessons[0].id)
      else startQuiz({ kind: 'final', courseId: course.id, unitIndex: context.unitIndex })
    } else { setCourseId(course.id); setScreen('detail'); setMessage('코스 종합 퀴즈를 마쳤습니다. 오답은 보관함에서 다시 풀 수 있어요.') }
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

  if (!hydrated) return <div className="loading-shell">BAEUGO</div>
  if (screen === 'welcome') return <Welcome onChoose={role => { update(current => ({ ...current, role })); setScreen('onboarding') }} />
  if (screen === 'onboarding') return <Onboarding role={data.role ?? 'learner'} onBack={() => setScreen('welcome')} onComplete={partial => {
    update(current => ({ ...current, ...partial, onboarded: true }))
    setScreen(data.role === 'creator' ? 'creator' : 'home')
  }} />
  if (screen === 'creator') return <CreatorStudio profile={data.creator} courses={data.creatorCourses} activity={data} onPublish={course => {
    update(current => ({ ...current, creatorCourses: [course, ...current.creatorCourses] }))
    setMessage('강좌가 공개되었습니다. 수강 사용자 탐색에서 확인할 수 있습니다.')
  }} onSwitch={() => { update(current => ({ ...current, role: 'learner' })); setScreen('home') }} />
  if (screen === 'lesson') return <LearningFeed key={`${selectedCourse.id}-${lessonId}`} course={selectedCourse} startId={lessonId} notes={data.notes} likes={data.likes} answers={data.answers} onLike={toggleLike} onNote={saveNote} onProgress={saveProgress} onWatched={markVideoWatched} onAnswer={submitAnswer} onBack={() => setScreen('detail')} onComplete={() => { setScreen('detail'); setMessage('강좌 학습을 마쳤습니다. 오답과 메모는 보관함에서 복습할 수 있어요.') }} />
  if (screen === 'quiz' && quizContext) {
    const course = courses.find(item => item.id === quizContext.courseId) ?? selectedCourse
    const question = quizContext.kind === 'video' ? allLessons(course).find(item => item.id === quizContext.lessonId)?.question ?? course.finalQuestion : quizContext.kind === 'unit' ? course.units[quizContext.unitIndex].question : course.finalQuestion
    return <QuizScreen key={question.id} context={quizContext} question={question} onSubmit={(answer, correct) => submitAnswer(quizContext, answer, correct, question)} onNext={() => afterQuiz(quizContext)} onBack={() => quizContext.kind === 'video' ? setScreen('lesson') : setScreen('detail')} />
  }

  return <AppShell screen={screen} hideNav={screen === 'detail' || screen === 'plan' || (screen === 'home' && otActive)} onNavigate={next => { setOtActive(false); setScreen(next) }}>
    {screen === 'home' && <HomeScreen courses={courses} data={data} onCourse={course => openCourse(course, 'home')} onResume={resume} onOtActive={setOtActive} onLike={toggleLike} onEditPlan={() => setScreen('plan')} />}
    {screen === 'plan' && <PlanScreen profile={data.learner} onBack={() => setScreen('home')} onSave={(dailyMinutes, studyWindows) => { update(current => ({ ...current, learner: { ...current.learner, dailyMinutes, studyWindows } })); setScreen('home'); setMessage('학습 계획을 저장했습니다.') }} />}
    {screen === 'explore' && <ExploreScreen courses={courses} data={data} filter={filter} setFilter={setFilter} onSearch={() => setScreen('search')} onCourse={course => openCourse(course, 'explore')} />}
    {screen === 'search' && <SearchScreen courses={courses} query={query} setQuery={setQuery} onBack={() => setScreen('explore')} onCourse={course => openCourse(course, 'search')} />}
    {screen === 'settings' && <SettingsScreen profile={data.learner} onBack={() => setScreen('home')} onRestart={() => { update(current => ({ ...current, onboarded: false })); setScreen('welcome') }} />}
    {screen === 'detail' && <CourseDetail course={selectedCourse} data={data} hasAccess={hasAccess} onBack={() => setScreen(backScreen)} onOt={() => { setScreen('home'); window.setTimeout(() => document.getElementById(`ot-${selectedCourse.id}`)?.scrollIntoView({ behavior: 'smooth' }), 80) }} onBuy={() => setPurchaseOpen(true)} onResume={() => resume(selectedCourse)} onLesson={id => openLesson(selectedCourse, id)} />}
    {screen === 'library' && <LibraryScreen courses={courses} data={data} tab={libraryTab} setTab={setLibraryTab} onCourse={course => openCourse(course, 'library')} onLesson={(course, id, seek) => openLesson(course, id, seek)} onExplore={() => setScreen('explore')} onCreator={() => { update(current => ({ ...current, role: 'creator' })); setScreen('creator') }} onRetry={answer => { const course = courses.find(item => item.id === answer.courseId); if (!course) return; const kind: QuizContext['kind'] = answer.lessonId ? 'video' : answer.questionId.endsWith('-final') ? 'final' : 'unit'; const unitIndex = Math.max(0, course.units.findIndex(unit => unit.question.id === answer.questionId || unit.lessons.some(lesson => lesson.id === answer.lessonId))); startQuiz({ kind, courseId: course.id, unitIndex, lessonId: answer.lessonId }) }} />}
    {purchaseOpen && <div className="modal-backdrop" role="presentation" onClick={() => setPurchaseOpen(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-label="체험용 강좌 구매" onClick={event => event.stopPropagation()}><button className="icon-only modal-close" onClick={() => setPurchaseOpen(false)} aria-label="닫기"><X /></button><p className="eyebrow">체험용 결제</p><h2>{selectedCourse.title}</h2><p>{won(selectedCourse.price)} · 실제 결제는 이루어지지 않습니다.</p><button className="primary-button" onClick={buySelected}>체험용으로 수강 시작</button></div></div>}
    {message && <div className="toast" role="status">{message}</div>}
    <span className="sr-only">{demoNotice}</span>
  </AppShell>
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

function StudyPlanFields({ dailyMinutes, setDailyMinutes, windows, setWindows }: { dailyMinutes: number; setDailyMinutes: (value: number) => void; windows: StudyWindow[]; setWindows: React.Dispatch<React.SetStateAction<StudyWindow[]>> }) {
  const updateWindow = (id: string, field: 'start' | 'end', value: string) => setWindows(current => current.map(window => window.id === id ? { ...window, [field]: value } : window))
  const ordered = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const overlap = ordered.some((window, index) => index > 0 && window.start && ordered[index - 1].end && window.start < ordered[index - 1].end)
  return <div className="form-stack study-plan-fields"><label>하루 목표 학습 시간<select value={dailyMinutes} onChange={event => setDailyMinutes(Number(event.target.value))}>{[10, 15, 20, 30, 45, 60, 90, 120].map(value => <option key={value} value={value}>{value}분</option>)}</select></label><div className="study-window-header"><strong>학습할 시간대 <span className="optional-label">선택 사항</span></strong><p>시간대를 정하지 않고 시작해도 돼요. 필요하면 여러 개를 추가할 수 있습니다.</p></div><div className="study-window-list">{windows.map((window, index) => <div className="study-window" key={window.id}><span className="study-window-number">{index + 1}</span><label>시작<input type="time" aria-label={`${index + 1}번째 시작 시간`} value={window.start} onChange={event => updateWindow(window.id, 'start', event.target.value)} /></label><span className="study-window-separator">~</span><label>종료<input type="time" aria-label={`${index + 1}번째 종료 시간`} value={window.end} onChange={event => updateWindow(window.id, 'end', event.target.value)} /></label><button type="button" className="remove-window" aria-label={`${index + 1}번째 시간대 삭제`} onClick={() => setWindows(current => current.filter(item => item.id !== window.id))}><X /></button></div>)}</div><button type="button" className="add-window" onClick={() => setWindows(current => [...current, { id: crypto.randomUUID(), start: '', end: '' }])}><Plus /> 시간대 추가</button>{windows.some(window => window.start && window.end && window.start >= window.end) && <p className="field-error">종료 시간은 시작 시간보다 늦어야 합니다.</p>}{overlap && <p className="field-error">겹치는 시간대는 등록할 수 없습니다.</p>}</div>
}

function Onboarding({ role, onBack, onComplete }: { role: Role; onBack: () => void; onComplete: (value: Partial<AppState>) => void }) {
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('')
  const [job, setJob] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [dailyMinutes, setDailyMinutes] = useState(20)
  const [studyWindows, setStudyWindows] = useState<StudyWindow[]>([])
  const [bio, setBio] = useState('')
  const isCreator = role === 'creator'
  const titles = isCreator ? ['전문 직무를 알려 주세요', '강의 키워드를 선택해 주세요', '강사 약력을 입력해 주세요'] : ['현재 어떤 상황인가요?', '현재 또는 희망 직무는?', '관심 주제를 선택해 주세요', '하루 학습 계획을 정해요']
  const total = titles.length
  const canContinue = isCreator ? step === 0 ? Boolean(job) : step === 1 ? topics.length > 0 : bio.trim().length >= 5 : step === 0 ? Boolean(status) : step === 1 ? Boolean(job) : step === 2 ? topics.length > 0 : dailyMinutes > 0 && validStudyWindows(studyWindows)
  const toggleTopic = (value: string) => setTopics(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  function next() {
    if (!canContinue) return
    if (step < total - 1) setStep(step + 1)
    else if (isCreator) onComplete({ creator: { job, keywords: topics, bio } })
    else onComplete({ learner: { status, job, interests: topics, dailyMinutes, studyWindows: [...studyWindows].sort((a, b) => a.start.localeCompare(b.start)) } })
  }
  return <main className="onboarding mobile-shell"><div className="onboarding-head"><button className="icon-only" onClick={() => step ? setStep(step - 1) : onBack()} aria-label="뒤로"><ArrowLeft /></button><span>{step + 1} / {total}</span></div><div className="step-progress"><span style={{ width: `${(step + 1) / total * 100}%` }} /></div><section className="onboarding-body"><p className="eyebrow">{isCreator ? '강의자 시작하기' : '나에게 맞는 학습'}</p><h1>{titles[step]}</h1>{!isCreator && step === 0 && <div className="option-stack">{['취업 준비 중', '재직 중', '이직·직무 전환 준비 중'].map(item => <button className={status === item ? 'choice selected' : 'choice'} key={item} onClick={() => setStatus(item)}>{item}{status === item && <Check />}</button>)}</div>}
  {(isCreator ? step === 0 : step === 1) && <div className="chip-grid">{jobs.map(item => <button className={job === item ? 'chip selected' : 'chip'} key={item} onClick={() => setJob(item)}>{item}</button>)}</div>}
  {(isCreator ? step === 1 : step === 2) && <><p className="muted">여러 개를 선택할 수 있습니다.</p><div className="chip-grid">{interests.map(item => <button className={topics.includes(item) ? 'chip selected' : 'chip'} key={item} onClick={() => toggleTopic(item)}>{item}</button>)}</div></>}
  {!isCreator && step === 3 && <StudyPlanFields dailyMinutes={dailyMinutes} setDailyMinutes={setDailyMinutes} windows={studyWindows} setWindows={setStudyWindows} />}
  {isCreator && step === 2 && <label className="form-stack">강사 약력<textarea rows={5} value={bio} onChange={event => setBio(event.target.value)} placeholder="전문 경력과 수강생에게 전하고 싶은 내용을 적어 주세요." /><small className="muted">5자 이상 입력해 주세요.</small></label>}</section><button className="primary-button sticky-inside" disabled={!canContinue} onClick={next}>{step === total - 1 ? '완료하고 시작하기' : '다음'} <ChevronRight /></button></main>
}

function PlanScreen({ profile, onBack, onSave }: { profile: AppState['learner']; onBack: () => void; onSave: (dailyMinutes: number, studyWindows: StudyWindow[]) => void }) {
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyMinutes)
  const [studyWindows, setStudyWindows] = useState<StudyWindow[]>(profile.studyWindows)
  return <main className="screen-padding plan-screen"><div className="step-header"><button className="icon-only" onClick={onBack} aria-label="홈으로 돌아가기"><ArrowLeft /></button><div><p className="eyebrow">MY PLAN</p><h1>학습 계획 변경</h1></div></div><p className="muted">출근 전과 퇴근 후처럼 필요한 시간대를 여러 개 지정하세요.</p><StudyPlanFields dailyMinutes={dailyMinutes} setDailyMinutes={setDailyMinutes} windows={studyWindows} setWindows={setStudyWindows} /><button className="primary-button full" disabled={!validStudyWindows(studyWindows)} onClick={() => onSave(dailyMinutes, [...studyWindows].sort((a, b) => a.start.localeCompare(b.start)))}>학습 계획 저장</button></main>
}

function SettingsScreen({ profile, onBack, onRestart }: { profile: AppState['learner']; onBack: () => void; onRestart: () => void }) {
  return <main className="screen-padding settings-screen"><div className="step-header"><button className="icon-only" onClick={onBack} aria-label="홈으로 돌아가기"><ArrowLeft /></button><div><p className="eyebrow">MY BAEUGO</p><h1>설정</h1></div></div><div className="settings-profile"><span className="settings-avatar"><UserRound /></span><div><strong>수강자 프로필</strong><small>{[profile.status, profile.job].filter(Boolean).join(' · ') || '나의 학습 계정'}</small></div></div><div className="section-title"><h2>일반 설정</h2></div><div className="settings-list">{['계정 및 프로필', '알림 설정', '개인정보 및 보안', '고객센터'].map(label => <button className="settings-row" key={label} disabled><span>{label}</span><small>준비 중</small></button>)}</div><div className="section-title"><h2>시작 설정</h2></div><button className="settings-row settings-restart" onClick={onRestart}><span>온보딩 다시 시작</span><ChevronRight /></button><p className="muted small settings-note">역할과 관심사를 다시 선택할 수 있습니다. 기존 강좌·진도·메모 기록은 유지됩니다.</p></main>
}

function AppShell({ children, screen, hideNav, onNavigate }: { children: React.ReactNode; screen: Screen; hideNav: boolean; onNavigate: (screen: Screen) => void }) {
  return <div className="app-frame mobile-shell"><header className="app-header"><button className="logo" onClick={() => onNavigate('home')}>BAEUGO</button><button className="profile-trigger" onClick={() => onNavigate('settings')} aria-label="설정 열기"><UserRound /></button></header><div className={screen === 'home' ? 'app-content home-content' : 'app-content'}>{children}</div>{!hideNav && <nav className="bottom-nav" aria-label="기본 메뉴"><button className={screen === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Home /><span>홈</span></button><button className={screen === 'explore' || screen === 'search' ? 'active' : ''} onClick={() => onNavigate('explore')}><Search /><span>탐색</span></button><button className={screen === 'library' ? 'active' : ''} onClick={() => onNavigate('library')}><Bookmark /><span>보관함</span></button></nav>}</div>
}

function GoalCard({ profile, onEdit }: { profile: AppState['learner']; onEdit: () => void }) {
  return <div className="goal-card"><div className="goal-card-top"><p className="eyebrow">오늘의 학습 목표</p><button className="text-link" onClick={onEdit}>계획 변경 <ChevronRight /></button></div><h1>{profile.dailyMinutes}분만 집중해 볼까요?</h1>{profile.studyWindows.length ? <div className="goal-window-list">{profile.studyWindows.map(window => <span key={window.id}><Clock3 /> {window.start} ~ {window.end}</span>)}</div> : <p className="muted">학습할 시간대를 설정해 주세요.</p>}</div>
}

function HomeScreen({ courses, data, onCourse, onResume, onOtActive, onLike, onEditPlan }: { courses: Course[]; data: AppState; onCourse: (course: Course) => void; onResume: (course: Course) => void; onOtActive: (active: boolean) => void; onLike: (id: string) => void; onEditPlan: () => void }) {
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
  return <div><div className="home-top"><GoalCard profile={data.learner} onEdit={onEditPlan} /><div className="section-title"><div><p className="eyebrow">MY LEARNING</p><h2>이어서 학습</h2></div><span>{enrolled.length}개 강좌</span></div><div className="continue-list">{enrolled.length === 0 && <div className="empty-box">수강 중인 강좌가 없습니다. 아래 인기 강좌 OT부터 살펴보세요.</div>}{enrolled.map(course => <div className="continue-card" key={course.id}><button className="course-main" onClick={() => onCourse(course)}><div className="progress-ring" style={{ '--progress': `${progressPercent(course, data)}%` } as React.CSSProperties}><span>{progressPercent(course, data)}%</span></div><div><strong>{course.title}</strong><small>{nextLearningItemId(course, data) ? '이어갈 학습이 있어요' : '코스 학습 완료'}</small><small>메모 {data.notes.filter(note => note.courseId === course.id).length} · 오답 {data.answers.filter(answer => answer.courseId === course.id && !answer.correct).length}</small></div></button><button className="mini-primary" onClick={() => onResume(course)}>이어가기</button></div>)}</div><div className="section-title ot-section-title"><div><p className="eyebrow">BAEUGO PICK</p><h2>인기 강좌 OT</h2></div><span>아래에서 풀화면으로 보기 ↓</span></div></div><div className="ot-feed" id="home-ot-feed" ref={otRef}>{popular.map((course, index) => <OTSlide key={course.id} course={course} index={index} total={popular.length} liked={data.likes.includes(`ot-${course.id}`)} onLike={() => onLike(`ot-${course.id}`)} onCourse={() => onCourse(course)} />)}</div></div>
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
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) void video.current?.play().catch(() => {}); else video.current?.pause() }, { root: node.parentElement, threshold: 0.6 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <section className="ot-slide" id={`ot-${course.id}`} ref={slide}><video ref={video} className="cover-video" src={source} poster={course.cover} muted playsInline loop preload="metadata" aria-label={`${course.title} 무료 OT`} /><div className="video-shade" /><div className="ot-top"><span className="tag dark">무료 OT</span><span>{index + 1} / {total}</span></div><div className="ot-side"><button className={liked ? 'circle-action liked' : 'circle-action'} onClick={onLike} aria-label="OT 좋아요"><Heart fill={liked ? 'currentColor' : 'none'} /></button><button className="circle-action" onClick={() => video.current?.paused ? void video.current.play() : video.current?.pause()} aria-label="재생 또는 일시정지"><Play /></button></div><div className="ot-bottom"><span className="tag dark">{course.job} · {course.level}</span><h2>{course.title}</h2><p>{course.teacher} · {course.summary}</p><button className="white-button" onClick={onCourse}>강좌 자세히 <ChevronRight /></button><small>위로 스와이프해 다음 OT 보기</small></div></section>
}

function ExploreScreen({ courses, data, filter, setFilter, onSearch, onCourse }: { courses: Course[]; data: AppState; filter: string; setFilter: (value: string) => void; onSearch: () => void; onCourse: (course: Course) => void }) {
  const filters = ['전체', ...new Set(courses.map(course => course.job))]
  const displayed = courses.filter(course => filter === '전체' || course.job === filter).sort((a, b) => Number(b.job === data.learner.job) + Number(b.topic === data.learner.interests[0]) - Number(a.job === data.learner.job) - Number(a.topic === data.learner.interests[0]))
  return <div className="screen-padding"><div className="screen-heading"><p className="eyebrow">DISCOVER</p><h1>강좌를 탐색해요</h1></div><button className="search-bar" onClick={onSearch}><Search /> 직무·주제·강좌 검색</button><div className="keyword-row"><span>인기 검색어</span>{['엑셀', '보고서', '데이터'].map(item => <button key={item} onClick={onSearch}>{item}</button>)}</div><div className="filter-row">{filters.map(item => <button className={filter === item ? 'chip selected' : 'chip'} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="section-title"><div><p className="eyebrow">{data.learner.job ? `${data.learner.job} 관심사 추천` : '인기 강좌'}</p><h2>나에게 맞는 강좌</h2></div><span>{displayed.length}개</span></div><div className="course-grid">{displayed.map(course => <button className="course-tile" key={course.id} onClick={() => onCourse(course)}><div className="portrait-cover" style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,#07101e80),url(${course.cover})` }}><span className="tag dark">{course.topic}</span><span className="cover-play"><Play fill="currentColor" /></span></div><div className="tile-copy"><strong>{course.title}</strong><span>{course.teacher} · {course.level}</span><small>{minutes(course)}분 · {won(course.price)}</small></div></button>)}</div>{displayed.length === 0 && <div className="empty-box">이 직무의 강좌가 아직 없습니다. 다른 분류를 선택해 보세요.</div>}</div>
}

function SearchScreen({ courses, query, setQuery, onBack, onCourse }: { courses: Course[]; query: string; setQuery: (value: string) => void; onBack: () => void; onCourse: (course: Course) => void }) {
  const normalized = query.trim().toLocaleLowerCase()
  const results = normalized ? courses.filter(course => [course.title, course.teacher, course.job, course.topic, ...course.tags, ...course.units.flatMap(unit => unit.lessons.flatMap(lesson => lesson.transcript.map(segment => segment.text)))].join(' ').toLocaleLowerCase().includes(normalized)) : []
  return <div className="screen-padding"><div className="search-input"><button className="icon-only" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button><Search /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="제목·태그·대본 검색" /><button className="icon-only" onClick={() => setQuery('')} aria-label="검색어 지우기"><X /></button></div>{!normalized ? <><div className="section-title"><h2>인기 검색어</h2></div><div className="chip-grid">{['엑셀', '보고서', '데이터', '포트폴리오', '업무 자동화', '기획서'].map(item => <button className="chip" key={item} onClick={() => setQuery(item)}>{item}</button>)}</div><div className="section-title"><h2>카테고리</h2></div><div className="category-list">{jobs.map(item => <button key={item} onClick={() => setQuery(item)}>{item}<ChevronRight /></button>)}</div></> : <><div className="section-title"><h2>‘{query}’ 결과</h2><span>{results.length}개</span></div><div className="result-list">{results.map(course => <button key={course.id} onClick={() => onCourse(course)}><span className="result-cover" style={{ backgroundImage: `url(${course.cover})` }} /><span><strong>{course.title}</strong><small>{course.teacher} · {course.topic}</small><small>{won(course.price)}</small></span><ChevronRight /></button>)}</div>{results.length === 0 && <div className="empty-box">검색 결과가 없습니다. 다른 직무·주제·대본 단어를 입력해 보세요.</div>}</>}</div>
}

function CourseDetail({ course, data, hasAccess, onBack, onOt, onBuy, onResume, onLesson }: { course: Course; data: AppState; hasAccess: boolean; onBack: () => void; onOt: () => void; onBuy: () => void; onResume: () => void; onLesson: (id: string) => void }) {
  const days = Math.ceil(minutes(course) / Math.max(1, data.learner.dailyMinutes))
  return <div className="course-detail"><div className="detail-cover" style={{ backgroundImage: `linear-gradient(180deg,#08132220,#081322aa),url(${course.cover})` }}><button className="icon-only glass" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button><span className="tag dark">{course.job} · {course.level}</span></div><div className="detail-body"><p className="eyebrow">BAEUGO COURSE</p><h1>{course.title}</h1><p className="muted">{course.teacher}</p><p>{course.summary}</p><div className="detail-metrics"><span><Clock3 /> 계획 학습 {minutes(course)}분</span><span><Target /> 하루 {data.learner.dailyMinutes}분이면 약 {days}일</span></div><small className="muted">시연 영상은 학습 흐름 확인을 위해 짧게 제작했습니다.</small>{!hasAccess && (course.otVideo || course.otBlobId) && <button className="ot-preview" onClick={onOt}><Play fill="currentColor" /> 무료 OT 풀화면으로 보기 <ChevronRight /></button>}
  <div className="section-title"><h2>강좌 목차</h2><span>{allLessons(course).length}개 영상</span></div>{course.units.map((unit, unitIndex) => <div className="unit" key={unit.id}><h3>{unitIndex + 1}. {unit.title}</h3>{unit.lessons.map((lesson, index) => <button className="lesson-row" key={lesson.id} onClick={() => hasAccess ? onLesson(lesson.id) : onBuy()}><span className="lesson-number">{index + 1}</span><span><strong>{lesson.title}</strong><small>영상별 퀴즈 · {data.notes.filter(note => note.lessonId === lesson.id).length}개 메모 {hasWrongAnswer(data, lesson.id) ? '· 오답 있음' : ''}</small></span>{hasAccess ? <Play /> : <LockKeyhole />}</button>)}<div className="unit-quiz-label"><Sparkles /> 단위 확인 퀴즈</div></div>)}<div className="unit-quiz-label"><Sparkles /> 코스 종합 퀴즈</div></div><div className="sticky-action"><button className="primary-button" onClick={hasAccess ? onResume : onBuy}>{hasAccess ? '이어가기' : `${won(course.price)} · 구매하기`} <ChevronRight /></button></div></div>
}

function QuizScreen({ context, question, onSubmit, onNext, onBack }: { context: QuizContext; question: Question; onSubmit: (answer: number, correct: boolean) => void; onNext: () => void; onBack: () => void }) {
  const [selection, setSelection] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = selection === question.correct
  return <main className="quiz-screen mobile-shell"><div className="quiz-head"><button className="icon-only" onClick={onBack} aria-label="뒤로"><ArrowLeft /></button><span>{context.kind === 'video' ? '영상별 확인 퀴즈' : context.kind === 'unit' ? '학습 단위 확인 퀴즈' : '코스 종합 퀴즈'}</span></div><div className="quiz-body"><span className="tag blue"><Sparkles /> 대본 기반 · 강의자 검수</span><h1>{question.prompt}</h1><p className="muted">방금 학습한 내용을 떠올려 보세요.</p><div className="answer-list">{question.options.map((option, index) => <button className={selection === index ? submitted ? correct ? 'answer selected correct' : 'answer selected wrong' : 'answer selected' : 'answer'} key={option} disabled={submitted} onClick={() => setSelection(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{submitted && <div className={correct ? 'answer-feedback good' : 'answer-feedback'}><strong>{correct ? '정답이에요!' : '오답노트에 저장했어요'}</strong><p>{question.explanation}</p></div>}</div><div className="quiz-bottom">{!submitted ? <button className="primary-button" disabled={selection === null} onClick={() => { if (selection !== null) { onSubmit(selection, correct); setSubmitted(true) } }}>답안 제출하기</button> : <button className="primary-button" onClick={onNext}>다음 학습으로 <ChevronRight /></button>}</div></main>
}

function LibraryScreen({ courses, data, tab, setTab, onCourse, onLesson, onExplore, onCreator, onRetry }: { courses: Course[]; data: AppState; tab: LibraryTab; setTab: (tab: LibraryTab) => void; onCourse: (course: Course) => void; onLesson: (course: Course, id: string, seek?: number) => void; onExplore: () => void; onCreator: () => void; onRetry: (answer: AppState['answers'][number]) => void }) {
  const tabs: [LibraryTab, string][] = [['courses', '수강 중 강좌'], ['likes', '좋아요'], ['transcripts', '대본 있음'], ['notes', '메모'], ['wrong', '오답']]
  const enrolled = courses.filter(course => data.purchased.includes(course.id))
  const findCourse = (id: string) => courses.find(course => course.id === id)
  return <div className="screen-padding library-screen"><div className="screen-heading"><p className="eyebrow">MY LIBRARY</p><h1>보관함</h1><p className="muted">학습 기록과 저장한 내용을 다시 볼 수 있어요.</p>{data.creator.bio && <button className="text-link" onClick={onCreator}>강의자 화면으로 돌아가기 <ChevronRight /></button>}</div><div className="filter-row">{tabs.map(([id, label]) => <button className={tab === id ? 'chip selected' : 'chip'} key={id} onClick={() => setTab(id)}>{label}</button>)}</div><div className="library-list">{tab === 'courses' && enrolled.map(course => <button className="library-item" key={course.id} onClick={() => onCourse(course)}><span className="library-cover" style={{ backgroundImage: `url(${course.cover})` }} /><span><strong>{course.title}</strong><small>진도 {progressPercent(course, data)}% · 메모 {data.notes.filter(note => note.courseId === course.id).length}</small></span><ChevronRight /></button>)}
  {tab === 'likes' && data.likes.map(id => { const course = courses.find(item => id === `ot-${item.id}` || allLessons(item).some(lesson => lesson.id === id)); if (!course) return null; const lesson = allLessons(course).find(item => item.id === id); return <button className="library-item" key={id} onClick={() => lesson ? onLesson(course, lesson.id) : onCourse(course)}><Heart /><span><strong>{lesson?.title ?? `${course.title} 무료 OT`}</strong><small>{course.title}</small></span><ChevronRight /></button> })}
  {tab === 'transcripts' && enrolled.flatMap(course => allLessons(course).map(lesson => <button className="library-item" key={lesson.id} onClick={() => onLesson(course, lesson.id)}><FileText /><span><strong>{lesson.title}</strong><small>{course.title} · 대본 {lesson.transcript.length}개 구간</small></span><ChevronRight /></button>))}
  {tab === 'notes' && data.notes.map(note => { const course = findCourse(note.courseId); if (!course) return null; return <button className="library-item" key={note.id} onClick={() => onLesson(course, note.lessonId, note.at)}><FileText /><span><strong>{note.text}</strong><small>{course.title} · {Math.floor(note.at / 60)}:{String(note.at % 60).padStart(2, '0')}</small></span><ChevronRight /></button> })}
  {tab === 'wrong' && data.answers.filter(answer => !answer.correct).map(answer => { const course = findCourse(answer.courseId); if (!course) return null; return <button className="library-item" key={answer.id} onClick={() => onRetry(answer)}><Sparkles /><span><strong>{course.title} 오답 다시 풀기</strong><small>{answer.lessonId ? '영상별 퀴즈' : '학습 단위·코스 퀴즈'}</small></span><ChevronRight /></button> })}
  </div>{(tab === 'courses' && enrolled.length === 0 || tab === 'likes' && data.likes.length === 0 || tab === 'notes' && data.notes.length === 0 || tab === 'wrong' && data.answers.every(answer => answer.correct)) && <div className="empty-box">아직 이 목록에 저장된 내용이 없습니다.<button className="text-link" onClick={onExplore}>강좌 탐색하기 <ChevronRight /></button></div>}</div>
}




