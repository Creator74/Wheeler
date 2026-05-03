import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronLeft, Plus, X } from 'lucide-react'
import { searchNearbyPlaces, distanceMins } from '../utils/places'
import { saveRide, getRideHistory, parseDistanceMiles } from '../hooks/useRideHistory'
import Map from '../components/Map'
import PermissionBanner from '../components/PermissionBanner'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVoice } from '../hooks/useVoice'
import { askClaude } from '../hooks/useClaude'
import { getProfile } from '../hooks/useProfile'
import { NEIGHBORHOOD_TIPS } from '../data/neighborhoodTips'

const GEOCODE_INTERVAL = 15000

function haversineDist(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, '') || ''
}

function formatDist(meters) {
  if (!meters) return ''
  if (meters < 50) return `${meters}m`
  if (meters < 1000) return `${Math.round(meters / 50) * 50}m`
  return `${(meters / 1609).toFixed(1)}mi`
}

function maneuverArrow(maneuver) {
  if (!maneuver) return '↑'
  if (maneuver.includes('turn-left') || maneuver.includes('ramp-left')) return '←'
  if (maneuver.includes('turn-right') || maneuver.includes('ramp-right')) return '→'
  if (maneuver.includes('slight-left') || maneuver.includes('fork-left')) return '↖'
  if (maneuver.includes('slight-right') || maneuver.includes('fork-right')) return '↗'
  if (maneuver.includes('uturn')) return '↩'
  if (maneuver.includes('roundabout')) return '↻'
  return '↑'
}

// Template-based greeting — fast, no API call needed
function buildGreeting(profile, activeRoute, checkIn) {
  const name = profile?.name?.split(' ')[0] || ''
  const dest = activeRoute?.end?.split(',')[0] || 'your destination'
  const dist = activeRoute?.distance || ''
  const dur = activeRoute?.duration || ''

  let msg = name ? `Hey ${name}! ` : 'Hey! '
  msg += `You're heading to ${dest}`
  if (dist && dur) msg += ` — ${dist}, about ${dur}`
  msg += '.'

  if (checkIn?.nervous) {
    msg += ` I know you mentioned being a bit nervous about ${checkIn.nervous}. I'll give you a heads up before we get there, promise.`
  }
  if (checkIn?.excited) {
    msg += ` And ${checkIn.excited} is going to be a highlight — looking forward to that part.`
  } else if (!checkIn?.nervous) {
    msg += ` This is going to be a great ride.`
  }

  msg += ` I'm right here if you need anything. Just talk.`
  return msg
}

function buildSystemPrompt(profile, activeRoute, street, neighborhood, nextTurn, checkIn) {
  const name = profile?.name?.split(' ')[0] || 'rider'
  const fears = profile?.fears?.join(' and ') || 'heavy traffic'
  const levels = ['a beginner cyclist', 'an intermediate cyclist', 'a confident cyclist']
  const level = levels[Math.max(0, (profile?.comfortLevel ?? 1) - 1)]

  const history = getRideHistory().slice(0, 5)
  const pastPlaces = [...new Set(history.flatMap(r => r.placesVisited || []))].slice(0, 8)
  const pastRoutes = history.slice(0, 3).map(r => `${r.start} to ${r.end}`).join(', ')
  const totalMiles = history.reduce((s, r) => s + (r.distanceMiles || 0), 0).toFixed(1)

  return `You are Jamie, a cycling mentor riding alongside ${name} through LA right now. You know every street in this city.

Who you're riding with: ${name} is ${level}, worried about ${fears}.
Current route: ${activeRoute?.start?.split(',')[0] || 'start'} to ${activeRoute?.end?.split(',')[0] || 'destination'} (${activeRoute?.distance || ''}, ${activeRoute?.duration || ''}).
Where they are now: ${street || 'a street'} in ${neighborhood || 'LA'}.
${nextTurn ? `Coming up: "${nextTurn}"` : ''}
${checkIn?.nervous ? `They're nervous about: "${checkIn.nervous}" — address this proactively when relevant.` : ''}
${checkIn?.excited ? `They're excited about: "${checkIn.excited}" — acknowledge it when they get close.` : ''}
${checkIn?.confidence ? `Confidence going in: ${checkIn.confidence}/5.` : ''}
${history.length > 0 ? `Their ride history: ${totalMiles} miles ridden total. Past routes: ${pastRoutes || 'none yet'}.` : ''}
${pastPlaces.length > 0 ? `Places they've explored before: ${pastPlaces.join(', ')}.` : ''}

How to talk: warm, direct, specific. Like a friend who bikes everywhere and knows every LA block.
Rules: 1-3 sentences unless it's a safety warning. Use real street names. Never ask where they're going. No em-dashes. Sound human, not like a GPS.
If they seem anxious or stressed, calm them down with something specific and practical.
Reference their past rides when relevant — make them feel like you know their journey.`
}

function buildProactivePrompt(profile, activeRoute, street, neighborhood, nextTurn, checkIn, minutesRiding) {
  const name = profile?.name?.split(' ')[0] || 'the rider'
  const dest = activeRoute?.end?.split(',')[0] || 'their destination'

  return `You are Jamie, cycling companion to ${name} in LA. They are ${minutesRiding} minute${minutesRiding === 1 ? '' : 's'} into their ride heading to ${dest}.

Right now: ${street || 'a street'} in ${neighborhood || 'LA'}.
Next turn: "${nextTurn || 'continue straight'}".
${checkIn?.nervous ? `They mentioned being nervous about: "${checkIn.nervous}"` : ''}
${checkIn?.excited ? `They're excited about: "${checkIn.excited}"` : ''}

Proactively check in with a 1-2 sentence update. Pick whatever feels most natural right now:
- A specific tip for this street or neighborhood
- A heads-up about what's coming in the next few turns
- A bit of encouragement or acknowledgment of progress
- Addressing their nervousness if it's relevant to where they are
- Just a natural friendly check-in

Be specific to their actual location. Sound like a friend, not a GPS. No generic advice.
Reply with ONLY the spoken message, nothing else.`
}

export default function Ride() {
  const navigate = useNavigate()
  const profile = getProfile()
  const checkIn = JSON.parse(localStorage.getItem('bk_preridecheck') || 'null')
  const { lat, lng, error: geoError } = useGeolocation()
  const {
    speak, stopSpeaking,
    startAlwaysOn, stopAlwaysOn,
    isSpeaking, isListening,
  } = useVoice()

  const [activeRoute, setActiveRoute] = useState(null)
  const [directionsResult, setDirectionsResult] = useState(null)
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [nextTurnInstruction, setNextTurnInstruction] = useState('')
  const [nextTurnDist, setNextTurnDist] = useState(null)
  const [nextManeuver, setNextManeuver] = useState('')
  const [upcomingSteps, setUpcomingSteps] = useState([])
  const [legBoundaries, setLegBoundaries] = useState([])
  const [heading, setHeading] = useState(0)
  const [currentStreet, setCurrentStreet] = useState('')
  const [currentNeighborhood, setCurrentNeighborhood] = useState('')
  const [transcript, setTranscript] = useState('')
  const [caption, setCaption] = useState('')
  const [thinking, setThinking] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [pendingTip, setPendingTip] = useState(null)
  const [arrived, setArrived] = useState(false)
  const [pannedAway, setPannedAway] = useState(false)
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [showAddStop, setShowAddStop] = useState(false)
  const [addStopValue, setAddStopValue] = useState('')
  const addStopInputRef = useRef(null)
  const [pendingPlaces, setPendingPlaces] = useState(null)
  const [rerouting, setRerouting] = useState(false)

  // Ride history tracking
  const neighborhoodsVisitedRef = useRef(new Set())
  const rideSavedRef = useRef(false)

  const persistRide = useCallback((completed) => {
    if (rideSavedRef.current) return
    rideSavedRef.current = true
    const route = activeRouteRef.current
    if (!route) return
    const placesVisited = [
      ...(route.waypoints || []),
      route.end?.split(',')[0],
      ...Array.from(neighborhoodsVisitedRef.current),
    ].filter(Boolean)
    saveRide({
      start: route.start?.split(',')[0] || route.start,
      end: route.end?.split(',')[0] || route.end,
      summary: route.summary || '',
      distanceMiles: parseDistanceMiles(route.distance),
      durationMins: parseInt(route.duration) || 0,
      distanceText: route.distance || '',
      durationText: route.duration || '',
      placesVisited,
      checkInConfidence: checkIn?.confidence || 0,
      completed,
    })
  }, [checkIn])

  // Navigation refs
  const lastPosRef = useRef(null)
  const announcedStepRef = useRef(-1)
  const geocodeTimerRef = useRef(null)
  const lastNeighborhoodRef = useRef('')
  const hasCompassRef = useRef(false)
  const reroutingRef = useRef(false)
  const offRouteCountRef = useRef(0)

  // Voice/proactive refs — always current value without stale closure issues
  const greetedRef = useRef(false)
  const isProcessingRef = useRef(false)
  const rideStartTimeRef = useRef(null)
  const lastProactiveTimeRef = useRef(0)
  const lastProactivePosRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const currentStreetRef = useRef('')
  const currentNeighborhoodRef = useRef('')
  const nextTurnRef = useRef('')
  const activeRouteRef = useRef(null)
  const pendingPlacesRef = useRef(null)
  const handleVoiceInputRef = useRef(null)
  const latRef = useRef(null)
  const lngRef = useRef(null)

  // Keep refs in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
  useEffect(() => { currentStreetRef.current = currentStreet }, [currentStreet])
  useEffect(() => { currentNeighborhoodRef.current = currentNeighborhood }, [currentNeighborhood])
  useEffect(() => { nextTurnRef.current = nextTurnInstruction }, [nextTurnInstruction])
  useEffect(() => { activeRouteRef.current = activeRoute }, [activeRoute])
  useEffect(() => { pendingPlacesRef.current = pendingPlaces }, [pendingPlaces])
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])

  // Device orientation → compass heading
  useEffect(() => {
    const handle = (e) => {
      let h = null
      if (e.webkitCompassHeading != null) h = e.webkitCompassHeading
      else if (e.alpha != null) h = (360 - e.alpha) % 360
      if (h != null) { hasCompassRef.current = true; setHeading(h) }
    }
    const register = () => {
      window.addEventListener('deviceorientationabsolute', handle, true)
      window.addEventListener('deviceorientation', handle, true)
    }
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(s => { if (s === 'granted') register() }).catch(() => {})
    } else {
      register()
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handle, true)
      window.removeEventListener('deviceorientation', handle, true)
    }
  }, [])

  // Load saved route + fetch directions
  useEffect(() => {
    const saved = localStorage.getItem('bk_active_route')
    if (!saved) return
    const route = JSON.parse(saved)
    setActiveRoute(route)
    const fetch = () => {
      if (!window.google) { setTimeout(fetch, 400); return }
      new window.google.maps.DirectionsService().route(
        {
          origin: route.start,
          destination: route.end,
          waypoints: (route.waypoints || []).map(w => ({ location: w, stopover: true })),
          travelMode: window.google.maps.TravelMode.BICYCLING,
        },
        (result, status) => {
          if (status === 'OK') { setDirectionsResult(result); applyDirections(result) }
        }
      )
    }
    fetch()
  }, [])

  // Reverse geocode
  const reverseGeocode = useCallback((lat, lng) => {
    if (!window.google) return
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results) => {
      if (!results?.[0]) return
      const comps = results[0].address_components
      const street = comps.find(c => c.types.includes('route'))?.long_name || ''
      const neighborhood =
        comps.find(c => c.types.includes('sublocality'))?.long_name ||
        comps.find(c => c.types.includes('neighborhood'))?.long_name || ''
      setCurrentStreet(street)
      setCurrentNeighborhood(neighborhood)
      if (neighborhood && neighborhood !== lastNeighborhoodRef.current) {
        lastNeighborhoodRef.current = neighborhood
        neighborhoodsVisitedRef.current.add(neighborhood)
        const tip = Object.entries(NEIGHBORHOOD_TIPS).find(([k]) =>
          neighborhood.toLowerCase().includes(k.toLowerCase())
        )?.[1]
        if (tip) { setPendingTip(tip); setShowBanner(true) }
      }
    })
  }, [])

  useEffect(() => {
    if (!lat || !lng) return
    clearInterval(geocodeTimerRef.current)
    reverseGeocode(lat, lng)
    geocodeTimerRef.current = setInterval(() => reverseGeocode(lat, lng), GEOCODE_INTERVAL)
    return () => clearInterval(geocodeTimerRef.current)
  }, [lat, lng, reverseGeocode])

  const applyDirections = (result) => {
    const legs = result.routes[0].legs
    setSteps(legs.flatMap(leg => leg.steps))
    let idx = 0
    setLegBoundaries(legs.map((leg, i) => {
      idx += leg.steps.length
      return { lastStepIdx: idx - 1, address: leg.end_address?.split(',')[0] || '', isStop: i < legs.length - 1, stopNum: i + 1 }
    }))
  }

  // Autocomplete for mid-ride add-stop
  useEffect(() => {
    if (!showAddStop || !addStopInputRef.current || !window.google) return
    const bias = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(33.7, -118.7),
      new window.google.maps.LatLng(34.4, -117.9)
    )
    const ac = new window.google.maps.places.Autocomplete(addStopInputRef.current, { bounds: bias, fields: ['formatted_address'] })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      setAddStopValue(place.formatted_address || addStopInputRef.current.value)
    })
  }, [showAddStop])

  const handleConfirmStop = () => {
    if (!addStopValue.trim()) return
    const newWaypoints = [addStopValue.trim(), ...(activeRoute?.waypoints || [])]
    const updated = { ...activeRoute, waypoints: newWaypoints }
    setActiveRoute(updated)
    localStorage.setItem('bk_active_route', JSON.stringify(updated))
    setShowAddStop(false)
    setAddStopValue('')
    if (lat && lng) reroute(lat, lng, newWaypoints)
  }

  const reroute = useCallback((lat, lng, waypointOverride) => {
    if (reroutingRef.current || !activeRouteRef.current || !window.google) return
    reroutingRef.current = true
    setRerouting(true)
    speak('Rerouting.')
    const waypoints = waypointOverride ?? (activeRouteRef.current.waypoints || [])
    new window.google.maps.DirectionsService().route(
      {
        origin: { lat, lng },
        destination: activeRouteRef.current.end,
        waypoints: waypoints.map(w => ({ location: w, stopover: true })),
        travelMode: window.google.maps.TravelMode.BICYCLING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirectionsResult(result)
          applyDirections(result)
          setCurrentStepIdx(0)
          announcedStepRef.current = -1
          offRouteCountRef.current = 0
        }
        reroutingRef.current = false
        setRerouting(false)
      }
    )
  }, [speak])

  // Track position + announce turns
  useEffect(() => {
    if (!lat || !lng || !steps.length || !window.google?.maps?.geometry) return
    const pos = new window.google.maps.LatLng(lat, lng)

    if (lastPosRef.current && !hasCompassRef.current) {
      setHeading(window.google.maps.geometry.spherical.computeHeading(lastPosRef.current, pos))
    }
    lastPosRef.current = pos

    let nearest = currentStepIdx
    let nearestDist = Infinity
    const end = Math.min(steps.length - 1, currentStepIdx + 5)
    for (let i = currentStepIdx; i <= end; i++) {
      const d = window.google.maps.geometry.spherical.computeDistanceBetween(pos, steps[i].end_location)
      if (d < nearestDist) { nearestDist = d; nearest = i }
    }
    if (nearest !== currentStepIdx) setCurrentStepIdx(nearest)

    const window_ = steps.slice(Math.max(0, nearest - 1), Math.min(steps.length, nearest + 4))
    const minDist = Math.min(...window_.flatMap(s => [
      window.google.maps.geometry.spherical.computeDistanceBetween(pos, s.start_location),
      window.google.maps.geometry.spherical.computeDistanceBetween(pos, s.end_location),
    ]))
    if (minDist > 50) {
      offRouteCountRef.current += 1
      if (offRouteCountRef.current >= 3) reroute(lat, lng)
    } else {
      offRouteCountRef.current = 0
    }

    const distToEnd = window.google.maps.geometry.spherical.computeDistanceBetween(pos, steps[nearest].end_location)
    const nextStep = steps[nearest + 1]
    if (nextStep) {
      setNextTurnInstruction(stripHtml(nextStep.html_instructions))
      setNextTurnDist(Math.round(distToEnd))
      setNextManeuver(nextStep.maneuver || '')
    } else {
      setNextTurnInstruction('Arriving at destination')
      setNextTurnDist(Math.round(distToEnd))
      setNextManeuver('')
    }

    let cumDist = Math.round(distToEnd)
    const upcoming = []
    for (let i = nearest + 1; i < Math.min(steps.length, nearest + 5); i++) {
      upcoming.push({ instruction: stripHtml(steps[i].html_instructions), maneuver: steps[i].maneuver || '', distFromHere: cumDist })
      cumDist += steps[i].distance?.value || 0
    }
    setUpcomingSteps(upcoming)

    if (distToEnd < 120 && announcedStepRef.current !== nearest) {
      announcedStepRef.current = nearest
      if (nextStep) {
        const msg = `In ${formatDist(Math.round(distToEnd))}, ${stripHtml(nextStep.html_instructions)}.`
        speak(msg)
        setCaption(msg)
      } else if (distToEnd < 40) {
        setArrived(true)
        persistRide(true)
        const msg = `You made it! Nice work getting to ${activeRouteRef.current?.end?.split(',')[0] || 'your destination'}. That was a solid ride.`
        speak(msg)
        setCaption(msg)
      }
    }
  }, [lat, lng, steps, reroute, speak])

  const addVoiceStop = useCallback((place) => {
    const newWaypoints = [place.address || place.name, ...(activeRouteRef.current?.waypoints || [])]
    const updated = { ...activeRouteRef.current, waypoints: newWaypoints }
    setActiveRoute(updated)
    localStorage.setItem('bk_active_route', JSON.stringify(updated))
    setPendingPlaces(null)
    const l = latRef.current; const g = lngRef.current
    if (l && g) reroute(l, g, newWaypoints)
  }, [reroute])

  // Core voice input handler — always-on calls this on every final transcript
  const handleVoiceInput = useCallback(async (text) => {
    if (!text?.trim() || text.trim().split(' ').length < 2) return
    if (isProcessingRef.current) return

    stopAlwaysOn()
    isProcessingRef.current = true
    setTranscript(text)
    setThinking(true)

    try {
      // Multi-turn: user is confirming a pending place suggestion
      const pending = pendingPlacesRef.current
      if (pending?.length) {
        const confirmSys = `The cyclist was offered these nearby stops:
${pending.map((p, i) => `${i + 1}. ${p.name} (${p.address})`).join('\n')}
They replied: "${text}"
Return JSON only: {"confirmed": true/false, "stopIndex": 0}
(0-based index, -1 if none. If they said "yes"/"sure" with no specific name, pick 0.)`
        const raw = await askClaude(confirmSys, text)
        try {
          const { confirmed, stopIndex } = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
          if (confirmed && pending[stopIndex >= 0 ? stopIndex : 0]) {
            const stop = pending[stopIndex >= 0 ? stopIndex : 0]
            const msg = `Adding ${stop.name} as your next stop. Rerouting now.`
            setCaption(msg)
            setThinking(false)
            setTranscript('')
            await speak(msg)
            addVoiceStop(stop)
          } else {
            const msg = "No problem, staying on your current route."
            setCaption(msg)
            setThinking(false)
            setTranscript('')
            setPendingPlaces(null)
            await speak(msg)
          }
        } catch {
          setPendingPlaces(null)
          setThinking(false)
          setTranscript('')
        }
        return
      }

      // Detect if the user wants to find a nearby place
      const intentSys = `Determine if a cyclist wants to find a nearby place.
If yes: return JSON {"type":"place_search","query":"search terms for Google Places"}
If no: return JSON {"type":"normal"}`
      const intentRaw = await askClaude(intentSys, text)
      let intent = { type: 'normal' }
      try {
        intent = JSON.parse(intentRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      } catch {}

      const l = latRef.current; const g = lngRef.current
      if (intent.type === 'place_search' && l && g) {
        const places = await searchNearbyPlaces(intent.query, l, g)
        if (places.length) {
          const placeList = places.map(p => {
            const mins = distanceMins(l, g, p.location.lat, p.location.lng)
            return `${p.name}${mins ? `, about ${mins} minutes away` : ''}`
          })
          const msg = placeList.length === 1
            ? `I found ${placeList[0]}. Want me to add it as your next stop?`
            : `I found a few options: ${placeList.slice(0, 2).join(', and ')}. Want to add any of them?`
          setCaption(msg)
          setThinking(false)
          setTranscript('')
          setPendingPlaces(places)
          await speak(msg)
        } else {
          const msg = "Nothing came up nearby for that. Try a different search?"
          setCaption(msg)
          setThinking(false)
          setTranscript('')
          await speak(msg)
        }
        return
      }

      // Normal conversational response
      const sys = buildSystemPrompt(
        profile, activeRouteRef.current,
        currentStreetRef.current, currentNeighborhoodRef.current,
        nextTurnRef.current, checkIn
      )
      const reply = await askClaude(sys, text)
      setCaption(reply)
      setThinking(false)
      setTranscript('')
      await speak(reply)
    } catch {
      setThinking(false)
      setTranscript('')
    } finally {
      isProcessingRef.current = false
      startAlwaysOn(handleVoiceInputRef.current)
    }
  }, [speak, stopAlwaysOn, startAlwaysOn, profile, checkIn, addVoiceStop])

  // Keep the ref pointing to the latest version
  handleVoiceInputRef.current = handleVoiceInput

  // Auto-greeting when route + GPS are both ready
  useEffect(() => {
    if (greetedRef.current || !steps.length || !lat || !lng || !activeRoute) return
    greetedRef.current = true
    rideStartTimeRef.current = Date.now()
    lastProactiveTimeRef.current = Date.now()
    lastProactivePosRef.current = { lat, lng }

    const greeting = buildGreeting(profile, activeRoute, checkIn)
    setCaption(greeting)
    speak(greeting).then(() => {
      startAlwaysOn(handleVoiceInputRef.current)
    })
  }, [steps.length, lat, lng, activeRoute]) // eslint-disable-line

  // Proactive updates — every ~450m moved or ~90s
  const fireProactiveUpdate = useCallback(async () => {
    if (isProcessingRef.current || isSpeakingRef.current || !rideStartTimeRef.current) return
    if (Date.now() - rideStartTimeRef.current < 35000) return // let the greeting settle first

    isProcessingRef.current = true
    try {
      const minutesRiding = Math.round((Date.now() - rideStartTimeRef.current) / 60000)
      const sys = buildProactivePrompt(
        profile, activeRouteRef.current,
        currentStreetRef.current, currentNeighborhoodRef.current,
        nextTurnRef.current, checkIn, minutesRiding
      )
      const reply = await askClaude(sys, 'Give a proactive update.')
      setCaption(reply)
      await speak(reply)
    } catch {
      // silent fail — proactive updates are best-effort
    } finally {
      isProcessingRef.current = false
      startAlwaysOn(handleVoiceInputRef.current)
    }
  }, [profile, checkIn, speak, startAlwaysOn])

  useEffect(() => {
    if (!lat || !lng || !steps.length || !rideStartTimeRef.current) return
    const distFromLast = haversineDist(lat, lng, lastProactivePosRef.current?.lat, lastProactivePosRef.current?.lng)
    const timeSinceLast = Date.now() - lastProactiveTimeRef.current
    if (distFromLast > 450 || (timeSinceLast > 90000 && distFromLast > 100)) {
      lastProactivePosRef.current = { lat, lng }
      lastProactiveTimeRef.current = Date.now()
      fireProactiveUpdate()
    }
  }, [lat, lng]) // eslint-disable-line

  return (
    <div className="h-screen flex flex-col relative" style={{ background: '#000' }}>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(10,10,10,0.9)', borderBottom: '1px solid #1e1e1e' }}>
        <button onClick={() => { persistRide(arrived); stopAlwaysOn(); navigate('/routes') }}
          className="flex items-center gap-1 text-sm" style={{ color: 'var(--orange)' }}>
          <ChevronLeft size={16} /> End
        </button>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ fontFamily: 'Bebas Neue', color: 'var(--orange)', letterSpacing: '0.1em' }}>
            {arrived ? 'ARRIVED' : 'NAVIGATING'}
          </p>
          {currentStreet && (
            <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.65 }}>{currentStreet}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddStop(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#1e1e1e', border: '1px solid #444', color: 'var(--cream)' }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ marginTop: 52 }}>
        {lat && lng ? (
          <Map
            livePosition={{ lat, lng }}
            heading={heading}
            directionsResult={directionsResult}
            onPanAway={() => setPannedAway(true)}
            recenterTrigger={recenterTrigger}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#111' }}>
            <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.45 }}>
              {geoError ? `Location: ${geoError}` : 'Waiting for GPS…'}
            </p>
          </div>
        )}

        {/* Turn card */}
        {nextTurnInstruction && !arrived && (
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(8,8,8,0.95)', border: '1px solid #2a2a2a', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <span className="font-bold flex-shrink-0 text-center"
              style={{ fontSize: '1.6rem', color: 'var(--orange)', minWidth: 32, lineHeight: 1 }}>
              {maneuverArrow(nextManeuver)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--cream)' }}>{nextTurnInstruction}</p>
              {nextTurnDist !== null && (
                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--orange)' }}>{formatDist(nextTurnDist)}</p>
              )}
            </div>
          </div>
        )}

        {/* Upcoming turns */}
        {upcomingSteps.length > 1 && !arrived && !rerouting && (
          <div className="absolute left-3 right-3 z-10 rounded-2xl overflow-hidden"
            style={{ top: nextTurnInstruction ? 80 : 12, background: 'rgba(8,8,8,0.88)', border: '1px solid #222' }}>
            {upcomingSteps.slice(1).map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : undefined }}>
                <span className="flex-shrink-0 text-base w-5 text-center" style={{ color: '#666' }}>
                  {maneuverArrow(step.maneuver)}
                </span>
                <p className="flex-1 text-xs truncate" style={{ color: 'var(--cream)', opacity: 0.55 }}>
                  {step.instruction}
                </p>
                <span className="flex-shrink-0 text-xs" style={{ color: '#555' }}>
                  {formatDist(step.distFromHere)}
                </span>
              </div>
            ))}
          </div>
        )}

        {rerouting && (
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(8,8,8,0.95)', border: '1px solid #555' }}>
            <span className="text-lg animate-spin" style={{ display: 'inline-block' }}>↻</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Rerouting…</p>
          </div>
        )}

        {arrived && (
          <div className="absolute top-3 left-3 right-3 z-10 text-center px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(45,198,83,0.15)', border: '1px solid rgba(45,198,83,0.5)' }}>
            <p className="font-bold text-lg" style={{ color: '#4ade80', fontFamily: 'Bebas Neue', letterSpacing: '0.1em' }}>
              YOU ARRIVED
            </p>
          </div>
        )}

        {pannedAway && (
          <button
            onClick={() => { setPannedAway(false); setRecenterTrigger(n => n + 1) }}
            className="absolute right-4 px-4 py-2 rounded-full text-xs font-bold z-30"
            style={{ bottom: 130, background: 'rgba(10,10,10,0.95)', border: '1px solid var(--orange)', color: 'var(--orange)' }}>
            ⊕ Re-center
          </button>
        )}

        {/* Destination bar */}
        {activeRoute && !arrived && (() => {
          const currentLeg = legBoundaries.find(b => currentStepIdx <= b.lastStepIdx)
          const finalLeg = legBoundaries[legBoundaries.length - 1]
          const showBoth = currentLeg?.isStop
          return (
            <div className="absolute bottom-28 right-3 z-10 px-3 py-2 rounded-xl"
              style={{ maxWidth: 180, background: 'rgba(8,8,8,0.88)', border: '1px solid #1e1e1e' }}>
              {showBoth ? (
                <>
                  <p className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>
                    → Stop {currentLeg.stopNum}: {currentLeg.address}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                    Then → {finalLeg?.address} · {activeRoute.distance} total
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.5 }}>
                    → {activeRoute.end?.split(',')[0]}
                  </p>
                  <p className="text-xs flex-shrink-0" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                    {activeRoute.distance}
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Pending place suggestions */}
        {pendingPlaces?.length > 0 && (
          <div className="absolute left-3 right-3 z-20 rounded-2xl overflow-hidden"
            style={{ bottom: 130, background: 'rgba(8,8,8,0.97)', border: '1px solid var(--orange)' }}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--orange)' }}>Nearby stops</p>
              <button onClick={() => setPendingPlaces(null)} style={{ color: '#555' }}><X size={14} /></button>
            </div>
            {pendingPlaces.map((place, i) => {
              const mins = lat && lng ? distanceMins(lat, lng, place.location.lat, place.location.lng) : null
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: '1px solid #1a1a1a' }}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--cream)' }}>{place.name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                      {place.address}{place.rating ? ` · ★ ${place.rating}` : ''}{mins ? ` · ~${mins} min` : ''}
                    </p>
                  </div>
                  <button onClick={() => addVoiceStop(place)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--orange)', color: '#fff' }}>
                    Add
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Voice status bubble — always shows last caption, updates on activity */}
        {(caption || isSpeaking || isListening || thinking) && (
          <div className="absolute left-3 right-3 z-10 p-4 rounded-2xl transition-all"
            style={{
              bottom: 100,
              background: 'rgba(8,8,8,0.95)',
              border: `1px solid ${isSpeaking ? 'var(--orange)' : isListening ? 'rgba(244,100,10,0.35)' : '#1e1e1e'}`,
              opacity: isSpeaking || isListening || thinking ? 1 : 0.45,
            }}>
            {isSpeaking && (
              <div className="flex justify-center gap-1.5 items-end h-4 mb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
            {isListening && !isSpeaking && transcript && (
              <p className="text-xs text-center mb-1.5" style={{ color: 'var(--orange)', opacity: 0.7 }}>you</p>
            )}
            {thinking && !isSpeaking && !isListening && (
              <p className="text-xs text-center mb-1.5" style={{ color: 'var(--cream)', opacity: 0.35 }}>thinking...</p>
            )}
            <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--cream)' }}>
              {isListening && !isSpeaking ? (transcript || '...') : caption}
            </p>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="text-xs block mx-auto mt-2 px-3 py-0.5 rounded"
                style={{ border: '1px solid #333', color: '#666' }}>
                skip
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mic — ambient indicator, tap to skip while speaking */}
      <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1.5 z-20">
        <button
          onClick={() => {
            if (isSpeaking) {
              stopSpeaking()
            }
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isSpeaking ? 'var(--orange)' : 'rgba(244,100,10,0.08)',
            border: `2px solid ${isSpeaking ? 'var(--orange)' : isListening ? 'rgba(244,100,10,0.5)' : 'rgba(244,100,10,0.18)'}`,
            boxShadow: isListening ? '0 0 0 8px rgba(244,100,10,0.06)' : 'none',
          }}>
          <Mic size={22} color={isSpeaking || isListening ? '#fff' : 'rgba(244,100,10,0.4)'} />
        </button>
        <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.25 }}>
          {isSpeaking ? 'tap to skip' : isListening ? 'listening' : thinking ? 'thinking...' : 'always on'}
        </p>
      </div>

      {/* Add stop modal */}
      {showAddStop && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddStop(false) }}>
          <div className="w-full px-4 pb-8 pt-5 rounded-t-2xl" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base" style={{ fontFamily: 'Bebas Neue', color: 'var(--cream)', letterSpacing: '0.06em' }}>
                ADD A STOP
              </p>
              <button onClick={() => setShowAddStop(false)} style={{ color: '#888' }}><X size={18} /></button>
            </div>
            <input
              ref={addStopInputRef}
              type="text"
              value={addStopValue}
              onChange={e => setAddStopValue(e.target.value)}
              placeholder="Where do you want to stop?"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: 'var(--cream)' }}
              autoFocus
            />
            <button
              onClick={handleConfirmStop}
              disabled={!addStopValue.trim()}
              className="w-full py-3 rounded-xl font-bold"
              style={{
                background: addStopValue.trim() ? 'var(--orange)' : '#1a1a1a',
                color: addStopValue.trim() ? '#fff' : '#444',
                fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em',
              }}>
              ADD STOP + REROUTE
            </button>
          </div>
        </div>
      )}

      {showBanner && (
        <PermissionBanner
          onYes={() => {
            setShowBanner(false)
            if (pendingTip) { setCaption(pendingTip); speak(pendingTip); setPendingTip(null) }
          }}
          onLater={() => { setShowBanner(false); setPendingTip(null) }}
        />
      )}
    </div>
  )
}
