import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Trees, Route, Building2, ChevronRight, ChevronLeft, Loader2, Plus, X } from 'lucide-react'
import { saveProfile, getProfile } from '../hooks/useProfile'
import { askClaude } from '../hooks/useClaude'

const AREAS = [
  'Silver Lake', 'Echo Park', 'Downtown LA', 'Hollywood', 'Koreatown',
  'Culver City', 'Santa Monica', 'Venice', 'Long Beach', 'Pasadena',
  'The Valley (Burbank/NoHo)', 'Mostly trails/parks', 'Other cities outside LA',
]

const FEAR_OPTIONS = [
  'Fast cars', 'No bike lanes', 'Getting doored', 'Hills',
  'Intersections and turns', 'Getting lost', 'Night riding',
]

const GOAL_OPTIONS = [
  'Commute to work by bike', 'Get comfortable in traffic', 'Learn LA bike routes',
  'Ride to Griffith Park', 'Stop being scared of cars', 'Ride at night safely',
  'Do longer rides', 'Ride with friends',
]

const comfortOptions = [
  { level: 0, label: 'Never ridden', sub: 'Complete beginner', icon: <Bike size={22} /> },
  { level: 1, label: 'Ridden casually', sub: 'Parks and paths only', icon: <Trees size={22} /> },
  { level: 2, label: 'Some street riding', sub: 'A few road miles', icon: <Route size={22} /> },
  { level: 3, label: 'Regular urban cyclist', sub: 'Comfortable in traffic', icon: <Building2 size={22} /> },
]

const verbosityLabels = [
  { label: 'Minimal', sub: 'Safety alerts only' },
  { label: 'Balanced', sub: 'Tips when helpful' },
  { label: 'Full guidance', sub: 'Talk me through everything' },
]

const TOTAL_SCREENS = 6

function parseProfile(raw) {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { skill: 'New to street riding', goals: ['Get comfortable in traffic', 'Learn local routes', 'Build confidence on LA streets'], vibe: raw }
  }
}

function TagInput({ options, selected, onToggle, onAdd, accentColor = 'var(--orange)', placeholder = 'Add your own...' }) {
  const [text, setText] = useState('')

  const handleAdd = () => {
    const trimmed = text.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onAdd(trimmed)
    }
    setText('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((item) => {
          const active = selected.includes(item)
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? (accentColor === 'var(--danger)' ? 'rgba(230,57,70,0.15)' : 'rgba(244,100,10,0.15)') : '#161616',
                border: `1px solid ${active ? accentColor : '#2a2a2a'}`,
                color: active ? (accentColor === 'var(--danger)' ? '#f87171' : 'var(--orange)') : 'var(--cream)',
              }}
            >
              {item}
            </button>
          )
        })}
        {selected.filter((s) => !options.includes(s)).map((custom) => (
          <button
            key={custom}
            onClick={() => onToggle(custom)}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all"
            style={{
              background: accentColor === 'var(--danger)' ? 'rgba(230,57,70,0.15)' : 'rgba(244,100,10,0.15)',
              border: `1px solid ${accentColor}`,
              color: accentColor === 'var(--danger)' ? '#f87171' : 'var(--orange)',
            }}
          >
            {custom}
            <X size={12} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)' }}
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim()}
          className="px-3 py-2.5 rounded-lg flex items-center gap-1 text-sm font-medium"
          style={{
            background: text.trim() ? accentColor : '#1a1a1a',
            color: text.trim() ? '#fff' : '#444',
            border: `1px solid ${text.trim() ? accentColor : '#2a2a2a'}`,
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const existing = getProfile()
  const [screen, setScreen] = useState(0)
  const [profile, setProfile] = useState({
    comfortLevel: existing?.comfortLevel ?? null,
    riderAreas: existing?.riderAreas ?? [],
    otherCities: existing?.otherCities ?? '',
    fears: existing?.fears ?? [],
    goals: existing?.goals ?? [],
    verbosity: existing?.verbosity ?? 1,
  })
  const [parsedSummary, setParsedSummary] = useState(existing?.parsedSummary ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!existing
  const hasOtherCities = profile.riderAreas.includes('Other cities outside LA')

  const toggleItem = (field, value) => {
    setProfile((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value],
    }))
  }

  const addCustom = (field, value) => {
    setProfile((p) => ({ ...p, [field]: [...p[field], value] }))
  }

  const canAdvance = () => {
    if (screen === 0) return profile.comfortLevel !== null
    if (screen === 1) return profile.riderAreas.length > 0
    if (screen === 2) return profile.fears.length > 0
    if (screen === 3) return profile.goals.length > 0
    return true
  }

  const handleNext = async () => {
    if (screen === 4) {
      setScreen(5)
      setLoading(true)
      setError('')
      try {
        const otherNote = hasOtherCities && profile.otherCities
          ? `. They have also ridden in ${profile.otherCities} but that does NOT change their skill level.`
          : ''
        const comfortLabel = ['never ridden before', 'ridden casually on paths and parks', 'done some street riding', 'a regular urban cyclist'][profile.comfortLevel]
        const raw = await askClaude(
          'You write short rider profiles for Wheeler, an LA cycling companion app. Sound like a person talking to a friend. No em-dashes. No filler. No corporate words. Respond with valid JSON only, no markdown, no extra text.',
          `Write a profile for this rider. Return ONLY valid JSON:
{
  "skill": "one short plain phrase based ONLY on their self-reported comfort level. Ignore where they've ridden.",
  "goals": ["take each goal they listed and rewrite it as a short actionable phrase, under 8 words, starting with a verb"],
  "vibe": "2 sentences. Use their actual comfort level (${comfortLabel}) as your anchor. Mention 1-2 of their specific LA neighborhoods or fears by name. Be real and direct. No em-dashes."
}

Their answers:
- Self-reported skill: ${comfortLabel} (comfort level ${profile.comfortLevel}/3). THIS IS THE TRUTH. Use it.
- LA areas: ${profile.riderAreas.join(', ')}${otherNote}
- Scared of: ${profile.fears.join(', ')}
- Goals: ${profile.goals.join(', ')}
- Guidance level wanted: ${profile.verbosity}/2`
        )
        setParsedSummary(parseProfile(raw))
      } catch (e) {
        setError('Could not reach Claude. Check your API key.')
        setParsedSummary({
          skill: comfortOptions[profile.comfortLevel]?.sub || 'New rider',
          goals: profile.goals.length ? profile.goals : ['Get comfortable in LA traffic'],
          vibe: "You've got a bike and you're showing up. That's the hardest part. Let's get you riding.",
        })
      } finally {
        setLoading(false)
      }
      return
    }
    setScreen((s) => s + 1)
  }

  const handleFinish = () => {
    saveProfile({ ...profile, parsedSummary, summary: parsedSummary?.vibe || '', completedAt: new Date().toISOString() })
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col mobile-page" style={{ background: 'var(--bg)' }}>
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-3xl" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)' }}>WHEELER</h1>
        <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--cream)', opacity: 0.4 }}>
          {isEditing ? 'Edit Your Profile' : 'your sous-chef from the kitchen to the streets'}
        </p>
      </div>

      <div className="px-5 mb-6">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full transition-all"
              style={{ background: i <= screen ? 'var(--orange)' : '#2a2a2a', opacity: i < screen ? 0.4 : 1 }} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">

        {screen === 0 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>HOW COMFORTABLE ARE YOU ON A BIKE?</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>Be honest. This is what shapes your whole profile.</p>
            <div className="space-y-2">
              {comfortOptions.map(({ level, label, sub, icon }) => (
                <button key={level} onClick={() => setProfile((p) => ({ ...p, comfortLevel: level }))}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all"
                  style={{ background: profile.comfortLevel === level ? 'rgba(244,100,10,0.12)' : '#161616', border: `1px solid ${profile.comfortLevel === level ? 'var(--orange)' : '#2a2a2a'}` }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: profile.comfortLevel === level ? 'var(--orange)' : '#222', color: profile.comfortLevel === level ? '#fff' : '#666' }}>
                    {icon}
                  </span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.45 }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 1 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>WHERE HAVE YOU RIDDEN?</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>Select all that apply.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {AREAS.map((area) => (
                <button key={area} onClick={() => toggleItem('riderAreas', area)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: profile.riderAreas.includes(area) ? 'var(--orange)' : '#161616', border: `1px solid ${profile.riderAreas.includes(area) ? 'var(--orange)' : '#2a2a2a'}`, color: profile.riderAreas.includes(area) ? '#fff' : 'var(--cream)' }}>
                  {area}
                </button>
              ))}
            </div>
            {hasOtherCities && (
              <div className="mt-2">
                <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: 'var(--orange)' }}>Which cities or countries?</label>
                <input type="text" placeholder="e.g. New York, Amsterdam, Tokyo..."
                  value={profile.otherCities}
                  onChange={(e) => setProfile((p) => ({ ...p, otherCities: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#161616', border: '1px solid var(--orange)', color: 'var(--cream)' }}
                  autoFocus />
              </div>
            )}
          </div>
        )}

        {screen === 2 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>WHAT SCARES YOU MOST?</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>Pick from the list or add your own.</p>
            <TagInput
              options={FEAR_OPTIONS}
              selected={profile.fears}
              onToggle={(v) => toggleItem('fears', v)}
              onAdd={(v) => addCustom('fears', v)}
              accentColor="var(--danger)"
              placeholder="Something else on your mind..."
            />
          </div>
        )}

        {screen === 3 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>WHAT DO YOU WANT TO DO?</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>Pick goals or write your own.</p>
            <TagInput
              options={GOAL_OPTIONS}
              selected={profile.goals}
              onToggle={(v) => toggleItem('goals', v)}
              onAdd={(v) => addCustom('goals', v)}
              accentColor="var(--orange)"
              placeholder="Your own goal..."
            />
          </div>
        )}

        {screen === 4 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>HOW MUCH SHOULD YOUR COMPANION TALK?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--cream)', opacity: 0.45 }}>You can change this anytime during a ride.</p>
            <div className="space-y-3">
              {verbosityLabels.map(({ label, sub }, i) => (
                <button key={i} onClick={() => setProfile((p) => ({ ...p, verbosity: i }))}
                  className="w-full text-left px-4 py-4 rounded-xl transition-all"
                  style={{ background: profile.verbosity === i ? 'rgba(244,100,10,0.12)' : '#161616', border: `1px solid ${profile.verbosity === i ? 'var(--orange)' : '#2a2a2a'}` }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cream)', opacity: 0.45 }}>{sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 5 && (
          <div>
            <h2 className="text-4xl mb-1" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>YOUR RIDER PROFILE</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--cream)', opacity: 0.45 }}>Built from your answers.</p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--orange)' }} />
                <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.5 }}>Building your profile...</p>
              </div>
            ) : parsedSummary ? (
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--orange)' }}>Skill Level</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{parsedSummary.skill}</p>
                </div>

                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--orange)' }}>Goals</p>
                  <div className="space-y-2">
                    {(parsedSummary.goals || []).map((goal, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--orange)' }} />
                        <p className="text-sm leading-snug" style={{ color: 'var(--cream)', opacity: 0.85 }}>{goal}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #2a2a2a', borderLeft: '3px solid var(--orange)' }}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--orange)' }}>Your Ride Story</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.85 }}>{parsedSummary.vibe}</p>
                </div>

                {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

                <button onClick={handleFinish}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mt-2"
                  style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', letterSpacing: '0.06em' }}>
                  {isEditing ? 'SAVE CHANGES' : "LET'S RIDE"} <ChevronRight size={20} />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {screen < 5 && (
        <div className="px-5 pb-8 flex gap-3">
          {screen > 0 ? (
            <button onClick={() => setScreen((s) => s - 1)}
              className="px-5 py-3 rounded-xl border font-bold flex items-center gap-1 text-sm"
              style={{ borderColor: '#2a2a2a', color: 'var(--cream)', background: 'transparent' }}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : isEditing ? (
            <button onClick={() => navigate('/dashboard')}
              className="px-5 py-3 rounded-xl border font-bold flex items-center gap-1 text-sm"
              style={{ borderColor: '#2a2a2a', color: 'var(--cream)', background: 'transparent' }}>
              <ChevronLeft size={16} /> Cancel
            </button>
          ) : null}
          <button onClick={handleNext} disabled={!canAdvance()}
            className="flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            style={{
              background: canAdvance() ? 'var(--orange)' : '#1a1a1a',
              color: canAdvance() ? '#fff' : '#444',
              fontFamily: 'Bebas Neue',
              letterSpacing: '0.06em',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
              border: `1px solid ${canAdvance() ? 'var(--orange)' : '#2a2a2a'}`,
            }}>
            {screen === 4 ? 'BUILD MY PROFILE' : 'NEXT'} <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
