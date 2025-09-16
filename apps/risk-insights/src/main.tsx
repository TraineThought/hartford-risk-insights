import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import Dashboard from './routes/Dashboard'

import qs from 'query-string'
import { useStore } from './lib/store'
import 'leaflet/dist/leaflet.css'

// Router
const router = createBrowserRouter([{ path: '/', element: <Dashboard /> }])

// Theme boot
function ThemeBoot() {
  useEffect(() => {
    const saved =
      localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark')
    document.documentElement.setAttribute('data-theme', saved)
  }, [])
  return null
}

// URL boot (hydrate filters from the query string once)
function UrlBoot() {
  useEffect(() => {
    const parsed = qs.parse(window.location.search)
    const asFilters: Record<string, string> = {}
    if (parsed.product) asFilters.product = String(parsed.product)
    if (parsed.severity) asFilters.severity = String(parsed.severity)
    if (parsed.start) asFilters.start = String(parsed.start)
    if (parsed.end) asFilters.end = String(parsed.end)

    if (Object.keys(asFilters).length) {
      useStore.getState().setFilters(asFilters)
    }
  }, [])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a href="#main" className="skip-link">
      Skip to main content
    </a>
    <ThemeBoot />
    <UrlBoot />
    <RouterProvider router={router} />
  </StrictMode>
)