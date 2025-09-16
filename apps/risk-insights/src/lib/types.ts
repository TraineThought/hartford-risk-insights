
export type Claim = {
  id: string
  date: string // ISO
  product: 'Auto' | 'Home' | 'Life' | 'Health'
  state: string
  county: string
  amount: number
  severity: 'Low' | 'Medium' | 'High'
}
