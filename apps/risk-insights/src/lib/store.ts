import { create } from 'zustand'
import { Claim } from './types'

type Filters = {
  product?: Claim['product'] | 'All'
  severity?: Claim['severity'] | 'All'
  start?: string
  end?: string
  counties: string[]
  county?: string
}
type SavedView = { name: string; filters: Filters }

type UIFilters = {
  counties?: string[] | string;
  start?: string;
  end?: string;
  [key: string]: unknown;
};

type AppState = {
  filters: UIFilters;
};

type State = {
  filters: Filters
  setFilters: (f: Partial<Filters>) => void
  reset: () => void
  saved: SavedView[]
  saveView: (v: SavedView) => void
  removeView: (name: string) => void
}

const initialFromUrl = readFiltersFromUrl()

export const useStore = create<State>((set) => ({
  filters: {
    product: 'All',
    severity: 'All',
    start: '',
    end: '',
    counties: [],
    ...initialFromUrl,
  } as Filters,
  setFilters: (f) => set((s) => {
    const next = { ...s.filters, ...f } as Filters
    if (next.county && (!next.counties || next.counties.length === 0)) {
      next.counties = [next.county]
    }
    return { filters: next }
  }),
  reset: () => set({ filters: { counties: [] } }),
  saved: [],
  saveView: (v) => set((s) => ({ saved: [...s.saved.filter(x => x.name !== v.name), v] })),
  removeView: (name) => set((s) => ({ saved: s.saved.filter(x => x.name !== name) })),
}))

// Keep URL in sync with filters.
import qs from 'query-string'

// Read filters from ?query and return a Partial<Filters>
function readFiltersFromUrl(): Partial<Filters> {
  const q = qs.parse(window.location.search)
  const f: Partial<Filters> = {}

  if (typeof q.product === 'string')  f.product =   q.product as any
  if (typeof q.severity === 'string') f.severity =  q.severity as any

  if (typeof q.start === 'string') f.start = q.start
  if (typeof q.end === 'string')   f.end =   q.end

  // Multi-county. Expect "Hartford,Tolland" etc.
  if (typeof q.counties === 'string' && q.counties.trim() !== '') {
    f.counties = q.counties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // Legacy support: ?county=Hartford
  if (!f.counties && typeof q.county === 'string' && q.county.trim() !== '') {
    f.counties = [q.county.trim()]
  }

  return f
}


let prevFilters: UIFilters = useStore.getState().filters;

useStore.subscribe((state: AppState) => {
  const filters = state.filters;

  // prevent unnecessary URL updates
  if (JSON.stringify(filters) === JSON.stringify(prevFilters)) return;
  prevFilters = filters;

  const clean: Record<string, string> = {};

  if (Array.isArray(filters.counties) && filters.counties.length) {
    clean.counties = filters.counties.map((c: string) => c.trim()).join(',');
  }
  if (filters.start) clean.start = String(filters.start);
  if (filters.end)   clean.end   = String(filters.end);

  const search = qs.stringify(clean);
  const url = search ? `?${search}` : location.pathname;
  history.replaceState(null, '', url);
});



