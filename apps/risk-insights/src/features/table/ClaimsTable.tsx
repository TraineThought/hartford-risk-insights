
import { useEffect, useMemo, useState, useRef } from 'react'
import Papa from 'papaparse'
import { useStore } from '../../lib/store'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

type Row = { id:string; date:string; product:string; state:string; county:string; amount:number; severity:string }

const normalizeCounty = (s:string) =>
  (s || '').trim().toLowerCase().replace(/ county$/i, '')

function applyFilters(rows:Row[], f:any) {
  return rows.filter(r => {
    if (f.product && f.product!=='All' && r.product!==f.product) return false
    if (f.severity && f.severity!=='All' && r.severity!==f.severity) return false
    if (f.start && r.date < f.start) return false
    if (f.end && r.date > f.end) return false
    if (f.county && f.county !== '' && normalizeCounty(r.county) !== f.county) return false
    return true
  })
}

export default function ClaimsTable() {
  const [rows, setRows] = useState<Row[]>([])
  const { filters } = useStore()

  useEffect(() => {
    Papa.parse('/claims.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res:any) => setRows((res.data as Row[]).filter(r => r && r.id))
    })
  }, [])

  const data = useMemo(() => applyFilters(rows, filters), [rows, filters])

  const columns: ColumnDef<Row>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Date', accessorKey: 'date' },
    { header: 'Product', accessorKey: 'product' },
    { header: 'State', accessorKey: 'state' },
    { header: 'County', accessorKey: 'county' },
    { header: 'Severity', accessorKey: 'severity' },
    { header: 'Amount', accessorKey: 'amount',
      cell: info => Number(info.getValue()).toLocaleString(undefined,{style:'currency',currency:'USD'}) }
  ]

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  const announceRef = useRef<HTMLDivElement | null>(null)

  function exportCSV() {
    // pick the columns / order you want in the file
    const rowsForCsv = data.map(r => ({
      id: r.id,
      date: r.date,
      product: r.product,
      state: r.state,
      county: r.county,
      severity: r.severity,
      amount: Number(r.amount) // plain number, not formatted with $
    }))

    // Build CSV using Papa
    const csv = Papa.unparse(rowsForCsv, { header: true })

    // UTF=8 BOM so Excel opens it cleanly
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=-utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0,10)
    a.href = url
    a.download = `claims_export_${date}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    // announce for a11y
    announceRef.current && (announceRef.current.textContent = `Downloaded ${rowsForCsv.length} rows as CSV`)
  }

  const parentRef = useState<HTMLDivElement | null>(null)[0] as any

  return (
    <section className="panel vstack" aria-labelledby="tbl-title">
     <div className="hstack" style={{justifyContent:'space-between', alignItems:'center'}}>
      <h2 id="tbl-title">Claims</h2>
      <button className="btn focus-ring" onClick={exportCSV}>
        Export current table (CSV)
        </button>
      </div>
      <div ref={parentRef} style={{maxHeight: 360, overflow: 'auto'}} role="region" aria-label="Claims table container">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-live="polite" className="badge" style={{marginTop:8}}>
        {data.length.toLocaleString()} rows
        </div>
      <div ref={announceRef} aria-live="polite" className="sr-only" />
    </section>
  )
}
