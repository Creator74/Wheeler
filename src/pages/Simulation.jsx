import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, RefreshCw, Zap, Send, Lightbulb } from 'lucide-react'
import { SIMULATION_SCENARIOS } from '../data/simulationScenarios'
import { askClaude } from '../hooks/useClaude'
import { getProfile } from '../hooks/useProfile'

const PRELOADED = Object.keys(SIMULATION_SCENARIOS)

// Attach type to scenario based on position in the run
function annotateScenarios(scenarios) {
  return scenarios.map((s, i) => ({ ...s, answerType: i < 2 ? 'mcq' : 'typed' }))
}

function parseScenarios(raw) {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const arr = JSON.parse(cleaned)
    return arr.map((s, i) => ({
      id: i + 1,
      situation: s.situation,
      choices: s.choices || [],
      explanation: s.explanation || '',
      answerType: i < 2 ? 'mcq' : 'typed',
    }))
  } catch {
    return null
  }
}

// ── Generate scenarios from a topic prompt ──────────────────────────────────
async function generateScenarios(topic, profile, checkIn) {
  const checkInCtx = checkIn ? [
    checkIn.nervous ? `Most nervous about: ${checkIn.nervous}.` : '',
    checkIn.excited ? `Most excited about: ${checkIn.excited}.` : '',
    checkIn.confidence ? `Self-rated confidence: ${checkIn.confidence}/5.` : '',
  ].filter(Boolean).join(' ') : ''

  const raw = await askClaude(
    'You write realistic cycling safety scenarios for LA riders. Return only valid JSON, no markdown.',
    `Create 4 cycling scenarios for a rider doing: "${topic}".
Rider profile: comfort level ${profile?.comfortLevel ?? 1}/3, scared of: ${profile?.fears?.join(', ') ?? 'general traffic'}.
${checkInCtx ? `Pre-ride mindset: ${checkInCtx} — weight your scenarios toward their nervous areas.` : ''}

Return a JSON array of exactly 4 objects. First 2 must have choices (MCQ), last 2 must NOT have choices (typed answer).
If the rider mentioned something specific they're nervous about, make at least 2 scenarios directly address that situation.
Shape:
[
  {
    "situation": "specific 2-sentence scenario set in LA, mention real streets or landmarks",
    "choices": [
      {"label": "A", "text": "option text", "correct": false},
      {"label": "B", "text": "option text", "correct": true},
      {"label": "C", "text": "option text", "correct": false}
    ],
    "explanation": "one sentence: why the correct answer is right"
  },
  { same shape for scenario 2 },
  {
    "situation": "specific 2-sentence scenario, harder, requires real thinking",
    "choices": [],
    "explanation": "what a good answer should cover (used for evaluation)"
  },
  { same shape for scenario 4 }
]

Make scenarios specific to "${topic}" and the rider's fears. Use real LA street names.`
  )
  return parseScenarios(raw)
}

// ── Evaluate a typed answer ──────────────────────────────────────────────────
async function evaluateTypedAnswer(scenario, userAnswer, profile) {
  const raw = await askClaude(
    'You evaluate cycling safety answers like a supportive coach. Respond with valid JSON only. No em-dashes.',
    `Scenario: "${scenario.situation}"
What a good answer covers: "${scenario.explanation}"
Rider's answer: "${userAnswer}"

Return JSON: { "correct": true/false, "feedback": "one sentence. If correct, say what they got right. If incorrect or incomplete, start with something warm like 'That's ok,' or 'Good instinct, but' — then explain what the key safety step was, specific to this scenario. Keep it under 25 words. No em-dashes." }
Be generous: mark correct if they understand the core safety principle, even if wording differs.
If the answer is clearly a non-answer like 'i dont know' or 'idk', mark incorrect and start with 'That's ok,' then explain the key step.`
  )
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { correct: false, feedback: 'Could not evaluate. The key idea: ' + scenario.explanation }
  }
}

// ── Get next hint ───────────────────────────────────────────────────────────
async function getHint(scenario, hintsShownSoFar) {
  const raw = await askClaude(
    'You give short progressive cycling safety hints. One sentence max. No em-dashes. Sound like a friend, not a manual.',
    `Scenario: "${scenario.situation}"
The correct approach involves: "${scenario.explanation}"
Hints already given: ${hintsShownSoFar.length > 0 ? hintsShownSoFar.map((h, i) => `Hint ${i + 1}: "${h}"`).join(', ') : 'none yet'}

Give the next hint. Each hint should nudge a bit closer to the answer without giving it away.
Hint 1: point at what kind of situation this is.
Hint 2: mention one specific action to consider.
Hint 3: basically give the answer if they still need help.
Return only the hint sentence, nothing else.`
  )
  return raw.trim().replace(/^"|"$/g, '')
}

// ── Identify weakness after run ──────────────────────────────────────────────
async function identifyWeakness(scenarios, results) {
  const wrongOnes = scenarios.filter((_, i) => !results[i]?.correct)
  if (!wrongOnes.length) return { weakness: null, topic: null }
  const raw = await askClaude(
    'You identify cycling skill gaps in one short phrase. No em-dashes.',
    `A rider got these scenarios wrong:
${wrongOnes.map((s) => `- ${s.situation}`).join('\n')}

Return JSON: {
  "weakness": "one plain sentence under 15 words identifying the skill gap",
  "topic": "a short phrase to use as a follow-up drill topic, e.g. 'handling intersections in DTLA' or 'riding near parked cars in Silver Lake'"
}
Be specific. No em-dashes.`
  )
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { weakness: 'Review the scenarios you missed.', topic: wrongOnes[0]?.situation?.slice(0, 40) }
  }
}

// ────────────────────────────────────────────────────────────────────────────

export default function Simulation() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getProfile()
  const [mode, setMode] = useState('select') // select | loading | running | results
  const [topic, setTopic] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [scenarios, setScenarios] = useState([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState([]) // [{correct, feedback}]
  const [currentResult, setCurrentResult] = useState(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [weakness, setWeakness] = useState(null)
  const [weaknessTopic, setWeaknessTopic] = useState(null)
  const [loadingWeakness, setLoadingWeakness] = useState(false)
  const [hints, setHints] = useState([]) // hints for current scenario
  const [loadingHint, setLoadingHint] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (location.state?.autoTopic) {
      startGenerated(location.state.autoTopic)
    }
  }, [])

  const startPreloaded = async (neighborhood) => {
    const raw = SIMULATION_SCENARIOS[neighborhood]
    setTopic(neighborhood)
    setScenarios(annotateScenarios(raw))
    setIdx(0)
    setResults([])
    setCurrentResult(null)
    setMode('running')
  }

  const startGenerated = async (prompt) => {
    if (!prompt.trim()) return
    setTopic(prompt.trim())
    setMode('loading')
    const checkIn = JSON.parse(localStorage.getItem('bk_preridecheck') || 'null')
    try {
      const generated = await generateScenarios(prompt.trim(), profile, checkIn)
      if (!generated) throw new Error('parse failed')
      setScenarios(generated)
      setIdx(0)
      setResults([])
      setCurrentResult(null)
      setMode('running')
    } catch {
      setMode('select')
      alert('Could not generate scenarios. Try again.')
    }
  }

  const handleMCQChoice = async (choice) => {
    if (currentResult) return
    const result = { correct: choice.correct, feedback: scenarios[idx].explanation }
    setCurrentResult(result)
  }

  const handleTypedSubmit = async () => {
    if (!typedAnswer.trim() || evaluating) return
    setEvaluating(true)
    const result = await evaluateTypedAnswer(scenarios[idx], typedAnswer, profile)
    setCurrentResult(result)
    setEvaluating(false)
  }

  const handleNext = async () => {
    const allResults = [...results, currentResult]
    setResults(allResults)
    setCurrentResult(null)
    setTypedAnswer('')
    setHints([])

    if (idx + 1 >= scenarios.length) {
      // Done — identify weakness
      setMode('results')
      setLoadingWeakness(true)
      const { weakness: w, topic: t } = await identifyWeakness(scenarios, allResults)
      setWeakness(w)
      setWeaknessTopic(t)
      setLoadingWeakness(false)

      // Save badge if score >= 75%
      const score = allResults.filter((r) => r?.correct).length
      if (score / scenarios.length >= 0.75) {
        const badge = `sim-${topic.toLowerCase().replace(/\W+/g, '-').slice(0, 30)}`
        const existing = JSON.parse(localStorage.getItem('bk_badges') || '[]')
        localStorage.setItem('bk_badges', JSON.stringify([...new Set([...existing, badge])]))
      }
    } else {
      setIdx((i) => i + 1)
    }
  }

  const handleRedo = () => {
    setIdx(0)
    setResults([])
    setCurrentResult(null)
    setTypedAnswer('')
    setHints([])
    setWeakness(null)
    setWeaknessTopic(null)
    setMode('running')
  }

  const handleHint = async () => {
    if (loadingHint || currentResult) return
    setLoadingHint(true)
    const hint = await getHint(scenario, hints)
    setHints((h) => [...h, hint])
    setLoadingHint(false)
  }

  const handleWeaknessDrill = async () => {
    if (!weaknessTopic) return
    await startGenerated(weaknessTopic)
    setWeakness(null)
    setWeaknessTopic(null)
  }

  const score = results.filter((r) => r?.correct).length
  const scenario = scenarios[idx]

  // ── SELECT SCREEN ──────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="min-h-screen px-6 py-8" style={{ background: 'var(--bg)', maxWidth: 680, margin: '0 auto' }}>
        <button onClick={() => navigate('/learn')} className="flex items-center gap-1 mb-6 text-sm" style={{ color: 'var(--orange)' }}>
          <ChevronLeft size={16} /> Learn
        </button>
        <h1 className="text-5xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>SCENARIO SIMULATION</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--cream)', opacity: 0.45 }}>
          Practice real LA situations before you're in them.
        </p>

        {/* Custom generator */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#161616', border: '1px solid var(--orange)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--orange)' }}>Generate a Custom Simulation</p>
          <p className="text-sm mb-4" style={{ color: 'var(--cream)', opacity: 0.5 }}>
            Describe your actual ride. Claude will build scenarios around it.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g. "biking to Griffith Park from Silver Lake" or "riding around Venice at night"'
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startGenerated(customInput)}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: 'var(--cream)' }}
            />
            <button
              onClick={() => startGenerated(customInput)}
              disabled={!customInput.trim()}
              className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
              style={{ background: customInput.trim() ? 'var(--orange)' : '#1a1a1a', color: customInput.trim() ? '#fff' : '#444', border: `1px solid ${customInput.trim() ? 'var(--orange)' : '#2a2a2a'}` }}
            >
              <Zap size={15} /> Generate
            </button>
          </div>
        </div>

        {/* Pre-loaded */}
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cream)', opacity: 0.3 }}>
          Or pick a neighborhood
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {PRELOADED.map((n) => (
            <button
              key={n}
              onClick={() => startPreloaded(n)}
              className="text-left px-5 py-4 rounded-xl flex flex-col gap-1 transition-all hover:border-orange-500"
              style={{ background: '#161616', border: '1px solid #222' }}
            >
              <p className="font-bold text-base" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)', letterSpacing: '0.04em', fontSize: '1.15rem' }}>{n}</p>
              <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.4 }}>{SIMULATION_SCENARIOS[n].length} scenarios</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── LOADING SCREEN ─────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--orange)' }} />
        <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.5 }}>Building your simulation...</p>
        <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.3 }}>{topic}</p>
      </div>
    )
  }

  // ── RESULTS SCREEN ─────────────────────────────────────────────────────────
  if (mode === 'results') {
    const pct = Math.round((score / scenarios.length) * 100)
    return (
      <div className="min-h-screen px-6 py-8" style={{ background: 'var(--bg)', maxWidth: 620, margin: '0 auto' }}>
        <h1 className="text-5xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>RESULTS</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--cream)', opacity: 0.4 }}>{topic}</p>

        <div className="rounded-2xl p-6 mb-4 flex items-center gap-6" style={{ background: '#161616', border: '1px solid #222' }}>
          <div className="text-center" style={{ minWidth: 80 }}>
            <p className="text-6xl leading-none font-bold" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)' }}>{score}</p>
            <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: 'var(--cream)', opacity: 0.4 }}>of {scenarios.length}</p>
          </div>
          <div className="flex-1">
            <div className="w-full h-2 rounded-full mb-2" style={{ background: '#2a2a2a' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 75 ? 'var(--safe)' : pct >= 50 ? '#F5C518' : 'var(--danger)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.6 }}>
              {pct >= 75 ? 'Solid run.' : pct >= 50 ? 'Getting there.' : 'More practice needed.'}
            </p>
          </div>
        </div>

        {/* Per-scenario recap */}
        <div className="space-y-2 mb-5">
          {scenarios.map((s, i) => (
            <div key={i} className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#111', border: `1px solid ${results[i]?.correct ? 'rgba(45,198,83,0.2)' : 'rgba(230,57,70,0.2)'}` }}>
              {results[i]?.correct
                ? <CheckCircle size={16} style={{ color: 'var(--safe)', flexShrink: 0, marginTop: 2 }} />
                : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
              <div>
                <p className="text-xs leading-snug" style={{ color: 'var(--cream)', opacity: 0.7 }}>{s.situation.slice(0, 90)}...</p>
                {results[i]?.feedback && (
                  <p className="text-xs mt-1" style={{ color: results[i]?.correct ? 'var(--safe)' : 'var(--danger)' }}>
                    {results[i].feedback}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Weakness */}
        {loadingWeakness ? (
          <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: '#161616', border: '1px solid #222' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--orange)' }} />
            <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.5 }}>Identifying areas to work on...</p>
          </div>
        ) : weakness ? (
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(244,100,10,0.08)', border: '1px solid rgba(244,100,10,0.3)' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--orange)' }}>Practice this next</p>
            <p className="text-sm" style={{ color: 'var(--cream)' }}>{weakness}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={handleRedo}
            className="py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
            style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
          >
            <RefreshCw size={15} /> REDO THIS
          </button>
          {weaknessTopic ? (
            <button
              onClick={handleWeaknessDrill}
              className="py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
            >
              <Zap size={15} /> DRILL MY WEAKNESS
            </button>
          ) : (
            <button
              onClick={() => startGenerated(topic)}
              className="py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
            >
              <Zap size={15} /> NEW ON SAME TOPIC
            </button>
          )}
        </div>
        <button
          onClick={() => setMode('select')}
          className="w-full py-3 rounded-xl text-sm"
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: 'var(--cream)', opacity: 0.5 }}
        >
          Back to simulations
        </button>
      </div>
    )
  }

  // ── RUNNING SCREEN ─────────────────────────────────────────────────────────
  if (!scenario) return null
  const isTyped = scenario.answerType === 'typed'
  const isLast = idx + 1 >= scenarios.length
  const canProceed = currentResult && (!isTyped || !evaluating)

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: 'var(--bg)', maxWidth: 680, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setMode('select')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--orange)' }}>
          <ChevronLeft size={16} /> Exit
        </button>
        <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.4 }}>{topic}</p>
        <p className="text-xs font-bold" style={{ color: 'var(--orange)' }}>{idx + 1} / {scenarios.length}</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {scenarios.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full"
            style={{ background: i < idx ? 'rgba(244,100,10,0.4)' : i === idx ? 'var(--orange)' : '#2a2a2a' }} />
        ))}
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-full font-bold"
          style={{ background: isTyped ? 'rgba(244,100,10,0.12)' : '#1e1e1e', color: isTyped ? 'var(--orange)' : '#555', border: `1px solid ${isTyped ? 'rgba(244,100,10,0.3)' : '#2a2a2a'}` }}
        >
          {isTyped ? 'Open answer' : 'Multiple choice'}
        </span>
        {isTyped && (
          <span className="text-xs" style={{ color: 'var(--cream)', opacity: 0.35 }}>
            Type what you would actually do
          </span>
        )}
      </div>

      {/* Situation */}
      <div className="rounded-2xl p-6 mb-5" style={{ background: '#161616', border: '1px solid #222' }}>
        <p className="text-base leading-relaxed" style={{ color: 'var(--cream)', lineHeight: 1.7 }}>
          {scenario.situation}
        </p>
      </div>

      {/* Hints */}
      {!currentResult && (
        <div className="mb-4">
          {hints.length > 0 && (
            <div className="space-y-2 mb-2">
              {hints.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(244,100,10,0.06)', border: '1px solid rgba(244,100,10,0.2)' }}>
                  <Lightbulb size={14} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.8 }}>{h}</p>
                </div>
              ))}
            </div>
          )}
          {hints.length < 3 && (
            <button
              onClick={handleHint}
              disabled={loadingHint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ background: 'transparent', border: '1px solid #2a2a2a', color: loadingHint ? '#555' : 'var(--cream)', opacity: loadingHint ? 0.5 : 0.6 }}
            >
              {loadingHint
                ? <><Loader2 size={13} className="animate-spin" /> Getting hint...</>
                : <><Lightbulb size={13} /> {hints.length === 0 ? 'Need a hint?' : 'Another hint'}</>}
            </button>
          )}
        </div>
      )}

      {/* MCQ */}
      {!isTyped && (
        <div className="space-y-2 mb-4">
          {scenario.choices.map((choice) => {
            let border = '#2a2a2a'
            let bg = '#161616'
            let textColor = 'var(--cream)'
            if (currentResult) {
              if (choice.correct) { border = 'var(--safe)'; bg = 'rgba(45,198,83,0.08)' }
              else if (!choice.correct && currentResult && scenario.choices.find(c => c.correct)?.label !== choice.label) {
                border = '#2a2a2a'; textColor = 'rgba(245,240,232,0.35)'
              }
            }
            return (
              <button
                key={choice.label}
                onClick={() => handleMCQChoice(choice)}
                disabled={!!currentResult}
                className="w-full text-left px-5 py-4 rounded-xl flex items-start gap-3 transition-all"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
              >
                <span className="font-bold text-sm flex-shrink-0" style={{ color: 'var(--orange)' }}>{choice.label}.</span>
                <span className="text-sm">{choice.text}</span>
                {currentResult && choice.correct && <CheckCircle size={16} style={{ color: 'var(--safe)', flexShrink: 0, marginLeft: 'auto', marginTop: 2 }} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Typed */}
      {isTyped && !currentResult && (
        <div className="mb-4">
          <textarea
            ref={textareaRef}
            rows={4}
            placeholder="Describe what you would do. Be specific about what you check, how you move, in what order."
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)', lineHeight: 1.6 }}
          />
          <button
            onClick={handleTypedSubmit}
            disabled={!typedAnswer.trim() || evaluating}
            className="mt-2 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{
              background: typedAnswer.trim() && !evaluating ? 'var(--orange)' : '#1a1a1a',
              color: typedAnswer.trim() && !evaluating ? '#fff' : '#444',
              border: `1px solid ${typedAnswer.trim() && !evaluating ? 'var(--orange)' : '#2a2a2a'}`,
              fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em'
            }}
          >
            {evaluating ? <><Loader2 size={16} className="animate-spin" /> Evaluating...</> : <><Send size={15} /> Submit Answer</>}
          </button>
        </div>
      )}

      {/* Typed — show what they wrote after submit */}
      {isTyped && currentResult && typedAnswer && (
        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#111', border: '1px solid #222' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--cream)', opacity: 0.3 }}>Your answer</p>
          <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.7 }}>{typedAnswer}</p>
        </div>
      )}

      {/* Feedback */}
      {currentResult && (
        <div
          className="rounded-xl p-4 mb-4 flex gap-3 items-start"
          style={{
            background: currentResult.correct ? 'rgba(45,198,83,0.07)' : 'rgba(230,57,70,0.07)',
            border: `1px solid ${currentResult.correct ? 'rgba(45,198,83,0.3)' : 'rgba(230,57,70,0.3)'}`,
          }}
        >
          {currentResult.correct
            ? <CheckCircle size={16} style={{ color: 'var(--safe)', flexShrink: 0, marginTop: 2 }} />
            : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
          <p className="text-sm" style={{ color: 'var(--cream)' }}>{currentResult.feedback}</p>
        </div>
      )}

      {canProceed && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em' }}
        >
          {isLast ? 'SEE RESULTS' : 'NEXT SCENARIO'} <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
