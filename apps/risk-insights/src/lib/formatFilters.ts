export type FilterShape = {
  product?: string
  severity?: string
  start?: string
  end?: string
  county?: string
  counties?: string[]
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'

function formatList(items: string[], max = 3) {
  const clean = (items || []).filter(Boolean)
  if (clean.length <= max) return clean.join(', ')
  const head = clean.slice(0, max).join(', ')
  return `${head} +${clean.length - max} more`
}

export function formatFilters(f: FilterShape = {}) {
  const parts: string[] = []

  parts.push(`Product: ${f.product && f.product !== 'All' ? f.product : 'All'}`)
  parts.push(`Severity: ${f.severity && f.severity !== 'All' ? f.severity : 'All'}`)

  if (f.start || f.end) {
    parts.push(`Date: ${fmtDate(f.start)} - ${fmtDate(f.end)}`)
  }

  // Multi-county support
  if (f.counties && f.counties.length > 0) {
    parts.push(`Counties: ${formatList(f.counties)}`)
  } else if (f.county) {
    parts.push(`County: ${f.county}`)
  }

  return parts.join(' • ')
}