'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, FileText, Heart, Pause, Play, Settings2, Sparkles, X } from 'lucide-react'
import type { Course, Lesson, Question } from '@/lib/demo-data'
import type { AnswerRecord, Note } from '@/lib/app-state'
import { readVideo } from '@/lib/blob-store'

export type LearningQuizContext = { kind: 'video' | 'unit' | 'final' | 'course-quiz'; courseId: string; unitIndex: number; lessonId?: string; questionId?: string }
type FeedItem =
  | { id: string; type: 'video'; lesson: Lesson; number: number }
  | { id: string; type: 'quiz'; question: Question; context: LearningQuizContext }
  | { id: string; type: 'complete' }

function createFeed(course: Course): FeedItem[] {
  const items: FeedItem[] = []
  let number = 0
  course.units.forEach((unit, unitIndex) => {
    unit.lessons.forEach(lesson => {
      number += 1
      items.push({ id: lesson.id, type: 'video', lesson, number })
      items.push({ id: lesson.question.id, type: 'quiz', question: lesson.question, context: { kind: 'video', courseId: course.id, unitIndex, lessonId: lesson.id } })
    })
    items.push({ id: unit.question.id, type: 'quiz', question: unit.question, context: { kind: 'unit', courseId: course.id, unitIndex } })
  })
  items.push({ id: course.finalQuestion.id, type: 'quiz', question: course.finalQuestion, context: { kind: 'final', courseId: course.id, unitIndex: course.units.length - 1 } })
  items.push({ id: `${course.id}-complete`, type: 'complete' })
  return items
}

function unlockedFrom(start: number, items: FeedItem[], answers: AnswerRecord[]): number {
  let index = start
  while (index < items.length - 1) {
    const item = items[index]
    if (item.type === 'quiz' && !answers.some(answer => answer.questionId === item.question.id)) break
    index += 1
  }
  return index
}

export function LearningFeed({ course, startId, notes, likes, answers, onLike, onNote, onProgress, onWatched, onAnswer, onBack, onComplete }: {
  course: Course
  startId: string
  notes: Note[]
  likes: string[]
  answers: AnswerRecord[]
  onLike: (lessonId: string) => void
  onNote: (note: Omit<Note, 'id'>) => void
  onProgress: (lessonId: string, position: number) => void
  onWatched: (lesson: Lesson) => void
  onAnswer: (context: LearningQuizContext, selected: number, correct: boolean, question: Question) => void
  onBack: () => void
  onComplete: () => void
}) {
  const items = useMemo(() => createFeed(course), [course])
  const startIndex = Math.max(0, items.findIndex(item => item.id === startId))
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [unlockedIndex, setUnlockedIndex] = useState(() => unlockedFrom(startIndex, items, answers))
  const [startSeek, setStartSeek] = useState(0)
  const feed = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const seek = Number(sessionStorage.getItem('baeugo-seek-once'))
    if (Number.isFinite(seek) && seek > 0) setStartSeek(seek)
    sessionStorage.removeItem('baeugo-seek-once')
    const frame = requestAnimationFrame(() => {
      if (feed.current) feed.current.scrollTop = startIndex * feed.current.clientHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [startIndex])

  function scrollTo(index: number) {
    if (index > unlockedIndex) return
    feed.current?.scrollTo({ top: index * feed.current.clientHeight, behavior: 'smooth' })
  }

  return <main className="learning-feed mobile-shell"><div className="feed-track" ref={feed} onScroll={event => {
    const node = event.currentTarget
    setActiveIndex(Math.min(unlockedIndex, Math.round(node.scrollTop / Math.max(1, node.clientHeight))))
  }} aria-label={`${course.title} 세로형 학습 피드`}>
    {items.slice(0, unlockedIndex + 1).map((item, index) => item.type === 'video' ? <FeedVideoSlide key={item.id} course={course} lesson={item.lesson} number={item.number} total={course.units.reduce((count, unit) => count + unit.lessons.length, 0)} active={activeIndex === index} notes={notes.filter(note => note.lessonId === item.lesson.id)} liked={likes.includes(item.lesson.id)} seek={index === startIndex ? startSeek : 0} onLike={() => onLike(item.lesson.id)} onNote={onNote} onProgress={position => onProgress(item.lesson.id, position)} onWatched={() => onWatched(item.lesson)} onBack={onBack} onNext={() => scrollTo(index + 1)} /> : item.type === 'quiz' ? <FeedQuizSlide key={item.id} question={item.question} context={item.context} existingAnswer={answers.findLast(answer => answer.questionId === item.question.id)} onAnswer={(selected, correct) => { onAnswer(item.context, selected, correct, item.question); setUnlockedIndex(current => Math.max(current, unlockedFrom(index + 1, items, answers))) }} onNext={() => scrollTo(index + 1)} onBack={onBack} /> : <section className="feed-complete-slide" key={item.id}><span className="complete-icon"><Check /></span><p className="eyebrow">COURSE COMPLETE</p><h1>{course.title}<br />학습을 마쳤어요</h1><p>영상과 퀴즈를 모두 완료했습니다. 오답과 메모는 보관함에서 다시 볼 수 있어요.</p><button className="primary-button" onClick={onComplete}>강좌로 돌아가기 <ChevronRight /></button></section>)}
  </div><div className="feed-counter" aria-hidden="true">{activeIndex + 1} / {items.length}</div></main>
}

function useSource(lesson: Lesson) {
  const [source, setSource] = useState(lesson.video)
  useEffect(() => {
    if (!lesson.uploadedBlobId) { setSource(lesson.video); return }
    let active = true
    let objectUrl = ''
    readVideo(lesson.uploadedBlobId).then(blob => {
      if (active && blob) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl) }
    }).catch(() => setSource(''))
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [lesson.uploadedBlobId, lesson.video])
  return source
}

function FeedVideoSlide({ course, lesson, number, total, active, notes, liked, seek, onLike, onNote, onProgress, onWatched, onBack, onNext }: {
  course: Course; lesson: Lesson; number: number; total: number; active: boolean; notes: Note[]; liked: boolean; seek: number
  onLike: () => void; onNote: (note: Omit<Note, 'id'>) => void; onProgress: (position: number) => void; onWatched: () => void; onBack: () => void; onNext: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const lastSavedSecond = useRef(-1)
  const source = useSource(lesson)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [captions, setCaptions] = useState(true)
  const [focus, setFocus] = useState(false)
  const [panel, setPanel] = useState<'transcript' | 'note' | null>(null)
  const [segment, setSegment] = useState(0)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    const player = video.current
    if (!player) return
    if (active && !panel) void player.play().catch(() => setPlaying(false))
    else player.pause()
  }, [active, panel, source])
  useEffect(() => {
    if (!seek || !video.current) return
    const player = video.current
    const apply = () => { player.currentTime = Math.min(seek, Math.max(0, player.duration - 0.2)) }
    if (player.readyState >= 1) apply()
    else player.addEventListener('loadedmetadata', apply, { once: true })
    return () => player.removeEventListener('loadedmetadata', apply)
  }, [seek, source])

  function saveNote() {
    if (!noteText.trim()) return
    onNote({ courseId: course.id, lessonId: lesson.id, at: Math.floor(current), segment, text: noteText.trim() })
    setNoteText('')
    setPanel(null)
  }

  return <section className="feed-video-slide" aria-label={`${number}번째 학습 영상 ${lesson.title}`}><video ref={video} src={source} poster={course.cover} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setEnded(true); setPlaying(false); onWatched() }} onTimeUpdate={() => {
    const position = video.current?.currentTime ?? 0
    setCurrent(position)
    const second = Math.floor(position)
    if (second !== lastSavedSecond.current) { lastSavedSecond.current = second; onProgress(position) }
  }} aria-label={`${lesson.title} 학습 영상`} /><div className="feed-video-shade" /><div className="feed-video-top"><button className="icon-only glass" onClick={onBack} aria-label="강좌로 돌아가기"><ArrowLeft /></button><div><small>영상 {number} / {total}</small><strong>{course.title}</strong></div><button className="icon-only glass" onClick={() => setFocus(!focus)} aria-label="방해 제거 모드"><Settings2 /></button></div><div className="feed-video-actions"><button onClick={() => { if (video.current?.paused) void video.current.play(); else video.current?.pause() }} aria-label={playing ? '일시정지' : '재생'}>{playing ? <Pause /> : <Play />}</button>{!focus && <><button onClick={onLike} aria-label={liked ? '좋아요 취소' : '좋아요'}><Heart fill={liked ? 'currentColor' : 'none'} /></button><button onClick={() => setPanel('transcript')} aria-label="대본과 메모"><FileText /></button><button onClick={() => setCaptions(!captions)} aria-label={captions ? '자막 끄기' : '자막 켜기'}>CC</button></>}</div>{!focus && <div className="feed-video-bottom"><span className="tag dark">{course.units.find(unit => unit.lessons.some(item => item.id === lesson.id))?.title}</span><h1>{lesson.title}</h1>{captions && <p className="caption-text">{lesson.transcript[current >= 2 ? 1 : 0]?.text}</p>}<button className="feed-next" onClick={onNext}>{ended ? '영상 완료 · 퀴즈로' : '아래로 넘기면 확인 퀴즈'} <ChevronDown /></button></div>}<div className="feed-video-progress"><span style={{ width: `${Math.min(100, current / Math.max(1, video.current?.duration || lesson.duration) * 100)}%` }} /></div>
    {panel && <div className="modal-backdrop" onClick={() => setPanel(null)}><div className="modal-card feed-panel" onClick={event => event.stopPropagation()}><button className="icon-only modal-close" onClick={() => setPanel(null)} aria-label="닫기"><X /></button>{panel === 'transcript' ? <><h2>대본과 메모</h2><p className="muted small">문장을 누르면 해당 장면에 메모를 남길 수 있어요.</p><div className="feed-panel-scroll">{lesson.transcript.map((item, index) => <button className="transcript-line" key={index} onClick={() => { setSegment(index); if (video.current) video.current.currentTime = item.start; setCurrent(item.start); setPanel('note') }}><span>{Math.floor(item.start / 60)}:{String(item.start % 60).padStart(2, '0')}</span>{item.text}</button>)}{notes.map(note => <button className="note-row" key={note.id} onClick={() => { if (video.current) video.current.currentTime = note.at; setCurrent(note.at); setPanel(null) }}><FileText /><span><strong>{note.text}</strong><small>{Math.floor(note.at / 60)}:{String(note.at % 60).padStart(2, '0')} · 이 영상의 메모</small></span></button>)}</div><button className="outline-button full" onClick={() => setPanel('note')}>현재 장면에 메모하기</button></> : <><h2>영상별 메모</h2><p className="muted small">{lesson.title} · {Math.floor(current / 60)}:{String(Math.floor(current % 60)).padStart(2, '0')}</p><p className="quote">{lesson.transcript[segment]?.text}</p><textarea autoFocus rows={4} value={noteText} onChange={event => setNoteText(event.target.value)} placeholder="이 장면에서 기억할 내용을 적어 주세요." /><button className="primary-button" disabled={!noteText.trim()} onClick={saveNote}>메모 저장</button></>}</div></div>}
  </section>
}

function FeedQuizSlide({ question, context, existingAnswer, onAnswer, onNext, onBack }: {
  question: Question; context: LearningQuizContext; existingAnswer?: AnswerRecord
  onAnswer: (selected: number, correct: boolean) => void; onNext: () => void; onBack: () => void
}) {
  const [selection, setSelection] = useState<number | null>(existingAnswer?.selected ?? null)
  const [submitted, setSubmitted] = useState(Boolean(existingAnswer))
  const correct = selection === question.correct
  const label = context.kind === 'video' ? '영상 확인 퀴즈' : context.kind === 'unit' ? '섹션 종합 퀴즈' : '강좌 종합 퀴즈'
  return <section className="feed-quiz-slide" aria-label={label}><div className="feed-quiz-top"><button className="icon-only" onClick={onBack} aria-label="강좌로 돌아가기"><ArrowLeft /></button><span>{label}</span></div><div className="feed-quiz-content"><span className="tag blue"><Sparkles /> 대본 기반 · 강의자 검수</span><h1>{question.prompt}</h1><p className="muted">답안을 제출한 뒤 아래로 넘기면 다음 학습이 이어집니다.</p><div className="answer-list">{question.options.map((option, index) => <button className={selection === index ? submitted ? correct ? 'answer selected correct' : 'answer selected wrong' : 'answer selected' : 'answer'} key={option} disabled={submitted} onClick={() => setSelection(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{submitted && <div className={correct ? 'answer-feedback good' : 'answer-feedback'}><strong>{correct ? '정답이에요!' : '오답노트에 저장했어요'}</strong><p>{question.explanation}</p></div>}</div><div className="feed-quiz-bottom">{!submitted ? <button className="primary-button" disabled={selection === null} onClick={() => { if (selection !== null) { onAnswer(selection, correct); setSubmitted(true) } }}>답안 제출하기</button> : <button className="primary-button" onClick={onNext}>아래로 넘겨 계속하기 <ChevronDown /></button>}</div></section>
}

