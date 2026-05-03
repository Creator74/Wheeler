import { useEffect, useRef } from 'react'

const LA_CENTER = { lat: 34.0522, lng: -118.2437 }

export default function Map({ routes, selectedRouteIdx, onMapReady, livePosition, heading, directionsResult, onPanAway, recenterTrigger }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const polylinesRef = useRef([])
  const markerRef = useRef(null)
  const rendererRef = useRef(null)
  const stopMarkersRef = useRef([])
  const navModeRef = useRef(false)
  const userPannedRef = useRef(false)
  const lastPosRef = useRef(null)

  const clearStopMarkers = () => {
    stopMarkersRef.current.forEach((m) => m.setMap(null))
    stopMarkersRef.current = []
  }

  const makeStopMarker = (position, label, title) =>
    new window.google.maps.Marker({
      position,
      map: mapRef.current,
      title,
      zIndex: 6,
      label: { text: label, color: '#fff', fontWeight: 'bold', fontSize: '11px' },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: '#F4640A',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    })

  useEffect(() => {
    if (!window.google || mapRef.current) return
    const map = new window.google.maps.Map(containerRef.current, {
      center: LA_CENTER,
      zoom: 15,
      styles: darkMapStyles,
      disableDefaultUI: true,
      zoomControl: true,
    })
    mapRef.current = map
    if (onMapReady) onMapReady(map)

    map.addListener('dragstart', () => {
      userPannedRef.current = true
      if (navModeRef.current && onPanAway) onPanAway()
    })
  }, [onMapReady])

  // Multi-route display (route selection page)
  useEffect(() => {
    if (!mapRef.current || !routes?.length) return
    if (!window.google.maps.geometry?.encoding) return
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
    const colors = ['#888', '#aaa', '#ccc']
    routes.forEach((route, i) => {
      if (!route.overview_polyline?.points) return
      const path = window.google.maps.geometry.encoding.decodePath(route.overview_polyline.points)
      const poly = new window.google.maps.Polyline({
        path,
        strokeColor: i === selectedRouteIdx ? '#F4640A' : colors[i] || '#888',
        strokeWeight: i === selectedRouteIdx ? 5 : 3,
        map: mapRef.current,
      })
      polylinesRef.current.push(poly)
    })
    const selected = routes[selectedRouteIdx]
    if (selected?.overview_polyline?.points) {
      const bounds = new window.google.maps.LatLngBounds()
      const path = window.google.maps.geometry.encoding.decodePath(selected.overview_polyline.points)
      path.forEach((p) => bounds.extend(p))
      mapRef.current.fitBounds(bounds, 40)
    }
  }, [routes, selectedRouteIdx])

  // Stop markers on route selection map
  useEffect(() => {
    if (!mapRef.current || !routes?.length) return
    clearStopMarkers()
    const selected = routes[selectedRouteIdx]
    if (!selected || selected.legs.length <= 1) return
    selected.legs.forEach((leg, i) => {
      if (i < selected.legs.length - 1) {
        stopMarkersRef.current.push(makeStopMarker(leg.end_location, `${i + 1}`, `Stop ${i + 1}`))
      }
    })
  }, [routes, selectedRouteIdx])

  // Navigation route via DirectionsRenderer — stay zoomed in, don't fit full route
  useEffect(() => {
    if (!mapRef.current || !directionsResult) return
    navModeRef.current = true
    if (rendererRef.current) rendererRef.current.setMap(null)
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      directions: directionsResult,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#F4640A',
        strokeWeight: 7,
        strokeOpacity: 0.9,
      },
    })
    // Add numbered stop markers for each intermediate waypoint
    clearStopMarkers()
    const legs = directionsResult.routes[0]?.legs || []
    legs.forEach((leg, i) => {
      if (i < legs.length - 1) {
        stopMarkersRef.current.push(makeStopMarker(leg.end_location, `${i + 1}`, `Stop ${i + 1}: ${leg.end_address?.split(',')[0]}`))
      }
    })

    // Zoom to start at street level
    const startLoc = legs[0]?.start_location
    if (startLoc) {
      mapRef.current.setZoom(17)
      mapRef.current.panTo(startLoc)
    }
  }, [directionsResult])

  // Live position marker — arrow pointing in direction of travel
  useEffect(() => {
    if (!mapRef.current || !livePosition?.lat) return
    const pos = { lat: livePosition.lat, lng: livePosition.lng }
    const icon = {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 8,
      fillColor: '#F4640A',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      rotation: heading ?? 0,
    }
    lastPosRef.current = pos
    if (markerRef.current) {
      markerRef.current.setPosition(pos)
      markerRef.current.setIcon(icon)
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon,
        zIndex: 10,
      })
    }
    if (!userPannedRef.current) mapRef.current.panTo(pos)
  }, [livePosition, heading])

  // Recenter triggered from outside
  useEffect(() => {
    if (!recenterTrigger) return
    userPannedRef.current = false
    if (lastPosRef.current && mapRef.current) mapRef.current.panTo(lastPosRef.current)
  }, [recenterTrigger])

  return <div ref={containerRef} className="w-full h-full rounded-lg" />
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#474747' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4c4c4c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]
