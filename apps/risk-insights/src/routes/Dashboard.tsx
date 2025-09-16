
import Filters from '../features/filters/Filters'
import Charts from '../features/charts/Charts'
import ClaimsTable from '../features/table/ClaimsTable'
import CtMap from '../features/map/CtMap'
import SavedViews from '../features/presets/SavedViews'

export default function Dashboard() {
  return (
    <main id="main" className="container vstack" aria-label="Hartford Risk Insights dashboard">
      <header className="hstack" style={{justifyContent:'space-between'}}>
        <h1>Hartford Risk Insights</h1>
        <div className="hstack" style={{gap:8}}>
          <button className="btn focus-ring" onClick={() => navigator.clipboard.writeText(window.location.href)}>
          Copy share link
          </button>
          <ThemeToggle />
        </div>
      </header>

      <Filters />

      <p className="muted" style={{ margin: '4px 0 12px'}}>
        <small>Updated: {new Date().toLocaleString()}</small>
      </p>

      <SavedViews />
      <Charts />
      <CtMap />
      <ClaimsTable />
      <footer className="muted" style={{marginTop: 12}}>Demo data only. Built for portfolio purposes.</footer>
    </main>
  )
}

function ThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark'
  const next = current === 'dark' ? 'light' : 'dark'
  return (
    <button className="btn focus-ring" onClick={() => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark'
      const nx = cur === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', nx)
      localStorage.setItem('theme', nx)
    }}>
      Toggle theme
    </button>
  )
}
