import { useState, useEffect, useRef } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState({ lat: null, lng: null, error: null })
  const watchIdRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition((p) => ({ ...p, error: 'Geolocation not supported' }))
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null })
      },
      (err) => {
        setPosition((p) => ({ ...p, error: err.message }))
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return position
}
