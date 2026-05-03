import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader } from '@googlemaps/js-api-loader'
import { getProfile } from './hooks/useProfile'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import RoutesPage from './pages/Routes'
import Ride from './pages/Ride'
import Learn from './pages/Learn'
import Simulation from './pages/Simulation'

function RequireProfile({ children }) {
  const profile = getProfile()
  if (!profile) return <Navigate to="/onboarding" replace />
  return children
}

function RootRedirect() {
  return <Navigate to={getProfile() ? '/dashboard' : '/onboarding'} replace />
}

export default function App() {
  const [mapsReady, setMapsReady] = useState(false)
  const [mapsError, setMapsError] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setMapsReady(true)
      return
    }
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    })
    loader.load()
      .then(() => setMapsReady(true))
      .catch(() => { setMapsError(true); setMapsReady(true) })
  }, [])

  if (!mapsReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--orange)', fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.05em' }}>
          LOADING…
        </p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<RequireProfile><Dashboard /></RequireProfile>} />
        <Route path="/routes" element={<RequireProfile><RoutesPage /></RequireProfile>} />
        <Route path="/ride" element={<RequireProfile><Ride /></RequireProfile>} />
        <Route path="/learn" element={<RequireProfile><Learn /></RequireProfile>} />
        <Route path="/learn/simulation" element={<RequireProfile><Simulation /></RequireProfile>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
