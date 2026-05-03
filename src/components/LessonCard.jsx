import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LessonCard({ lesson, completed, onComplete }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className="rounded-lg p-4 mb-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--orange)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-xl" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
            {lesson.title}
          </h3>
          <ul className="mt-1 space-y-1">
            {lesson.summary.map((point, i) => (
              <li key={i} className="text-sm flex items-start gap-1" style={{ color: 'var(--cream)', opacity: 0.75 }}>
                <span style={{ color: 'var(--orange)' }}>•</span> {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-end gap-2">
          {completed && <CheckCircle size={20} style={{ color: 'var(--safe)' }} />}
          <button onClick={() => setOpen(!open)} style={{ color: 'var(--orange)' }}>
            {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #333' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.85 }}>
            {lesson.content}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            {!completed && (
              <button
                onClick={() => onComplete(lesson.id)}
                className="px-4 py-2 rounded font-bold text-sm"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                Complete Lesson
              </button>
            )}
            {lesson.practiceRoute && (
              <button
                onClick={() => navigate('/routes', { state: lesson.practiceRoute })}
                className="px-4 py-2 rounded text-sm flex items-center gap-1 border"
                style={{ borderColor: 'var(--orange)', color: 'var(--orange)', background: 'transparent' }}
              >
                <MapPin size={14} /> Try this route
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
