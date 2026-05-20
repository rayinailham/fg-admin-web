import { api } from '@/lib/api'

export interface AbTestListItem {
  id: string
  assessment_id: string
  admin_id: string
  admin_email: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  prompt_key: string
  version_a: number
  version_b: number
  winner?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface AbTestListResponse {
  tests: AbTestListItem[]
  next_cursor?: string
}

export interface AbTestUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  latency_ms: number
  estimated_cost_usd: number
}

export interface AbTestDetail {
  id: string
  assessment_id: string
  admin_id: string
  admin_email: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  prompt_key: string
  version_a: number
  version_b: number
  prompt_a_content: string
  prompt_b_content: string
  result_a: Record<string, unknown> | null
  result_b: Record<string, unknown> | null
  usage_a: AbTestUsage | null
  usage_b: AbTestUsage | null
  winner?: string
  notes?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface AbTestCreateResponse {
  id: string
  status: string
  message: string
}

export interface AbTestListFilters {
  status?: string
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
}

export const abTestsApi = {
  list(filters: AbTestListFilters, cursor?: string, limit = 20): Promise<AbTestListResponse> {
    const query = buildQuery({ ...filters, cursor, limit: String(limit) })
    return api.get<AbTestListResponse>(`/admin/ab-tests${query}`)
  },

  detail(id: string): Promise<AbTestDetail> {
    return api.get<AbTestDetail>(`/admin/ab-tests/${id}`)
  },

  create(assessmentId: string, templateKey: string, versionA: number, versionB: number): Promise<AbTestCreateResponse> {
    return api.post<AbTestCreateResponse>('/admin/ab-tests', {
      assessment_id: assessmentId,
      template_key: templateKey,
      version_a: versionA,
      version_b: versionB,
    })
  },

  verdict(id: string, winner: 'a' | 'b' | 'tie', notes?: string): Promise<{ message: string; winner: string }> {
    return api.put<{ message: string; winner: string }>(`/admin/ab-tests/${id}/verdict`, {
      winner,
      notes,
    })
  },
}
