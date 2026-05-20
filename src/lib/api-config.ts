import { api } from '@/lib/api'

export interface ConfigEntry {
  key: string
  value: string
  description: string
  value_type: 'string' | 'int' | 'float' | 'bool' | 'duration'
  updated_at: string
  updated_by: string
}

export interface ConfigResponse {
  config: Record<string, ConfigEntry[]>
}

export interface ConfigAuditEntry {
  id: number
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
  reason: string
}

export interface ConfigAuditResponse {
  key: string
  audit: ConfigAuditEntry[]
}

export interface ConfigUpdateResponse {
  key: string
  value: string
  restart_warning?: string
}

export const configApi = {
  list(category?: string): Promise<ConfigResponse> {
    const query = category ? `?category=${encodeURIComponent(category)}` : ''
    return api.get<ConfigResponse>(`/admin/config${query}`)
  },

  audit(key: string, limit = 50): Promise<ConfigAuditResponse> {
    return api.get<ConfigAuditResponse>(`/admin/config/${encodeURIComponent(key)}/audit?limit=${limit}`)
  },

  update(key: string, value: string, reason: string): Promise<ConfigUpdateResponse> {
    return api.put<ConfigUpdateResponse>(`/admin/config/${encodeURIComponent(key)}`, { value, reason })
  },

  reload(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/admin/config/reload')
  },
}
