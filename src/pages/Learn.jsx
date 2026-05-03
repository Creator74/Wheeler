import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Award, ChevronRight } from 'lucide-react'
import LessonCard from '../components/LessonCard'
import QuizCard from '../components/QuizCard'
import { LESSONS } from '../data/lessons'
import { QUIZZES } from '../data/quizzes'

export default function Learn() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('lessons')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const completedLessons = JSON.parse(localStorage.getItem('bk_lessons') || '[]')
  const earnedBadges = JSON.parse(localStorage.getItem('bk_badges') || '[]')

  const completeLesson = (id) => {
    const updated = [...new Set([...completedLessons, id])]
    localStorage.setItem('bk_lessons', JSON.stringify(updated))
    // force re-render
    window.dispatchEvent(new Event('storage'))
  }

  const [answered, setAnswered] = useState(false)
  const [pendingScore, setPendingScore] = useState(0)

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz)
    setQuizIdx(0)
    setScore(0)
    setPendingScore(0)
    setDone(false)
    setAnswered(false)
  }

  const handleAnswer = (correct) => {
    const newScore = correct ? pendingScore + 1 : pendingScore
    setPendingScore(newScore)
    setAnswered(true)
  }

  const handleNext = () => {
    const totalQ = activeQuiz.questions.length
    if (quizIdx + 1 >= totalQ) {
      setScore(pendingScore)
      setDone(true)
      if ((pendingScore / totalQ) * 100 >= 60) {
        const updated = [...new Set([...earnedBadges, activeQuiz.id])]
        localStorage.setItem('bk_badges', JSON.stringify(updated))
      }
    } else {
      setQuizIdx((i) => i + 1)
      setAnswered(false)
    }
  }

  if (activeQuiz) {
    const totalQ = activeQuiz.questions.length
    const finalScore = done ? score : null

    return (
      <div className="min-h-screen px-5 py-8" style={{ background: 'var(--bg)' }}>
        <button onClick={() => setActiveQuiz(null)} className="flex items-center gap-1 mb-4 text-sm" style={{ color: 'var(--orange)' }}>
          <ChevronLeft size={16} /> Quizzes
        </button>
        <h1 className="text-3xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>{activeQuiz.title}</h1>

        {done ? (
          <div className="mt-6 text-center">
            <div className="text-6xl mb-4">{score / totalQ >= 0.6 ? '🏆' : '💪'}</div>
            <p className="text-2xl" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)' }}>
              {score} / {totalQ} CORRECT
            </p>
            {score / totalQ >= 0.6 && (
              <div className="mt-3 p-4 rounded-lg" style={{ background: 'rgba(244,100,10,0.1)', border: '1px solid var(--orange)' }}>
                <p className="font-bold" style={{ color: 'var(--cream)' }}>
                  Badge earned: <span style={{ color: 'var(--orange)' }}>{activeQuiz.badge}</span>
                </p>
              </div>
            )}
            <button
              onClick={() => setActiveQuiz(null)}
              className="mt-5 w-full py-3 rounded-lg font-bold"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}
            >
              BACK TO QUIZZES
            </button>
          </div>
        ) : (
          <>
            <div
              className="mt-4 rounded-lg p-5"
              style={{ background: 'var(--surface)', border: '1px solid #333' }}
            >
              <QuizCard
                key={quizIdx}
                question={activeQuiz.questions[quizIdx]}
                questionIndex={quizIdx}
                total={totalQ}
                onAnswer={handleAnswer}
              />
            </div>
            {answered && (
              <button
                onClick={handleNext}
                className="mt-3 w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em' }}
              >
                {quizIdx + 1 >= totalQ ? 'SEE RESULTS' : 'NEXT QUESTION'} <ChevronRight size={18} />
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: 'var(--bg)' }}>
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 mb-4 text-sm" style={{ color: 'var(--orange)' }}>
        <ChevronLeft size={16} /> Dashboard
      </button>
      <h1 className="text-4xl mb-4" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>LEARN & PRACTICE</h1>

      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
        {['lessons', 'quizzes', 'simulate'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-md text-sm font-bold capitalize transition-all"
            style={{
              background: tab === t ? 'var(--orange)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--cream)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'lessons' && (
        <div>
          {LESSONS.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              completed={completedLessons.includes(lesson.id)}
              onComplete={completeLesson}
            />
          ))}
        </div>
      )}

      {tab === 'quizzes' && (
        <div className="space-y-3">
          {QUIZZES.map((quiz) => {
            const earned = earnedBadges.includes(quiz.id)
            return (
              <div
                key={quiz.id}
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ background: 'var(--surface)', border: `1px solid ${earned ? 'var(--orange)' : '#333'}` }}
              >
                <div>
                  <h3 className="text-xl" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>{quiz.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.5 }}>
                    {quiz.questions.length} questions · Badge: {quiz.badge}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {earned && <Award size={18} style={{ color: 'var(--orange)' }} />}
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="px-4 py-2 rounded font-bold text-sm flex items-center gap-1"
                    style={{ background: 'var(--orange)', color: '#fff' }}
                  >
                    {earned ? 'Retry' : 'Start'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'simulate' && (
        <div
          className="rounded-lg p-5 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--orange)' }}
        >
          <p className="text-4xl mb-3">🚲</p>
          <h3 className="text-2xl mb-2" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
            SCENARIO SIMULATION
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--cream)', opacity: 0.7 }}>
            Practice real LA riding scenarios. Pick a neighborhood and make the right calls.
          </p>
          <button
            onClick={() => navigate('/learn/simulation')}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}
          >
            START SIMULATION <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
