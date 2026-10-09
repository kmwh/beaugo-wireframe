'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, FileVideo, LayoutDashboard, ListVideo, Plus, Sparkles, UploadCloud, Users } from 'lucide-react'
import { won, type Course, type Lesson, type Question } from '@/lib/demo-data'
import { progressPercent, type AppState, type CreatorProfile } from '@/lib/app-state'
import { inspectVideo, saveVideo } from '@/lib/blob-store'

type Stage = 'dashboard' | 'form' | 'upload' | 'review' | 'stats'
type UploadKind = 'lesson' | 'ot'
type FileState = { status: 'empty' | 'checking' | 'ready' | 'rejected'; name: string; duration: number; error: string; blobId: string }
const emptyFile: FileState = { status: 'empty', name: '', duration: 0, error: '', blobId: '' }

export function CreatorStudio({ profile, courses, activity, onPublish, onSwitch }: { profile: CreatorProfile; courses: Course[]; activity: AppState; onPublish: (course: Course) => void; onSwitch: () => void }) {
  const [stage, setStage] = useState<Stage>('dashboard')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [topic, setTopic] = useState(profile.keywords[0] ?? '')
  const [level, setLevel] = useState('초급')
  const [price, setPrice] = useState(29000)
  const [plannedMinutes, setPlannedMinutes] = useState(40)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonFile, setLessonFile] = useState<FileState>(emptyFile)
  const [otFile, setOtFile] = useState<FileState>(emptyFile)
  const [transcript, setTranscript] = useState('')
  const [prompt, setPrompt] = useState('')
  const [correctOption, setCorrectOption] = useState('')
  const [explanation, setExplanation] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function chooseFile(kind: UploadKind, file?: File) {
    if (!file) return
    const set = kind === 'lesson' ? setLessonFile : setOtFile
    set({ status: 'checking', name: file.name, duration: 0, error: '', blobId: '' })
    try {
      const duration = await inspectVideo(file)
      const blobId = `${kind}-${crypto.randomUUID()}`
      await saveVideo(blobId, file)
      set({ status: 'ready', name: file.name, duration, error: '', blobId })
      if (kind === 'lesson') {
        setTranscript(current => current || `시연용 대본 초안: ${title || '새 강좌'}의 핵심 내용을 이곳에 직접 입력해 주세요. 실제 STT 연결은 개발 단계에서 진행합니다.`)
        setPrompt(current => current || `${title || '이 강좌'}에서 가장 먼저 확인할 것은 무엇인가요?`)
        setCorrectOption(current => current || '목적과 해결할 문제')
        setExplanation(current => current || '학습 내용을 바탕으로 목적과 해결할 문제부터 정합니다.')
      }
      setToast(`${kind === 'ot' ? 'OT' : '학습'} 영상의 형식·재생 가능 여부를 확인했습니다.`)
    } catch (error) {
      set({ status: 'rejected', name: file.name, duration: 0, error: error instanceof Error ? error.message : '영상 파일을 확인할 수 없습니다.', blobId: '' })
    }
  }
  function publish() {
    if (!title.trim() || !summary.trim() || !topic.trim() || !lessonTitle.trim() || lessonFile.status !== 'ready' || !transcript.trim() || !prompt.trim() || !correctOption.trim() || !explanation.trim() || !reviewed) {
      setToast('강좌 정보·유효한 학습 영상·대본·퀴즈 검수를 모두 완료해 주세요.')
      return
    }
    const id = `creator-${crypto.randomUUID()}`
    const lessonId = `${id}-lesson-1`
    const videoQuiz: Question = { id: `${lessonId}-quiz`, prompt: prompt.trim(), options: [correctOption.trim(), '목적과 무관한 정보', '가장 긴 문장', '임의의 선택'], correct: 0, explanation: explanation.trim() }
    const lesson: Lesson = {
      id: lessonId, title: lessonTitle.trim(), duration: Math.round(lessonFile.duration), video: '', uploadedBlobId: lessonFile.blobId,
      transcript: transcript.trim().split(/\n+/).filter(Boolean).map((text, index) => ({ start: Math.min(index * 3, Math.floor(lessonFile.duration)), text })),
      question: videoQuiz,
    }
    const course: Course = {
      id, title: title.trim(), teacher: 'BAEUGO 강의자', job: profile.job, topic: topic.trim(), tags: [...profile.keywords, topic.trim()],
      level, price: Math.max(0, price), plannedMinutes: Math.max(1, plannedMinutes),
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80', summary: summary.trim(),
      otVideo: otFile.status === 'ready' ? '' : '', otBlobId: otFile.status === 'ready' ? otFile.blobId : undefined,
      units: [{ id: `${id}-unit-1`, title: '핵심 학습 단위', lessons: [lesson], question: { ...videoQuiz, id: `${id}-unit-quiz`, prompt: `${title.trim()} 학습 단위의 핵심은 무엇인가요?` } }],
      finalQuestion: { ...videoQuiz, id: `${id}-final`, prompt: `${title.trim()} 코스에서 가장 중요한 첫 단계는 무엇인가요?` },
      isCreatorCourse: true,
    }
    onPublish(course)
    setStage('dashboard')
    setToast('강좌를 공개했습니다. OT가 있으면 사용자 홈 피드에도 노출됩니다.')
  }
  function startNew() {
    setTitle(''); setSummary(''); setTopic(profile.keywords[0] ?? ''); setLevel('초급'); setPrice(29000); setPlannedMinutes(40); setLessonTitle('')
    setLessonFile(emptyFile); setOtFile(emptyFile); setTranscript(''); setPrompt(''); setCorrectOption(''); setExplanation(''); setReviewed(false)
    setStage('form')
  }
  const canPublish = Boolean(title.trim() && summary.trim() && topic.trim() && lessonTitle.trim() && lessonFile.status === 'ready' && transcript.trim() && prompt.trim() && correctOption.trim() && explanation.trim() && reviewed)
  const purchasedCourses = courses.filter(course => activity.purchased.includes(course.id))
  const answered = activity.answers.filter(answer => courses.some(course => course.id === answer.courseId))
  const estimatedRevenue = purchasedCourses.reduce((sum, course) => sum + course.price, 0)
  const averageProgress = purchasedCourses.length ? Math.round(purchasedCourses.reduce((sum, course) => sum + progressPercent(course, activity), 0) / purchasedCourses.length) : 0
  const quizAccuracy = answered.length ? Math.round(answered.filter(answer => answer.correct).length / answered.length * 100) : 0
  return <main className="creator-shell mobile-shell"><header className="creator-header"><strong>BAEUGO <span>강의자</span></strong><button className="text-link" onClick={onSwitch}>수강 화면 보기 <ChevronRight /></button></header><div className="creator-content">
    {stage === 'dashboard' && <><div className="screen-heading"><p className="eyebrow">CREATOR STUDIO</p><h1>내 강좌를 관리해요</h1><p className="muted">강좌를 등록하고 수강 현황을 확인하세요.</p></div><div className="stats-mini"><div><small>등록 강좌</small><strong>{courses.length}</strong></div><div><small>검수 완료</small><strong>{courses.length}</strong></div><div><small>체험 계정 수강</small><strong>{purchasedCourses.length}</strong></div></div><button className="create-course" onClick={startNew}><Plus /> 새 강좌 등록하기 <ChevronRight /></button><div className="section-title"><h2>내 강좌</h2></div>{courses.length === 0 ? <div className="empty-box">등록한 강좌가 없습니다. 첫 강좌를 만들어 보세요.</div> : courses.map(course => <div className="creator-course" key={course.id}><strong>{course.title}</strong><small>{course.job} · {course.topic} · 공개</small><small>영상 {course.units.flatMap(unit => unit.lessons).length}개 · 체험 계정 진도 {activity.purchased.includes(course.id) ? progressPercent(course, activity) : 0}%</small></div>)}</>}
    {stage === 'form' && <><StepHeader title="강좌 정보" step="1 / 3" onBack={() => setStage('dashboard')} /><div className="form-stack"><label>강좌명<input value={title} onChange={event => setTitle(event.target.value)} placeholder="예: 실무 보고서 작성 첫걸음" /></label><label>강좌 소개<textarea rows={4} value={summary} onChange={event => setSummary(event.target.value)} placeholder="수강생이 배울 내용을 적어 주세요." /></label><label>전문 직무<input value={profile.job} disabled /></label><label>주제<input value={topic} onChange={event => setTopic(event.target.value)} placeholder="예: 문서 작성" /></label><label>난이도<select value={level} onChange={event => setLevel(event.target.value)}><option>초급</option><option>중급</option><option>고급</option></select></label><label>강좌 가격(원)<input type="number" min="0" value={price} onChange={event => setPrice(Number(event.target.value))} /></label><label>계획 학습 시간(분)<input type="number" min="1" value={plannedMinutes} onChange={event => setPlannedMinutes(Number(event.target.value))} /></label><label>첫 학습 영상 제목<input value={lessonTitle} onChange={event => setLessonTitle(event.target.value)} placeholder="예: 핵심 개념 이해하기" /></label></div><button className="primary-button full" disabled={!title.trim() || !summary.trim() || !topic.trim() || !lessonTitle.trim()} onClick={() => setStage('upload')}>영상 등록으로 <ChevronRight /></button></>}
    {stage === 'upload' && <><StepHeader title="영상 업로드" step="2 / 3" onBack={() => setStage('form')} /><p className="muted">먼저 학습 영상을 등록하고, 필요하면 무료 OT도 별도로 등록하세요. 파일 확장자뿐 아니라 브라우저에서 실제 영상 스트림과 재생 가능 여부를 확인합니다.</p><UploadBox title="학습 영상 · 필수" state={lessonFile} onChoose={file => void chooseFile('lesson', file)} /><UploadBox title="무료 OT · 선택" state={otFile} onChoose={file => void chooseFile('ot', file)} /><p className="muted small">영상은 이 브라우저의 로컬 저장소에만 저장됩니다. 업로드 화면은 서버 검증·변환 단계의 시연입니다.</p><button className="primary-button full" disabled={lessonFile.status !== 'ready'} onClick={() => setStage('review')}>대본·퀴즈 검수로 <ChevronRight /></button></>}
    {stage === 'review' && <><StepHeader title="대본·퀴즈 검수" step="3 / 3" onBack={() => setStage('upload')} /><div className="demo-banner"><Sparkles /> 시연용 초안입니다. 실제 음성 인식·AI 생성은 연결되지 않았으며 강의자가 직접 수정·확인합니다.</div><div className="form-stack"><label>영상 대본<textarea rows={6} value={transcript} onChange={event => { setTranscript(event.target.value); setReviewed(false) }} /></label><label>영상별 퀴즈 문제<input value={prompt} onChange={event => { setPrompt(event.target.value); setReviewed(false) }} /></label><label>정답 보기<input value={correctOption} onChange={event => { setCorrectOption(event.target.value); setReviewed(false) }} /></label><label>정답 해설<textarea rows={3} value={explanation} onChange={event => { setExplanation(event.target.value); setReviewed(false) }} /></label><label className="checkbox-row"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> 대본·정답·해설을 검수했습니다.</label></div><div className="publish-check"><strong>공개 전 점검</strong><span><Check /> 강좌 정보 {title && summary ? '완료' : '미완료'}</span><span><Check /> 재생 가능한 영상 {lessonFile.status === 'ready' ? '완료' : '미완료'}</span><span><Check /> 대본·퀴즈 강의자 검수 {reviewed ? '완료' : '미완료'}</span></div><button className="primary-button full" disabled={!canPublish} onClick={publish}>강좌 공개하기</button></>}
    {stage === 'stats' && <><div className="screen-heading"><p className="eyebrow">ANALYTICS</p><h1>강좌 통계</h1><p className="muted">이 브라우저의 체험 계정 기록으로 계산합니다.</p></div><div className="stats-mini"><div><small>등록 강좌</small><strong>{courses.length}</strong></div><div><small>수강 강좌</small><strong>{purchasedCourses.length}</strong></div><div><small>평균 진도</small><strong>{averageProgress}%</strong></div></div><div className="stats-mini"><div><small>퀴즈 응답</small><strong>{answered.length}</strong></div><div><small>정답률</small><strong>{quizAccuracy}%</strong></div><div><small>예상 매출</small><strong>{won(estimatedRevenue)}</strong></div></div><div className="empty-box">다른 사용자들의 실제 수강률·완료율·매출은 서버와 결제가 연결되면 집계할 수 있습니다.</div></>}
  </div><nav className="creator-nav"><button className={stage === 'dashboard' ? 'active' : ''} onClick={() => setStage('dashboard')}><LayoutDashboard /> 대시보드</button><button className={['form', 'upload', 'review'].includes(stage) ? 'active' : ''} onClick={startNew}><ListVideo /> 등록</button><button className={stage === 'stats' ? 'active' : ''} onClick={() => setStage('stats')}><Users /> 통계</button></nav>{toast && <div className="toast" role="status">{toast}</div>}</main>
}

function StepHeader({ title, step, onBack }: { title: string; step: string; onBack: () => void }) { return <div className="step-header"><button className="icon-only" onClick={onBack} aria-label="이전 단계"><ArrowLeft /></button><div><small>{step}</small><h1>{title}</h1></div></div> }
function UploadBox({ title, state, onChoose }: { title: string; state: FileState; onChoose: (file?: File) => void }) {
  return <label className="upload-box"><span><FileVideo /> {title}</span><input type="file" accept="video/*" onChange={event => onChoose(event.target.files?.[0])} /><small>{state.status === 'empty' ? '영상 파일을 선택하세요. 최대 200MB' : state.status === 'checking' ? `${state.name} · 영상 검증 중…` : state.status === 'ready' ? `${state.name} · 재생 확인 완료 (${Math.round(state.duration)}초)` : `${state.name} · ${state.error}`}</small>{state.status === 'rejected' && <em>파일을 다시 선택해 주세요.</em>}</label>
}
