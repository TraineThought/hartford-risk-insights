import { useStore } from '../../lib/store'
import { useId } from 'react'

const CT_COUNTIES = [
  'Fairfield', 'Hartford', 'Litchfield', 'Middlesex',
  'New Haven', 'New London', 'Tolland', 'Windham'
];

export default function Filters() {
  const { filters, setFilters, reset } = useStore()
  const productId = useId()
  const severityId = useId()
  const startId = useId()
  const endId = useId()
  const countiesId = useId()
  return (
    <section className="panel vstack" aria-labelledby="filters-title">
      <h2 id="filters-title">Filters</h2>

    <div className="toolbar">
      {/* Product */}
      <div className="field">
        <label htmlFor={productId}>Product</label>
        <select
          id={productId}
          className="focus-ring"
          value={filters.product ?? 'All'}
          onChange={e => setFilters({ product: e.target.value as any })}
        >
          {['All','Auto','Home','Life','Health'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Severity */}
      <div className="field">
        <label htmlFor={severityId}>Severity</label>
        <select
          id={severityId}
          className="focus-ring"
          value={filters.severity ?? 'All'}
          onChange={e => setFilters({ severity: e.target.value as any })}
        >
          {['All','Low','Medium','High'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="field">
        <label>Date</label>
        <div className="hstack" style={{ gap: 8 }}>
          <input
            id={startId}
            type="date"
            className="input focus-ring"
            value={filters.start ?? ''}
            onChange={e => setFilters({ start: e.target.value })}
          />
          <input
            id={endId}
            type="date"
            className="input focus-ring"
            value={filters.end ?? ''}
            onChange={e => setFilters({ end: e.target.value })}
          />
        </div>
      </div>

      {/* Counties (full-width block with chips below) */}
      <div className="field field--grow">
        <label htmlFor={countiesId}>Counties</label>
        <select
          id={countiesId}
          multiple
          className="focus-ring"
          size={8}
          value={filters.counties ?? []}
          onChange={(e) => {
            const raw = Array.from(e.currentTarget.selectedOptions).map(o => o.value)
            const values = raw.map(v => v.trim().toLowerCase())
            setFilters({ counties: values, county: '' })
          }}
        >
          {CT_COUNTIES.map(c => (
            <option key={c} value={c.toLowerCase()}>{c}</option>
          ))}
        </select>

        {/* Selected county chips + Clear */}
        {Array.isArray(filters.counties) && filters.counties.length > 0 && (
          <div className="chips">
            {filters.counties.map(c => (
              <span key={c} className="chip" title={`County: ${c}`}>
                {c}
                <button
                  className="x focus-ring"
                  aria-label={`Remove ${c}`}
                  onClick={() =>
                    setFilters({ counties: filters.counties!.filter(x => x !== c) })
                  }
                >
                  ×
                </button>
              </span>
            ))}
            <button
              className="chip clear"
              type="button"
              onClick={() => setFilters({ counties: [] })}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Reset (kept simple) */}
      <div className="field">
        <label className="sr-only" htmlFor="reset">Reset</label>
        <button id="reset" className="btn focus-ring" onClick={reset}>Reset</button>
      </div>
    </div>

    <hr className="subtle" />
  </section>
  )
}
