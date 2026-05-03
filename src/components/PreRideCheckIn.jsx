import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

const CONFIDENCE_OPTIONS = [
  { value: 1, emoji: '😰', label: "Not confident at all" },
  { value: 2, emoji: '😟', label: "A bit nervous" },
  { value: 3, emoji: '😐', label: "Somewhat ready" },
  { value: 4, emoji: '😊', label: "Pretty confident" },
  { value: 5, emoji: '💪', label: "Very confident" },
]

export default function PreRideCheckIn({ routeLabel, mode, onComplete, onSkip }) {
  const [step, setStep] = useState(0)
  const [confidence, setConfidence] = useState(null)
  const [nervous, setNervous] = useState('')
  const [excited, setExcited] = useState('')

  const finish = () => {
    const answers = {
      confidence,
      nervous: nervous.trim(),
      excited: excited.trim(),
    }
    localStorage.setItem('bk_preridecheck', JSON.stringify(answers))
    onComplete(answers)
  }

  const ctaLabel = mode === 'ride' ? "START RIDING" : "BUILD MY SIMULATION"

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Progress */}
      <div className="flex gap-1.5 px-5 pt-8 pb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full"
            style={{ background: i <= step ? 'var(--orange)' : '#2a2a2a' }} />
        ))}
      </div>

      <button onClick={onSkip} className="absolute top-7 right-5 text-sm" style={{ color: '#555' }}>
        Skip
      </button>

      <div className="flex-1 px-5 overflow-y-auto">
        {routeLabel && (
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--orange)', opacity: 0.7 }}>
            {routeLabel}
          </p>
        )}

        {/* Step 0 — Confidence */}
        {step === 0 && (
          <>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
              HOW CONFIDENT DO YOU FEEL?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--cream)', opacity: 0.45 }}>
              About this specific route, right now.
            </p>
            <div className="space-y-2">
              {CONFIDENCE_OPTIONS.map((opt) => (
                <button key={opt.value}
                  onClick={() => { setConfidence(opt.value); setTimeout(() => setStep(1), 250) }}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all"
                  style={{
                    background: confidence === opt.value ? 'rgba(244,100,10,0.1)' : '#161616',
                    border: `1px solid ${confidence === opt.value ? 'var(--orange)' : '#2a2a2a'}`,
                  }}>
                  <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1 — Nervous about */}
        {step === 1 && (
          <>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
              WHAT MAKES YOU MOST NERVOUS?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>
              A street, an intersection, traffic? Be specific — it helps us prepare you.
            </p>
            <textarea rows={4}
              placeholder='e.g. "the stretch on Sunset with no bike lane" or "merging at the on-ramp near the 101"'
              value={nervous}
              onChange={(e) => setNervous(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
              style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)', lineHeight: 1.6 }}
              autoFocus
            />
            <button onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              Next <ChevronRight size={16} />
            </button>
            <button onClick={() => { setNervous(''); setStep(2) }}
              className="mt-2 w-full py-2 text-sm" style={{ color: '#555' }}>
              Skip this question
            </button>
          </>
        )}

        {/* Step 2 — Excited about */}
        {step === 2 && (
          <>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
              WHAT ARE YOU MOST EXCITED ABOUT?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>
              A view, a neighborhood, a challenge you want to own?
            </p>
            <textarea rows={4}
              placeholder='e.g. "the ocean view on PCH" or "finally riding through Silver Lake"'
              value={excited}
              onChange={(e) => setExcited(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
              style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)', lineHeight: 1.6 }}
              autoFocus
            />
            <button onClick={finish}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              {ctaLabel} <ChevronRight size={16} />
            </button>
            <button onClick={finish}
              className="mt-2 w-full py-2 text-sm" style={{ color: '#555' }}>
              Skip this question
            </button>
          </>
        )}
      </div>
    </div>
  )
}
