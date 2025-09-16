import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store'
import { formatFilters, type FilterShape } from '../../lib/formatFilters'

type Filters = {
  product?: string
  severity?: string
  start?: string
  end?: string
  county?: string
}
type Preset = { id: string; name: string; filters: Filters }

const LS_KEY = 'risk.presets.v1'

function normalizePreset<T extends { filters: any }>(p: T): T {
  const f = { ...p.filters}
  if ((!Array.isArray(f.counties) || f.counties.length === 0) && f.county) {
    f.counties = [f.county]
  }
  delete f.county
  return { ...p, filters: f }
}

function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function savePresets(presets: Preset[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(presets))
}
function uid() { return Math.random().toString(36).slice(2, 10) }


// copies URL
function linkFor(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('view', id)
  return url.toString()
}

export default function SavedViews() {
  // no separate import of setFilters
  const { filters, setFilters } = useStore() as any

  const [presets, setPresets] = useState<Preset[]>(
    () => loadPresets().map(normalizePreset)
  )

  const [selectedId, setSelectedId] = useState<string>('')

  // keep localStorage in sync
  useEffect(() => { savePresets(presets) }, [presets])

  const applyPreset = (id: string) => {
    const p = presets.find(x => x.id === id)
    if (!p) return
    const np = normalizePreset(p)
    setSelectedId(id)
    setFilters({ ...np.filters })
  }

  const saveCurrent = () => {
    const name = prompt('Name this view ...', formatFilters(filters as FilterShape))
    if (!name) return
    const f = filters as any
    const toSave = {
      product: f.product,
      severity: f.severity,
      start: f.start,
      end:   f.end,
      counties: Array.isArray(f.counties)
        ? [...f.counties]
        : (f.county ? [f.county] : [])
    }
    const newPreset: Preset = { id: uid(), name, filters: { ...filters } }
    setPresets(prev => [newPreset, ...prev])
    setSelectedId(newPreset.id)
  }

  const renamePreset = (id: string) => {
    const p = presets.find(x => x.id === id)
    if (!p) return
    const name = prompt('Rename saved view:', p.name)
    if (!name) return
    setPresets(prev => prev.map(x => x.id === id ? { ...x, name } : x))
  }

  const deletePreset = (id: string) => {
    if (!confirm('Delete this saved view?')) return
    setPresets(prev => prev.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId('')
  }

  // after state hooks
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('view')
    if (!id) return
    const p = presets.find(x => x.id === id)
    if (p) { setSelectedId(id); setFilters({ ...p.filters }) }
  }, []) // run once on load

  return (
    <section className="panel vstack" aria-labelledby="presets-title">
      <div className="hstack" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 id="presets-title">Saved Views</h2>
        <button className="btn primary focus-ring" onClick={saveCurrent}>
          Save current filters
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="empty" style={{ minHeight: 80 }}>
          <div>No saved views yet. Use “Save current filters”.</div>
        </div>
      ) : (
        <>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          {presets.map(p => {
            const active = selectedId === p.id
            const label = p.name || formatFilters(p.filters as FilterShape)
            return (
              <button
              key={p.id}
              className="badge focus-ring"
              onClick={() => { setSelectedId(p.id); setFilters({ ...p.filters }) }}
              title={label}
              aria-label={label}
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                boxShadow: active ? '0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)' : undefined,
              }}
            >
              {label}
              </button>
            )
          })}
        </div>

          {/* Actions for the selected chip */}
          {selectedId && (
            <div className="hstack" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn focus-ring" onClick={() => renamePreset(selectedId)}>Rename</button>
              <button className="btn focus-ring" onClick={() => deletePreset(selectedId)}>Delete</button>
              <button
                className="btn focus-ring"
                onClick={() => navigator.clipboard.writeText(linkFor(selectedId))}
              >
              Copy link
              </button>
            </div>
          )}
        </>
      )}

      <div className="badge" style={{ marginTop: 8 }}>
        Current: {formatFilters(filters as FilterShape)}
      </div>
    </section>
  )
}