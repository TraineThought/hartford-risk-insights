import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import Papa from 'papaparse'
import { useStore } from '../../lib/store'

// ---- helpers ---------------------------------------------------
type Row = { id:string; date:string; product:string; state:string; county:string; amount:number; severity:string }

const getName = (p:any) => p?.NAME || p?.NAME10 || p?.County || p?.county || ''
const normalizeCounty = (s:string) => (s || '').trim().toLowerCase().replace(/ county$/i, '')
const titleCase = (s:string) => s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join('')

function useClaims() {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => {
    Papa.parse('/claims.csv', {
      download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: (res:any) => setRows((res.data as Row[]).filter(r => r && r.id))
    })
  }, [])
  return rows
}

function applyFilters(rows:Row[], f:any) {
  return rows.filter(r => {
    if (r.state !== 'CT') return false
    if (f.product && f.product !== 'All' && r.product !== f.product) return false
    if (f.severity && f.severity !== 'All' && r.severity !== f.severity) return false
    if (f.start && r.date < f.start) return false
    if (f.end && r.date > f.end) return false
    if (f.county && f.county !== '' && normalizeCounty(r.county) !== f.county) return false
    return true
  })
}

function colorFor(v:number, breaks:number[]) {
  const palette = ['#e8f0ff', '#b9d0ff', '#85aaff', '#587fff', '#294eff']
  let i = 0; while (i < breaks.length && v > breaks[i]) i++
  return palette[i]
}

// ---- component -------------------------------------------------
export default function CtMap() {
  const rows = useClaims()
  const { filters, setFilters } = useStore()

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters])

  const byCounty = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of filtered) {
      const k = normalizeCounty(r.county)
      m.set(k, (m.get(k) || 0) + Number(r.amount || 0))
    }
    return m
  }, [filtered])

  const breaks = useMemo(() => {
    const vals = Array.from(byCounty.values()).sort((a,b)=>a-b)
    if (!vals.length) return [0,0,0,0]
    const q = (p:number) => vals[Math.floor(p * (vals.length - 1))]
    return [q(0.2), q(0.4), q(0.6), q(0.8)]
  }, [byCounty])

  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.GeoJSON | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // init once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
    mapRef.current = map
    map.setView([41.6, -72.7], 8)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12 }).addTo(map)

    fetch('/ct-counties.geojson')   // ensure the filename matches your /public file
      .then(r => r.json())
      .then((geo:any) => {
        const styleFn = (feature:any): L.PathOptions => {
          const name = normalizeCounty(getName(feature.properties))
          const total = byCounty.get(name) || 0
          const selected = filters.county === name
          return { color: selected ? '#294eff' : '#1e2430', weight: selected ? 3 : 1, fillOpacity: 0.8, fillColor: colorFor(total, breaks) }
        }
        const onEach = (feature:any, layer:L.Layer) => {
          const name = normalizeCounty(getName(feature.properties || {}))
          const total = byCounty.get(name) || 0
          ;(layer as any).bindTooltip(`${titleCase(name) || 'Unknown'}: $${total.toLocaleString()}`)
          layer.on({
            click: () => {
              const cur = useStore.getState().filters.county
              setFilters({ county: cur === name ? '' : name })
            },
            mouseover: (e:any) => (e.target as L.Path).setStyle({ weight: 2 }),
            mouseout:  (e:any) => {
              const sel = filters.county === name
              ;(e.target as L.Path).setStyle({ weight: sel ? 3 : 1 })
            }
          })
        }
        layerRef.current = L.geoJSON(geo, { style: styleFn as any, onEachFeature: onEach }).addTo(map)
        try { map.fitBounds(layerRef.current.getBounds(), { padding:[10,10] }) } catch {}
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // <- only once

  // restyle + tooltips when filters/data change
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.setStyle((feature:any) => {
      const name = normalizeCounty(getName(feature.properties))
      const total = byCounty.get(name) || 0
      const selected = filters.county === name
      return { color: selected ? '#294eff' : '#1e2430', weight: selected ? 3 : 1, fillOpacity: 0.8, fillColor: colorFor(total, breaks) } as L.PathOptions
    })
    layer.eachLayer((l:any) => {
      const name = normalizeCounty(getName(l.feature?.properties || {}))
      const total = byCounty.get(name) || 0
      l.bindTooltip(`${titleCase(name) || 'Unknown'}: $${total.toLocaleString()}`)
    })
  }, [byCounty, breaks, filters.county])

  return (
    <section className="panel vstack" aria-labelledby="map-title">
      <div className="hstack" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 id="map-title">CT Counties (Choropleth)</h2>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Legend breaks={breaks} />
          {filters.county && (
            <button className="btn focus-ring" onClick={() => setFilters({ county: '' })}>
              Reset county
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{ height: 360, width: '100%', borderRadius: 8, overflow: 'hidden' }}
        role="region"
        aria-label="Connecticut county totals map"
      />
    </section>
  )
}

function Legend({ breaks }:{ breaks:number[] }) {
  const items = useMemo(() => {
    const stops = [0, ...breaks]
    const labels: string[] = []
    for (let i=0;i<stops.length;i++) {
      const from = stops[i]
      const to = i < breaks.length ? breaks[i] : undefined
      labels.push(`${from.toLocaleString()}${to!==undefined ? ' – ' + to.toLocaleString() : '+'}`)
    }
    return labels
  }, [breaks])
  return (
    <div className="hstack" aria-label="Legend">
      {items.map((label, i) => (
        <span key={i} className="badge" style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{display:'inline-block', width:14, height:14, background: colorFor(i===0?0:breaks[i-1]+0.01, breaks), borderRadius:3}} />
          {label}
        </span>
      ))}
    </div>
  )
}