import { api } from '@/lib/api'

export interface PromptListItem {
  id: string
  template_key: string
  name: string
  description: string
  version: number
  is_active: boolean
  cache_type: 'cached' | 'per_request'
  variables: string[]
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface PromptDetail extends PromptListItem {
  content: string
}

export interface PromptVersion {
  id: string
  template_id: string
  template_key: string
  content: string
  variables: string[]
  version: number
  changed_by: string | null
  change_reason: string
  created_at: string
}

export interface PromptVersionsResponse {
  template_key: string
  current_version: number
  versions: PromptVersion[]
}

export interface PromptUpdateResponse {
  message: string
  template_key: string
  version: number
  cache_type: string
  cache_warning?: string
  variable_warnings?: string[]
}

export interface PromptRevertResponse {
  message: string
  template_key: string
  version: number
  reverted_from_version: number
  cache_warning?: string
}

export interface PromptToggleResponse {
  message: string
  template_key: string
  is_active: boolean
}

export const promptsApi = {
  list(): Promise<{ templates: PromptListItem[] }> {
    return api.get<{ templates: PromptListItem[] }>('/admin/prompts')
  },

  detail(id: string): Promise<PromptDetail> {
    return api.get<PromptDetail>(`/admin/prompts/${id}`)
  },

  versions(id: string, limit = 10): Promise<PromptVersionsResponse> {
    return api.get<PromptVersionsResponse>(`/admin/prompts/${id}/versions?limit=${limit}`)
  },

  update(id: string, content: string, variables: string[], changeReason: string): Promise<PromptUpdateResponse> {
    return api.put<PromptUpdateResponse>(`/admin/prompts/${id}`, {
      content,
      variables: variables.map(name => ({ name })),
      change_reason: changeReason,
    })
  },

  revert(id: string, targetVersion: number, reason: string): Promise<PromptRevertResponse> {
    return api.post<PromptRevertResponse>(`/admin/prompts/${id}/revert`, {
      target_version: targetVersion,
      reason,
    })
  },

  toggle(id: string, isActive: boolean): Promise<PromptToggleResponse> {
    return api.post<PromptToggleResponse>(`/admin/prompts/${id}/toggle`, {
      is_active: isActive,
    })
  },
}
