import { useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'
import { exportNodeToPng } from '../../lib/exportImage'
import { useStore } from '../../lib/store'
import { exportDashboardPdf } from '../../lib/exportReport'
import { formatFilters } from '../../lib/formatFilters'
import Papa from 'papaparse'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts'

type Row = { id:string; date:string; product:string; state:string; county:string; amount:number; severity:string }

function useData() {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => {
    Papa.parse('/claims.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res:any) => setRows(res.data as Row[])
    })
  }, [])
  return rows
}

const fmtNumber = (n:number) => Number(n ?? 0).toLocaleString()
const fmtMoney = (n:number) =>
  Number(n ?? 0).toLocaleString(undefined, { style:'currency', currency:'USD', maximumFractionDigits:0 })

const normalizeCounty = (s:string) =>
  (s || '').trim().toLowerCase().replace(/ county$/i, '')

function applyFilters(rows:Row[], f:any) {
  return rows.filter(r => {
    if (f.product && f.product!=='All' && r.product!==f.product) return false
    if (f.severity && f.severity!=='All' && r.severity!==f.severity) return false
    if (f.start && r.date < f.start) return false
    if (f.end && r.date > f.end) return false

    // Multi-county support
    if (Array.isArray(f.counties) && f.counties.length > 0) {
      if (!f.counties.includes(normalizeCounty(r.county))) return false
    }

    // Legacy single-county (keeps old saved views working)
    if ((!f.counties || f.counties.length === 0) && f.county) {
      if (normalizeCounty(r.county) !== f.county) return false;
    }
    return true
  })
}

function summarizeFilters(f: any) {
  const parts: string[] = []

  // Product / Severtiy
  if (f?.product && f.product !== 'All') parts.push(`Product: ${f.product}`)
  if (f?.severity && f.severity !== 'All') parts.push(`Severity: ${f.severity}`)

  // Counties + legacy single county fallback
  const titleCase = (s: string) =>
    s.replace(/\b\w/g, c => c.toUpperCase())

  if (Array.isArray(f.counties) && f.counties.length > 0) {
    const shown = f.counties.slice(0, 3).map(titleCase)
    const rest = f.counties.length - shown.length
    parts.push(`Counties: ${shown.join(', ')}${rest > 0 ? ` +${rest} more` : ''}`)
  } else if (f.county) {
    parts.push(`County: ${titleCase(f.county)}`)
  }

  // Date range
  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '...'
  if (f.start || f.end) parts.push(`Date: ${fmtDate(f.start)} - ${fmtDate(f.end)}`)

  return parts.join(' • ') || 'All data'
}

export default function Charts() {
  const rows = useData()
  const { filters, setFilters, reset } = useStore() as any
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters])

  // Time series by date (sum amount)
  const byDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of filtered) {
      if (!r?.date) continue
      const d = String(r.date).slice(0, 10) // normalize YYYY-MM-DD
      map.set(d, (map.get(d) || 0) + Number(r.amount || 0))
    }
    return Array.from(map, ([date, total]) => ({ date, total }))
    .sort((a,b) => (a.date || '').localeCompare(b.date || ''))
  }, [filtered])

  // By product bar
  const byProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of filtered) {
      map.set(r.product, (map.get(r.product) || 0) + Number(r.amount||0))
    }
    return Array.from(map, ([product, total]) => ({ product, total }))
  }, [filtered])

  // By severity stacked
  const bySeverity = useMemo(() => {
    const map = new Map<string, {Low:number; Medium:number; High:number}>()
    for (const r of filtered) {
      const entry = map.get(r.product) || {Low:0, Medium:0, High:0}
      entry[r.severity as 'Low'|'Medium'|'High'] += Number(r.amount||0)
      map.set(r.product, entry)
    }
    return Array.from(map, ([product, values]) => ({ product, ...values }))
  }, [filtered])

  const isLoading = rows.length === 0
  const isEmpty = !isLoading && filtered.length === 0

  const tsRef = useRef<HTMLDivElement>(null)
  const prodRef = useRef<HTMLDivElement>(null)
  const sevRef = useRef<HTMLDivElement>(null)

  const filterSummary = useMemo(() => formatFilters(filters), [filters])

  return (
    <section className="grid" aria-label="Charts">

    {/* Download full dashboard report */}
      <figure className="card">
        <div className="card__head">
        <figcaption>Download Full Dashboard</figcaption>
        <div className="card__actions">
      <button
        className="link icon"
        onClick={() =>
          exportDashboardPdf({
            title: 'Hartford Risk Insights - Dashboard Report',
            filtersSummary: filterSummary,
            charts: [
              { title: 'Total Amount Over Time',    node: tsRef.current },
              { title: 'Totals by Product',         node: prodRef.current },
              { title: 'Severity Mix by Product',   node: sevRef.current },
            ],
          })
        }
        disabled={isLoading || isEmpty}
        title="Download PDF"
      >
        <span className="i">📄</span> PDF
      </button>
    </div>
  </div>

  <div className="card__body" style={{ textAlign: 'center', padding: '20px 0' }}></div>
</figure>

    <figure className="card" aria-labelledby="ts-title">
      <div className="card__head">
      <figcaption id="ts-title">Total Amount Over Time</figcaption>
        <div className="card__actions">
          {/* Download PNG Button */}
          <button
            className="link icon"
            onClick={() => exportNodeToPng(tsRef.current, 'total-over-time.png')}
            disabled={isLoading || isEmpty}
            title="Download PNG"
          >
            <span className="i">🖼️</span> PNG
          </button>
          <button className="link icon" onClick={() => {
            const el = document.querySelector('#ts-table') as HTMLDetailsElement | null
            if (el) el.open = !el.open
          }}
            title="Toggle table"
         >
          <span className="i">📄</span> Table
          </button>
        </div>
      </div>

    {/* Time series */}
    <div ref={tsRef} className="card__body" style={{ height: 240 }}>
      {isLoading ? (
        // loading skeleton
        <div className="skeleton" style={{ height: '100%', width: '100%' }} />
      ) : isEmpty ? (
        // empty state
        <div className="empty">
         <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
          No data matches these filters
        </div>
        <div style={{ marginBottom: 10 }}>
          Try adjusting Product, Severity, Date, or County.
        </div>
        <button className="btn focus-ring" onClick={reset}>
          Clear filters
        </button>
      </div>
    </div>
  ) : (
    // chart
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={byDate}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => fmtNumber(v as number)}
        />
        <Tooltip formatter={(v: any) => fmtNumber(v as number)} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#8884d8"
          fillOpacity={0.3}
          fill="#8884d8"
        />
      </AreaChart>
    </ResponsiveContainer>
  )}
</div>

<details id="ts-table">
  <summary>View as table</summary>
  <table className="table">
    <thead>
      <tr><th>Date</th><th>Total</th></tr>
    </thead>
    <tbody>
      {byDate.map((r) => (
        <tr key={r.date}>
          <td>{r.date}</td>
          <td>{fmtMoney(r.total)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</details>
</figure>

      <figure className="card" aria-labelledby="prod-title">
        <div className="card__head">
          <figcaption id="prod-title">Totals by Product</figcaption>
          <div className="card__actions">
            <button className="link icon" onClick={() => exportNodeToPng(prodRef.current, 'totals-by-product.png')}
              disabled={isLoading || isEmpty}
              title="Download PNG"
            >
              <span className="i">🖼️</span> PNG
            </button>
            <button className="link icon" onClick={() => {
              const el = document.querySelector('#prod-table') as HTMLDetailsElement | null
              if (el) el.open = !el.open
            }}
            title="Toggle table"
          >
            <span className="i">📄</span> Table
            </button>
          </div>
        </div>

        {/*Total by Products*/}
        <div ref={prodRef} className="card__body" style={{height: 240}}>
          {isLoading ? (
            <div className="skeleton" style={{height: '100%', width: '100%'}} />
          ) : isEmpty ? (
            <div className="empty">
              <div>
                <div style={{fontWeight:600, marginBottom:6}}>No data matches these filters</div>
                <div style={{marginBottom:10}}>Try adjusting Product, Severity, Date, or County.</div>
                <button className="btn focus-ring" onClick={reset}>Clear filters</button>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} tickFormatter={(v)=>fmtNumber(v as number)} />
              <Tooltip formatter={(v:any)=>fmtMoney(v as number)} />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        <details id="prod-table">
          <summary>View as table</summary>
          <table className="table">
            <thead><tr><th>Product</th><th>Total</th></tr></thead>
            <tbody>
              {byProduct.map(r => (
                <tr key={r.product}>
                <td>{r.product}</td>
                <td>{fmtMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>

      <figure className="card" aria-labelledby="sev-title">
        <div className="card__head">
          <figcaption id="sev-title">Severity Mix by Product</figcaption>
          <div className="card__actions">
            <button
              className="link icon"
              onClick={() => exportNodeToPng(sevRef.current, 'severity-mix-by-product.png')}
              disabled={isLoading || isEmpty}
              title="Download PNG"
            >
              <span className="i">🖼️</span> PNG
            </button>
            <button className="link icon" onClick={() => {
              const el = document.querySelector('#sev-table') as HTMLDetailsElement | null
              if (el) el.open = !el.open
            }}
            title="Toggle table"
            >
              <span className="i">📄</span> Table
            </button>
          </div>
        </div>

      {/* Severity mix by Product */}
      <div ref={sevRef} className="card__body" style={{ height: 240 }}>
        {isLoading ? (
      <div className="skeleton" style={{ height: '100%', width: '100%' }} />
    ) : isEmpty ? (
      <div className="empty">
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            No data matches these filters
          </div>
          <div style={{ marginBottom: 10 }}>
            Try adjusting Product, Severity, Date, or County.
          </div>
          <button className="btn focus-ring" onClick={reset}>
            Clear filters
          </button>
        </div>
      </div>
    ) : (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bySeverity}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="product" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v)=>fmtNumber(v as number)}
          />
          <Tooltip formatter={(v:any)=> fmtMoney(v as number)} />
          <Legend />
          {/* stacked by severity */}
          <Bar dataKey="Low"    stackId="s" fill="#9ec5fe" />
          <Bar dataKey="Medium" stackId="s" fill="#6ea0ff" />
          <Bar dataKey="High"   stackId="s" fill="#294eff" />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>

  <details id="sev-table">
    <summary>View as table</summary>
    <table className="table">
      <thead>
        <tr><th>Product</th><th>Low</th><th>Medium</th><th>High</th></tr>
      </thead>
      <tbody>
        {bySeverity.map((r) => (
          <tr key={r.product}>
            <td>{r.product}</td>
            <td>{fmtMoney(r.Low)}</td>
            <td>{fmtMoney(r.Medium)}</td>
            <td>{fmtMoney(r.High)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </details>
 </figure>
</section>
);
}
