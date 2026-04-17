export interface Visit {
  id: number
  company_name: string
  operators_count: number
  entry_date: string // ISO string
  exit_date: string | null
  status: 'active' | 'exited'
}