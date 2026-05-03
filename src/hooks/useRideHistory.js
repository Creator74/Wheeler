const KEY = 'bk_ride_history'

export function getRideHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveRide(ride) {
  const history = getRideHistory()
  const entry = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    ...ride,
  }
  history.unshift(entry)
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, 100)))
  return entry
}

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeeklyStats() {
  const history = getRideHistory()
  const weekStart = startOfWeek()

  const thisWeek = history.filter(r => new Date(r.date) >= weekStart)
  const milesThisWeek = parseFloat(thisWeek.reduce((s, r) => s + (r.distanceMiles || 0), 0).toFixed(1))
  const ridesThisWeek = thisWeek.length
  const confidenceThisWeek = thisWeek.filter(r => r.checkInConfidence).length
    ? Math.round(thisWeek.filter(r => r.checkInConfidence).reduce((s, r) => s + r.checkInConfidence, 0) / thisWeek.filter(r => r.checkInConfidence).length)
    : 0
  const placesThisWeek = [...new Set(thisWeek.flatMap(r => r.placesVisited || []))].length

  // Last 7 days bar data
  const dailyMiles = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const miles = history
      .filter(r => r.date === dateStr)
      .reduce((s, r) => s + (r.distanceMiles || 0), 0)
    return {
      day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      date: dateStr,
      miles: parseFloat(miles.toFixed(1)),
      isToday: dateStr === new Date().toISOString().split('T')[0],
    }
  })

  return { milesThisWeek, ridesThisWeek, confidenceThisWeek, placesThisWeek, dailyMiles }
}

export function getAllPlacesVisited() {
  const history = getRideHistory()
  const seen = new Set()
  const places = []
  for (const ride of history) {
    for (const place of ride.placesVisited || []) {
      const key = place.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        places.push({ name: place, date: ride.date })
      }
    }
  }
  return places
}

export function parseDistanceMiles(distText) {
  if (!distText) return 0
  const mi = distText.match(/([\d.]+)\s*mi/)
  if (mi) return parseFloat(mi[1])
  const km = distText.match(/([\d.]+)\s*km/)
  if (km) return parseFloat(km[1]) * 0.621
  const m = distText.match(/([\d.]+)\s*m/)
  if (m) return parseFloat(m[1]) / 1609
  return 0
}
