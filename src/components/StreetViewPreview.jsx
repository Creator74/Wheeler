import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { CORRIDOR_DIFFICULTY } from '../data/routeConfig'

function sampleWaypoints(encodedPolyline, intervalMeters = 200) {
  if (!window.google || !encodedPolyline || !window.google.maps.geometry?.encoding) return []
  const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline)
  const points = [path[0]]
  let distAccum = 0
  for (let i = 1; i < path.length; i++) {
    const d = window.google.maps.geometry.spherical.computeDistanceBetween(path[i - 1], path[i])
    distAccum += d
    if (distAccum >= intervalMeters) { points.push(path[i]); distAccum = 0 }
  }
  return points
}

function getHazardNote(streetName) {
  if (!streetName) return null
  for (const [key, val] of Object.entries(CORRIDOR_DIFFICULTY)) {
    if (streetName.includes(key)) return val.note
  }
  return null
}

export default function StreetViewPreview({ route, onClose }) {
  const panoramaRef = useRef(null)
  const timerRef = useRef(null)
  const [waypoints, setWaypoints] = useState([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [streetName, setStreetName] = useState('')
  const [turnInstruction, setTurnInstruction] = useState('')
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ok | error

  // Use callback ref so we know the exact moment the DOM node is available
  const containerRef = useCallback((node) => {
    if (!node || !window.google) return

    // Destroy previous instance
    if (panoramaRef.current) {
      panoramaRef.current = null
      node.innerHTML = ''
    }

    // Create panorama immediately on node mount with a known LA location first
    panoramaRef.current = new window.google.maps.StreetViewPanorama(node, {
      position: { lat: 34.0522, lng: -118.2437 },
      pov: { heading: 34, pitch: 0 },
      zoom: 1,
      disableDefaultUI: true,
      motionTracking: false,
      linksControl: false,
      showRoadLabels: true,
    })

    setStatus('ok')
  }, [])

  // Sample waypoints
  useEffect(() => {
    if (!route?.overview_polyline?.points || !window.google) return
    const pts = sampleWaypoints(route.overview_polyline.points, 200)
    setWaypoints(pts)
    setFrameIdx(0)
  }, [route])

  // Once we have waypoints and panorama, jump to ~20% in where routes diverge
  useEffect(() => {
    if (!waypoints.length || !panoramaRef.current) return
    const startIdx = Math.floor(waypoints.length * 0.2)
    setFrameIdx(startIdx)
    panoramaRef.current.setPosition(waypoints[startIdx])
    setPlaying(true)
  }, [waypoints])

  // Update position on frame change
  useEffect(() => {
    if (!panoramaRef.current || !waypoints[frameIdx]) return
    panoramaRef.current.setPosition(waypoints[frameIdx])

    // Geocode
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: waypoints[frameIdx] }, (results) => {
      if (results?.[0]) {
        const r = results[0].address_components.find((c) => c.types.includes('route'))
        setStreetName(r?.long_name || '')
      }
    })

    // Turn instruction
    const steps = route?.legs?.[0]?.steps || []
    for (const step of steps) {
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
        waypoints[frameIdx], step.start_location
      )
      if (dist < 300) {
        setTurnInstruction(step.html_instructions?.replace(/<[^>]*>/g, '') || '')
        break
      }
    }
  }, [frameIdx, waypoints, route])

  // Autoplay
  useEffect(() => {
    if (!playing || !waypoints.length) return
    timerRef.current = setInterval(() => {
      setFrameIdx((i) => {
        if (i >= waypoints.length - 1) { setPlaying(false); return i }
        return i + 1
      })
    }, 2500)
    return () => clearInterval(timerRef.current)
  }, [playing, waypoints.length])

  const advance = useCallback(() => {
    setPlaying(false)
    setFrameIdx((i) => Math.min(i + 1, waypoints.length - 1))
  }, [waypoints.length])

  const retreat = useCallback(() => {
    setPlaying(false)
    setFrameIdx((i) => Math.max(i - 1, 0))
  }, [])

  const hazard = getHazardNote(streetName)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#111' }}>

      <div className="relative" style={{ flex: 1, minHeight: 0 }}>
        {/* Panorama container — explicit 100% fills the relative parent */}
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0 }}
        />

        <button onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full z-20"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
          <X size={18} />
        </button>

        <div className="absolute top-3 left-3 right-14 p-2 rounded z-20"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
          <p className="text-xs font-bold" style={{ color: '#F4640A', letterSpacing: '0.08em' }}>RIDE PREVIEW</p>
          {streetName && <p className="text-sm font-medium mt-0.5" style={{ color: '#fff' }}>{streetName}</p>}
          {turnInstruction && <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>{turnInstruction}</p>}
        </div>

        {hazard && (
          <div className="absolute bottom-14 left-3 right-3 p-2 rounded text-xs z-20"
            style={{ background: 'rgba(230,57,70,0.88)', color: '#fff' }}>
            ⚠ {hazard}
          </div>
        )}

        <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-6 z-20">
          <button onClick={retreat} disabled={frameIdx === 0} className="p-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.75)', color: frameIdx === 0 ? '#444' : '#fff' }}>
            <ChevronLeft size={22} />
          </button>
          <span className="text-xs px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.55)' }}>
            {frameIdx + 1} / {Math.max(waypoints.length, 1)}
          </span>
          <button onClick={advance} disabled={frameIdx >= waypoints.length - 1} className="p-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.75)', color: frameIdx >= waypoints.length - 1 ? '#444' : '#fff' }}>
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 flex-shrink-0"
        style={{ height: 44, background: '#0a0a0a', borderTop: '1px solid #1e1e1e' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          This is what you'll see — ride this route before you leave.
        </p>
      </div>
    </div>
  )
}
