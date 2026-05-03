import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Loader2, Zap, Mic, Plus, X, MapPin, Star } from 'lucide-react'
import { searchAlongRoute, distanceMins } from '../utils/places'
import Map from '../components/Map'
import RouteCard from '../components/RouteCard'
import StreetViewPreview from '../components/StreetViewPreview'
import RouteMapModal from '../components/RouteMapModal'
import PreRideCheckIn from '../components/PreRideCheckIn'

function StopInput({ value, onChange, onRemove }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !window.google) return
    const bias = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(33.7, -118.7),
      new window.google.maps.LatLng(34.4, -117.9)
    )
    const ac = new window.google.maps.places.Autocomplete(ref.current, { bounds: bias, fields: ['formatted_address'] })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      onChange(place.formatted_address || ref.current.value)
    })
  }, [])
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-4">
        <div style={{ width: 2, height: 6, background: '#555', borderRadius: 1 }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', border: '2px solid #555' }} />
        <div style={{ width: 2, height: 6, background: '#555', borderRadius: 1 }} />
      </div>
      <input ref={ref} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Add a stop..."
        className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
        style={{ background: 'var(--surface)', border: '1px solid #444', color: 'var(--cream)' }} />
      <button onClick={onRemove} className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: '#222', color: '#888' }}>
        <X size={14} />
      </button>
    </div>
  )
}

export default function Routes() {
  const navigate = useNavigate()
  const location = useLocation()
  const startRef = useRef(null)
  const endRef = useRef(null)
  const [start, setStart] = useState(location.state?.start || '')
  const [end, setEnd] = useState(location.state?.end || '')
  const [routes, setRoutes] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewRoute, setPreviewRoute] = useState(null)
  const [mapRoute, setMapRoute] = useState(null)
  const [stops, setStops] = useState([])
  const [checkInMode, setCheckInMode] = useState(null)
  const [showSuggester, setShowSuggester] = useState(false)
  const [suggestQuery, setSuggestQuery] = useState('')
  const [suggestResults, setSuggestResults] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const mapRef = useRef(null)

  const PRESET_STOPS = [
    { label: '☕ Coffee', query: 'coffee cafe' },
    { label: '🍔 Food', query: 'restaurant food takeout' },
    { label: '💧 Water', query: 'water fountain convenience store' },
    { label: '🚻 Restroom', query: 'public restroom park' },
    { label: '🌳 Rest spot', query: 'park bench rest area' },
    { label: '🏪 Snacks', query: 'convenience store snacks' },
  ]

  const getSelectedRoute = () => {
    if (selectedIdx !== null && routes[selectedIdx]) return routes[selectedIdx]
    return routes[0] || null
  }

  const handleSuggest = async (query) => {
    const q = query || suggestQuery
    if (!q.trim()) return
    setSuggestLoading(true)
    setSuggestResults([])
    const results = await searchAlongRoute(q, getSelectedRoute())
    setSuggestResults(results)
    setSuggestLoading(false)
  }

  const addSuggestedStop = (place) => {
    setStops((s) => [...s, place.address || place.name])
    setShowSuggester(false)
    setSuggestResults([])
    setSuggestQuery('')
  }

  useEffect(() => {
    if (!window.google) return
    const bias = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(33.7, -118.7),
      new window.google.maps.LatLng(34.4, -117.9)
    )
    ;[startRef.current, endRef.current].forEach((el) => {
      if (!el) return
      const ac = new window.google.maps.places.Autocomplete(el, { bounds: bias, fields: ['formatted_address'] })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (el === startRef.current) setStart(place.formatted_address || el.value)
        else setEnd(place.formatted_address || el.value)
      })
    })
  }, [])

  const handleSearch = useCallback(async () => {
    if (!start || !end) return
    setLoading(true)
    setError('')
    setRoutes([])
    setSelectedIdx(null)
    const activeStops = stops.filter((s) => s.trim())
    try {
      const ds = new window.google.maps.DirectionsService()
      const result = await ds.route({
        origin: start,
        destination: end,
        waypoints: activeStops.map((s) => ({ location: s, stopover: true })),
        travelMode: window.google.maps.TravelMode.BICYCLING,
        provideRouteAlternatives: activeStops.length === 0,
      })
      setRoutes(result.routes)
    } catch (e) {
      setError('No routes found. Try different addresses.')
    } finally {
      setLoading(false)
    }
  }, [start, end, stops])

  useEffect(() => {
    if (location.state?.start && location.state?.end && window.google) handleSearch()
  }, [])

  const selectedRoute = selectedIdx !== null ? routes[selectedIdx] : null

  const buildSimTopic = (route) => {
    const leg = route.legs[0]
    const via = route.summary ? `via ${route.summary}` : ''
    const from = leg.start_address?.split(',')[0] || 'start'
    const to = leg.end_address?.split(',')[0] || 'destination'
    return `riding from ${from} to ${to} ${via} (${leg.distance.text}, ${leg.duration.text} by bike)`
  }

  const handleSimulate = () => {
    if (!selectedRoute) return
    setCheckInMode('simulate')
  }

  const handleStartRide = () => {
    if (!selectedRoute) return
    setCheckInMode('ride')
  }

  const commitStartRide = () => {
    const legs = selectedRoute.legs
    const totalM = legs.reduce((s, l) => s + l.distance.value, 0)
    const totalSec = legs.reduce((s, l) => s + l.duration.value, 0)
    const distText = totalM < 1609 ? `${Math.round(totalM)}m` : `${(totalM / 1609).toFixed(1)} mi`
    const durText = totalSec < 3600
      ? `${Math.round(totalSec / 60)} min`
      : `${Math.floor(totalSec / 3600)}h ${Math.round((totalSec % 3600) / 60)}m`
    localStorage.setItem('bk_active_route', JSON.stringify({
      summary: selectedRoute.summary,
      start: legs[0].start_address,
      end: legs[legs.length - 1].end_address,
      distance: distText,
      duration: durText,
      waypoints: stops.filter((s) => s.trim()),
    }))
    navigate('/ride')
  }

  const handleCheckInComplete = () => {
    if (checkInMode === 'ride') {
      commitStartRide()
    } else if (checkInMode === 'simulate') {
      const topic = buildSimTopic(selectedRoute)
      navigate('/learn/simulation', { state: { autoTopic: topic } })
    }
    setCheckInMode(null)
  }

  const handleCheckInSkip = () => {
    localStorage.removeItem('bk_preridecheck')
    if (checkInMode === 'ride') commitStartRide()
    else if (checkInMode === 'simulate') {
      const topic = buildSimTopic(selectedRoute)
      navigate('/learn/simulation', { state: { autoTopic: topic } })
    }
    setCheckInMode(null)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', paddingBottom: selectedRoute ? 120 : 0 }}>
      <div className="px-5 pt-6 pb-3">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 mb-4 text-sm" style={{ color: 'var(--orange)' }}>
          <ChevronLeft size={16} /> Dashboard
        </button>
        <h1 className="text-4xl mb-4" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)' }}>PLAN A RIDE</h1>

        <div className="space-y-2 mb-3">
          <input ref={startRef} type="text" placeholder="Start address" value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid #444', color: 'var(--cream)' }} />
          {stops.map((stop, i) => (
            <StopInput
              key={i}
              value={stop}
              onChange={(val) => setStops((s) => s.map((v, idx) => idx === i ? val : v))}
              onRemove={() => setStops((s) => s.filter((_, idx) => idx !== i))}
            />
          ))}
          <input ref={endRef} type="text" placeholder="End address" value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid #444', color: 'var(--cream)' }} />
          <div className="flex gap-2">
            <button
              onClick={() => setStops((s) => [...s, ''])}
              className="flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5"
              style={{ background: 'transparent', border: '1px dashed #444', color: '#888' }}
            >
              <Plus size={14} /> Add a stop
            </button>
            <button
              onClick={() => setShowSuggester((v) => !v)}
              className="flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5"
              style={{ background: showSuggester ? 'rgba(244,100,10,0.1)' : 'transparent', border: `1px dashed ${showSuggester ? 'var(--orange)' : '#444'}`, color: showSuggester ? 'var(--orange)' : '#888' }}
            >
              <MapPin size={14} /> Suggest a stop
            </button>
          </div>

          {/* Stop suggester panel */}
          {showSuggester && (
            <div className="rounded-xl p-4" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--orange)', opacity: 0.8 }}>
                What are you looking for?
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_STOPS.map((p) => (
                  <button key={p.label} onClick={() => { setSuggestQuery(p.query); handleSuggest(p.query) }}
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{ background: '#222', border: '1px solid #333', color: 'var(--cream)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={suggestQuery}
                  onChange={(e) => setSuggestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
                  placeholder='or type what you need...'
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: '#0f0f0f', border: '1px solid #333', color: 'var(--cream)' }} />
                <button onClick={() => handleSuggest()} disabled={!suggestQuery.trim() || suggestLoading}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: suggestQuery.trim() ? 'var(--orange)' : '#222', color: suggestQuery.trim() ? '#fff' : '#555' }}>
                  {suggestLoading ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
                </button>
              </div>
              {suggestResults.length > 0 && (
                <div className="space-y-2">
                  {suggestResults.map((place, i) => {
                    const offRoute = place.distToRoute
                    const offRouteText = offRoute != null
                      ? offRoute < 50 ? 'On route' : `${offRoute}m off route`
                      : ''
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: '#0f0f0f', border: '1px solid #2a2a2a' }}>
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--cream)' }}>{place.name}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                            {place.address}{place.rating ? ` · ★ ${place.rating}` : ''}
                          </p>
                          {offRouteText && (
                            <p className="text-xs mt-0.5" style={{ color: offRoute < 50 ? 'var(--safe)' : 'var(--orange)', opacity: 0.9 }}>
                              {offRouteText}
                            </p>
                          )}
                        </div>
                        <button onClick={() => addSuggestedStop(place)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'var(--orange)', color: '#fff' }}>
                          Add stop
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {!suggestLoading && suggestResults.length === 0 && suggestQuery && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--cream)', opacity: 0.35 }}>
                  No results found along this route.
                </p>
              )}
            </div>
          )}
          <button onClick={handleSearch} disabled={!start || !end || loading}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            style={{ background: start && end && !loading ? 'var(--orange)' : '#333', color: start && end && !loading ? '#fff' : '#666', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? 'FINDING ROUTES...' : 'FIND ROUTES'}
          </button>
        </div>
        {error && <p className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      {/* Map — grows taller once routes are visible */}
      <div className="px-5" style={{ height: routes.length ? 280 : 180 }}>
        <Map routes={routes} selectedRouteIdx={selectedIdx ?? 0} onMapReady={(map) => { mapRef.current = map }} />
      </div>

      {/* Route cards */}
      <div className="flex-1 px-5 py-4">
        {routes.length > 0 && (
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--cream)', opacity: 0.35 }}>
            Click a route to select it
          </p>
        )}
        {routes.map((route, i) => (
          <RouteCard
            key={i}
            route={route}
            index={i}
            selected={selectedIdx === i}
            onSelect={() => setSelectedIdx(i)}
            onPreview={() => setPreviewRoute(route)}
          />
        ))}
      </div>

      {/* Sticky action panel — appears when a route is selected */}
      {selectedRoute && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full px-4 py-4"
          style={{ maxWidth: 480, background: '#0f0f0f', borderTop: '1px solid #2a2a2a', zIndex: 40 }}
        >
          {/* Journey summary */}
          {(() => {
            const legs = selectedRoute.legs
            const totalM = legs.reduce((s, l) => s + l.distance.value, 0)
            const totalSec = legs.reduce((s, l) => s + l.duration.value, 0)
            const totalDist = totalM < 1609 ? `${Math.round(totalM)}m` : `${(totalM / 1609).toFixed(1)} mi`
            const totalDur = totalSec < 3600
              ? `${Math.round(totalSec / 60)} min`
              : `${Math.floor(totalSec / 3600)}h ${Math.round((totalSec % 3600) / 60)}m`
            return (
              <div className="mb-3">
                {/* Total */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--cream)', opacity: 0.35 }}>
                    Route {selectedIdx + 1} · Total
                  </p>
                  <p className="text-xs font-bold" style={{ color: 'var(--orange)' }}>
                    {totalDist} · {totalDur}
                  </p>
                </div>
                {/* Per-leg breakdown */}
                {legs.map((leg, i) => {
                  const from = leg.start_address?.split(',')[0] || 'Start'
                  const to = leg.end_address?.split(',')[0] || 'Destination'
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 px-1"
                      style={{ borderTop: '1px solid #1e1e1e' }}>
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
            )
          })()}
          <button
            onClick={() => setMapRoute(selectedRoute)}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3"
            style={{ background: '#161616', border: '1px solid #444', color: 'var(--cream)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
          >
            <Search size={16} /> VIEW ROUTE
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSimulate}
              className="py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: '#161616', border: '1px solid var(--orange)', color: 'var(--orange)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
            >
              <Zap size={16} /> SIMULATE ROUTE
            </button>
            <button
              onClick={handleStartRide}
              className="py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}
            >
              <Mic size={16} /> START RIDING
            </button>
          </div>
        </div>
      )}

      {previewRoute && (
        <StreetViewPreview route={previewRoute} onClose={() => setPreviewRoute(null)} />
      )}

      {mapRoute && (
        <RouteMapModal route={mapRoute} onClose={() => setMapRoute(null)} />
      )}

      {checkInMode && selectedRoute && (
        <PreRideCheckIn
          mode={checkInMode}
          routeLabel={`${selectedRoute.legs[0].start_address?.split(',')[0]} → ${selectedRoute.legs[selectedRoute.legs.length - 1].end_address?.split(',')[0]}`}
          onComplete={handleCheckInComplete}
          onSkip={handleCheckInSkip}
        />
      )}
    </div>
  )
}
