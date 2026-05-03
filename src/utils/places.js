function makePlacesService() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const svc = new window.google.maps.places.PlacesService(div)
  return { svc, cleanup: () => document.body.removeChild(div) }
}

export function searchNearbyPlaces(query, lat, lng, radiusMeters = 800) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places || !lat || !lng) { resolve([]); return }
    const { svc, cleanup } = makePlacesService()
    svc.textSearch(
      {
        query,
        location: new window.google.maps.LatLng(lat, lng),
        radius: radiusMeters,
      },
      (results, status) => {
        cleanup()
        if (results?.length) {
          resolve(results.slice(0, 5).map((p) => ({
            name: p.name,
            address: p.formatted_address || p.vicinity || '',
            location: { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() },
            rating: p.rating,
            placeId: p.place_id,
          })))
        } else {
          console.warn('[Places] textSearch returned', status, 'for:', query, 'at', lat, lng)
          resolve([])
        }
      }
    )
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Haversine distance in meters — no Google Maps dependency
function haversineDist(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distToPoints(placeLat, placeLng, points) {
  let min = Infinity
  for (const pt of points) {
    const d = haversineDist(placeLat, placeLng, pt.lat, pt.lng)
    if (d < min) min = d
  }
  return Math.round(min)
}

// Accept a DirectionsRoute object (result.routes[i]) — no polyline decoding needed
export async function searchAlongRoute(query, directionsRoute) {
  if (!directionsRoute) {
    console.warn('[Places] no route provided')
    return []
  }

  const legs = directionsRoute.legs
  if (!legs?.length) {
    console.warn('[Places] route has no legs')
    return []
  }

  // Build a flat list of all step start locations
  const allPoints = []
  for (const leg of legs) {
    for (const step of leg.steps || []) {
      const loc = step.start_location
      allPoints.push({ lat: loc.lat(), lng: loc.lng() })
    }
  }
  const lastLeg = legs[legs.length - 1]
  allPoints.push({ lat: lastLeg.end_location.lat(), lng: lastLeg.end_location.lng() })

  if (!allPoints.length) {
    console.warn('[Places] no step points found')
    return []
  }

  // Sample up to 6 evenly-spaced points
  const step = Math.max(1, Math.floor(allPoints.length / 6))
  const samplePoints = []
  for (let i = 0; i < allPoints.length; i += step) {
    samplePoints.push(allPoints[i])
    if (samplePoints.length >= 6) break
  }

  console.log(`[Places] searching "${query}" at ${samplePoints.length} points along route (${allPoints.length} total steps)`)

  const seen = new Set()
  const all = []

  for (const pt of samplePoints) {
    const places = await searchNearbyPlaces(query, pt.lat, pt.lng, 700)
    console.log(`[Places] got ${places.length} results at (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`)
    places.forEach((p) => {
      if (!seen.has(p.placeId)) {
        seen.add(p.placeId)
        all.push(p)
      }
    })
    await sleep(200)
  }

  return all
    .map((p) => ({ ...p, distToRoute: distToPoints(p.location.lat, p.location.lng, allPoints) }))
    .sort((a, b) => a.distToRoute - b.distToRoute)
    .slice(0, 5)
}

export function distanceMins(fromLat, fromLng, toLat, toLng) {
  if (!window.google?.maps?.geometry) return null
  const meters = window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(fromLat, fromLng),
    new window.google.maps.LatLng(toLat, toLng)
  )
  return Math.round(meters / 250)
}
