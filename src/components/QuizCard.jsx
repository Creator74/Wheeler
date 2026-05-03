import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

export default function QuizCard({ question, questionIndex, total, onAnswer }) {
  const [selected, setSelected] = useState(null)

  const handleSelect = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    onAnswer(idx === question.correct, idx)
  }

  const optionStyle = (idx) => {
    if (selected === null) return { background: '#2a2a2a', border: '1px solid #444', color: 'var(--cream)' }
    if (idx === question.correct) return { background: 'rgba(45,198,83,0.15)', border: '1px solid var(--safe)', color: 'var(--cream)' }
    if (idx === selected) return { background: 'rgba(230,57,70,0.15)', border: '1px solid var(--danger)', color: 'var(--cream)' }
    return { background: '#2a2a2a', border: '1px solid #444', color: 'var(--cream)', opacity: 0.5 }
  }

  return (
    <div>
      <div className="text-xs mb-2" style={{ color: 'var(--orange)' }}>
        Question {questionIndex + 1} of {total}
      </div>
      <p className="text-base font-medium mb-4" style={{ color: 'var(--cream)' }}>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all"
            style={optionStyle(idx)}
          >
            <span className="font-bold mr-2" style={{ color: 'var(--orange)' }}>
              {String.fromCharCode(65 + idx)}.
            </span>
            {opt}
          </button>
        ))}
      </div>

      {selected !== null && (
        <div
          className="mt-4 p-3 rounded-lg flex gap-2 items-start text-sm"
          style={{
            background: selected === question.correct ? 'rgba(45,198,83,0.1)' : 'rgba(230,57,70,0.1)',
            border: `1px solid ${selected === question.correct ? 'var(--safe)' : 'var(--danger)'}`,
          }}
        >
          {selected === question.correct
            ? <CheckCircle size={16} style={{ color: 'var(--safe)', flexShrink: 0, marginTop: 2 }} />
            : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
          <p style={{ color: 'var(--cream)' }}>{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
