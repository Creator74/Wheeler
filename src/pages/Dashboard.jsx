import { useNavigate } from 'react-router-dom'
import { Map, BookOpen, Mic, Pencil, ChevronRight, MapPin } from 'lucide-react'
import { getProfile } from '../hooks/useProfile'
import { getRideHistory, getWeeklyStats, getAllPlacesVisited } from '../hooks/useRideHistory'

const BADGES = [
  { id: 'la-bike-laws',           label: 'Law-Abiding Cyclist', symbol: '§'  },
  { id: 'hazard-recognition',     label: 'Street Smart',        symbol: '◉'  },
  { id: 'neighborhood-knowledge', label: 'Local Rider',         symbol: '◈'  },
  { id: 'night-riding',           label: 'Night Owl',           symbol: '◐'  },
  { id: 'emergency-situations',   label: 'Crisis Calm',         symbol: '◆'  },
]

const NAV_CARDS = [
  { icon: Map,     title: 'Plan a Ride',          subtitle: 'Map your route and preview every turn before you leave.',         path: '/routes', primary: false },
  { icon: BookOpen,title: 'Learn & Practice',     subtitle: 'Lessons, quizzes, and real LA scenario simulations.',            path: '/learn',  primary: false },
  { icon: Mic,     title: 'Start Voice Companion',subtitle: 'Live AI guide that talks you through your ride as it happens.',  path: '/ride',   primary: true  },
]

function WeeklyGraph({ dailyMiles }) {
  const max = Math.max(...dailyMiles.map(d => d.miles), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {dailyMiles.map(({ day, miles, isToday }, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="w-full flex flex-col justify-end" style={{ height: 48 }}>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: miles > 0 ? `${Math.max(4, (miles / max) * 48)}px` : 3,
                background: isToday ? 'var(--orange)' : miles > 0 ? 'rgba(244,100,10,0.45)' : '#1e1e1e',
              }}
            />
          </div>
          <p className="text-xs leading-none" style={{ color: isToday ? 'var(--orange)' : 'var(--cream)', opacity: isToday ? 1 : 0.3, fontSize: '0.6rem' }}>
            {day}
          </p>
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const profile = getProfile()
  const badges = JSON.parse(localStorage.getItem('bk_badges') || '[]')
  const completedLessons = JSON.parse(localStorage.getItem('bk_lessons') || '[]')
  const ps = profile?.parsedSummary
  const lessonPct = Math.round((completedLessons.length / 5) * 100)

  const rideHistory = getRideHistory()
  const { milesThisWeek, ridesThisWeek, confidenceThisWeek, placesThisWeek, dailyMiles } = getWeeklyStats()
  const allPlaces = getAllPlacesVisited()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-10 py-5" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)', letterSpacing: '0.06em' }}>
            WHEELER
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'var(--cream)', opacity: 0.3 }}>
            your sous-chef from the kitchen to the streets
          </p>
        </div>
        <button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: '#161616', border: '1px solid #2a2a2a', color: 'var(--cream)' }}
        >
          <Pencil size={13} /> Edit Profile
        </button>
      </header>

      <div className="flex gap-0 min-h-[calc(100vh-73px)]">

        {/* LEFT — profile + badges */}
        <aside className="flex flex-col gap-5 p-8 overflow-y-auto" style={{ width: 340, flexShrink: 0, borderRight: '1px solid #1e1e1e' }}>
          <div>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cream)', opacity: 0.3 }}>Your Profile</p>
            {ps ? (
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #222' }}>
                  <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--orange)' }}>Skill Level</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{ps.skill}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #222' }}>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--orange)' }}>Goals</p>
                  <div className="space-y-2">
                    {(ps.goals || []).map((goal, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--orange)' }} />
                        <p className="text-sm leading-snug" style={{ color: 'var(--cream)', opacity: 0.8 }}>{goal}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #222', borderLeft: '3px solid var(--orange)' }}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--orange)' }}>Ride Story</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.75 }}>{ps.vibe}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #222', borderLeft: '3px solid var(--orange)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.75 }}>
                  {profile?.summary || 'Complete onboarding to build your profile.'}
                </p>
              </div>
            )}
          </div>

          {/* Badges */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cream)', opacity: 0.3 }}>Confidence Badges</p>
            <div className="space-y-2">
              {BADGES.map(({ id, label, symbol }) => {
                const earned = badges.includes(id)
                return (
                  <div key={id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: earned ? 'rgba(244,100,10,0.08)' : '#111', border: `1px solid ${earned ? 'rgba(244,100,10,0.3)' : '#1e1e1e'}` }}>
                    <span className="text-lg w-8 text-center font-bold flex-shrink-0"
                      style={{ color: earned ? 'var(--orange)' : '#2a2a2a', fontFamily: 'monospace' }}>
                      {symbol}
                    </span>
                    <span className="text-sm font-medium" style={{ color: earned ? 'var(--cream)' : '#2a2a2a' }}>{label}</span>
                    {earned && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded"
                        style={{ background: 'rgba(244,100,10,0.15)', color: 'var(--orange)' }}>
                        Earned
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* All places visited */}
          {allPlaces.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cream)', opacity: 0.3 }}>
                Places Visited
              </p>
              <div className="space-y-1.5">
                {allPlaces.slice(0, 12).map((place, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                    <MapPin size={11} color="var(--orange)" className="flex-shrink-0" style={{ opacity: 0.6 }} />
                    <p className="text-sm truncate" style={{ color: 'var(--cream)', opacity: 0.7 }}>{place.name}</p>
                    <p className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--cream)', opacity: 0.25 }}>
                      {formatDate(place.date)}
                    </p>
                  </div>
                ))}
                {allPlaces.length > 12 && (
                  <p className="text-xs px-3 pt-1" style={{ color: 'var(--cream)', opacity: 0.25 }}>
                    +{allPlaces.length - 12} more
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT — main content */}
        <main className="flex-1 p-10 flex flex-col gap-8 overflow-y-auto">

          {/* Lesson progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--cream)', opacity: 0.3 }}>Lesson Progress</p>
              <p className="text-xs font-bold" style={{ color: 'var(--orange)' }}>{completedLessons.length} / 5 complete</p>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: '#1e1e1e' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${lessonPct}%`, background: 'var(--orange)' }} />
            </div>
          </div>

          {/* Nav cards */}
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {NAV_CARDS.map(({ icon: Icon, title, subtitle, path, primary }) => (
              <button key={path} onClick={() => navigate(path)}
                className="text-left rounded-2xl p-8 flex flex-col gap-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: primary ? 'rgba(244,100,10,0.08)' : '#161616', border: `1px solid ${primary ? 'rgba(244,100,10,0.4)' : '#222'}`, minHeight: 190 }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: primary ? 'var(--orange)' : '#222' }}>
                  <Icon size={28} color={primary ? '#fff' : 'var(--orange)'} />
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl mb-1 leading-tight" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)', letterSpacing: '0.04em' }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.5 }}>{subtitle}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--orange)' }}>
                  Open <ChevronRight size={15} />
                </div>
              </button>
            ))}
          </div>

          {/* This week stats + graph */}
          <div className="rounded-2xl p-6" style={{ background: '#161616', border: '1px solid #222' }}>
            <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--cream)', opacity: 0.3 }}>This Week</p>
            <div className="flex gap-6 items-end">
              {/* Graph */}
              <div className="flex-1">
                <WeeklyGraph dailyMiles={dailyMiles} />
                <p className="text-xs mt-2" style={{ color: 'var(--cream)', opacity: 0.2 }}>Miles per day</p>
              </div>
              {/* Stat pills */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                {[
                  { label: 'Miles ridden',     value: milesThisWeek || 0,          unit: 'mi' },
                  { label: 'Rides taken',       value: ridesThisWeek,               unit: '' },
                  { label: 'Places explored',   value: placesThisWeek,              unit: '' },
                  { label: 'Avg confidence',    value: confidenceThisWeek || '—',   unit: confidenceThisWeek ? '/5' : '' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2 rounded-xl"
                    style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', minWidth: 160 }}>
                    <p className="text-2xl font-bold leading-none" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)' }}>
                      {value}{unit}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.35 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Routes taken */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cream)', opacity: 0.3 }}>Routes Taken</p>
            {rideHistory.length === 0 ? (
              <div className="rounded-xl px-5 py-6 text-center" style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
                <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.3 }}>
                  Your completed rides will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rideHistory.slice(0, 8).map((ride) => (
                  <div key={ride.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
                    style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: ride.completed ? 'rgba(244,100,10,0.1)' : '#111', border: `1px solid ${ride.completed ? 'rgba(244,100,10,0.3)' : '#222'}` }}>
                      <Map size={14} color={ride.completed ? 'var(--orange)' : '#444'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--cream)' }}>
                        {ride.start} → {ride.end}
                      </p>
                      {ride.placesVisited?.length > 0 && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--cream)', opacity: 0.35 }}>
                          via {ride.placesVisited.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <p className="text-xs font-bold" style={{ color: 'var(--orange)' }}>
                        {ride.distanceMiles > 0 ? `${ride.distanceMiles} mi` : ride.distanceText || ''}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.25 }}>
                        {formatDate(ride.date)}
                      </p>
                    </div>
                  </div>
                ))}
                {rideHistory.length > 8 && (
                  <p className="text-xs px-2 pt-1" style={{ color: 'var(--cream)', opacity: 0.25 }}>
                    +{rideHistory.length - 8} older rides
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lifetime stats footer */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Miles',   value: `${rideHistory.reduce((s, r) => s + (r.distanceMiles || 0), 0).toFixed(1)}` },
              { label: 'Total Rides',   value: rideHistory.length },
              { label: 'Badges Earned', value: badges.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-5 py-4 text-center"
                style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
                <p className="text-4xl font-bold" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)' }}>{value}</p>
                <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: 'var(--cream)', opacity: 0.35 }}>{label}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
