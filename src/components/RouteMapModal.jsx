import { useEffect, useRef, useState } from 'react'
import { X, Navigation, Loader2 } from 'lucide-react'

export default function RouteMapModal({ route, onClose }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !window.google || !route) return

    const leg = route.legs[0]

    const map = new window.google.maps.Map(containerRef.current, {
      zoom: 13,
      center: leg.start_location,
      styles: darkMapStyles,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    })

    const renderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#F4640A',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    })

    // Re-request directions so DirectionsRenderer gets a proper result object
    const ds = new window.google.maps.DirectionsService()
    ds.route(
      {
        origin: leg.start_location,
        destination: leg.end_location,
        travelMode: window.google.maps.TravelMode.BICYCLING,
        waypoints: leg.via_waypoints?.map((wp) => ({ location: wp, stopover: false })) || [],
      },
      (result, status) => {
        if (status === 'OK') {
          renderer.setDirections(result)
          setLoading(false)
        } else {
          setError(true)
          setLoading(false)
        }
      }
    )
  }, [route])

  if (!route) return null
  const leg = route.legs[0]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#111' }}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3" style={{ background: '#111' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--orange)' }} />
          <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.5 }}>Loading route...</p>
        </div>
      )}

      {/* Map */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Info bar */}
      <div className="flex-shrink-0 px-4 py-3" style={{ background: '#0a0a0a', borderTop: '1px solid #1e1e1e' }}>
        <div className="flex items-start gap-3">
          <Navigation size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--cream)' }}>
              {leg.start_address?.split(',')[0]} → {leg.end_address?.split(',')[0]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cream)', opacity: 0.45 }}>
              {leg.distance.text} · {leg.duration.text} by bike
              {route.summary ? ` · via ${route.summary}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-full z-20"
        style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
      >
        <X size={18} />
      </button>
    </div>
  )
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#484848' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4c4c4c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]
