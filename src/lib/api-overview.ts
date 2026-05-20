import { api } from '@/lib/api'

export interface StatValue {
  value: number
  yesterday: number
}

export interface ModelUsage {
  model: string
  provider: string
  requests: number
}

export interface OverviewResponse {
  stats: {
    users_registered_today: StatValue
    users_verified_today: StatValue
    tokens_purchased_today: StatValue
    orders_completed_today: StatValue
    tokens_granted_today: StatValue
    assessments_submitted_today: StatValue
    revenue_today_idr: StatValue
    ai_costs_today_usd: StatValue
    independent_users_total: number
    independent_assessments_total: number
  }
  models: {
    analysis_current: string
    chat_current: string
    used_today: ModelUsage[]
  }
}

export type TimeseriesMetric =
  | 'users_registered'
  | 'users_verified'
  | 'tokens_purchased'
  | 'orders_completed'
  | 'assessments_submitted'
  | 'revenue'
  | 'ai_costs'

export type TimeseriesRange = 'today' | '7d' | '30d' | '12mo'

export interface TimeseriesDataPoint {
  t: string
  v: number
}

export interface TimeseriesResponse {
  metric: string
  range: string
  data: TimeseriesDataPoint[]
}

export interface SchoolRankItem {
  school_id: string
  school_name: string
  count: number
}

export interface SchoolsResponse {
  by_assessments: SchoolRankItem[]
  by_users: SchoolRankItem[]
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
}

export const overviewApi = {
  stats(): Promise<OverviewResponse> {
    return api.get<OverviewResponse>('/admin/overview')
  },

  timeseries(metric: TimeseriesMetric, range: TimeseriesRange): Promise<TimeseriesResponse> {
    const query = buildQuery({ metric, range })
    return api.get<TimeseriesResponse>(`/admin/overview/timeseries${query}`)
  },

  schools(): Promise<SchoolsResponse> {
    return api.get<SchoolsResponse>('/admin/overview/schools')
  },
}
