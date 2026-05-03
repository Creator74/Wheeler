import { Clock, Navigation, AlertTriangle, Eye } from 'lucide-react'
import { CORRIDOR_DIFFICULTY } from '../data/routeConfig'

function getDifficulty(routeSummary) {
  for (const [key, val] of Object.entries(CORRIDOR_DIFFICULTY)) {
    if (routeSummary && routeSummary.includes(key)) return val
  }
  return { difficulty: 'intermediate', note: 'Mixed terrain. Moderate traffic expected on this route.' }
}

const difficultyColors = {
  beginner: { color: 'var(--safe)', label: 'Beginner Friendly' },
  intermediate: { color: '#F5C518', label: 'Intermediate' },
  confident: { color: 'var(--danger)', label: 'Confident Rider' },
}

export default function RouteCard({ route, index, selected, onSelect, onPreview }) {
  const legs = route.legs
  const summary = route.summary || ''
  const { difficulty, note } = getDifficulty(summary)
  const dc = difficultyColors[difficulty]

  const totalM = legs.reduce((s, l) => s + l.distance.value, 0)
  const totalSec = legs.reduce((s, l) => s + l.duration.value, 0)
  const totalDist = totalM < 1609 ? `${Math.round(totalM)}m` : `${(totalM / 1609).toFixed(1)} mi`
  const totalDur = totalSec < 3600
    ? `${Math.round(totalSec / 60)} min`
    : `${Math.floor(totalSec / 3600)}h ${Math.round((totalSec % 3600) / 60)}m`

  return (
    <div
      className="rounded-lg p-4 mb-3 cursor-pointer transition-all"
      style={{ background: 'var(--surface)', border: `1px solid ${selected ? 'var(--orange)' : '#333'}` }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>
          Route {index + 1}
          {summary ? <span className="text-sm font-normal ml-2" style={{ fontFamily: 'DM Sans', opacity: 0.6 }}>via {summary}</span> : null}
        </h3>
        <span className="text-xs font-bold px-2 py-1 rounded"
          style={{ background: dc.color + '22', color: dc.color, border: `1px solid ${dc.color}` }}>
          {dc.label}
        </span>
      </div>

      {/* Total distance + time */}
      <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--cream)', opacity: 0.8 }}>
        <span className="flex items-center gap-1"><Navigation size={13} /> {totalDist}</span>
        <span className="flex items-center gap-1"><Clock size={13} /> {totalDur}</span>
      </div>

      {/* Per-leg breakdown (only when stops present) */}
      {legs.length > 1 && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
          {legs.map((leg, i) => {
            const from = leg.start_address?.split(',')[0] || 'Start'
            const to = leg.end_address?.split(',')[0] || 'Destination'
            return (
              <div key={i} className="flex items-center justify-between py-1">
                <p className="text-xs truncate mr-3" style={{ color: 'var(--cream)', opacity: 0.6 }}>
                  <span style={{ color: 'var(--orange)' }}>{from}</span> → {to}
                </p>
                <p className="text-xs flex-shrink-0" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                  {leg.distance.text} · {leg.duration.text}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-2 flex items-start gap-1 text-xs" style={{ color: 'var(--cream)', opacity: 0.65 }}>
        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{note}</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onPreview() }}
        className="mt-3 w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: selected ? 'var(--orange)' : 'transparent', color: selected ? '#fff' : 'var(--orange)', border: `1px solid var(--orange)` }}
      >
        <Eye size={14} /> Preview This Ride
      </button>
    </div>
  )
}
