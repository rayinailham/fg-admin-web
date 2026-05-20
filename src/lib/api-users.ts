import { api } from '@/lib/api'

export interface UserListItem {
  id: string
  full_name: string
  email: string
  school_name: string | null
  registered_at: string
  email_verified: boolean
  suspended: boolean
  token_balance: number
  assessment_count: number
  last_assessment_at: string | null
}

export interface UserListResponse {
  users: UserListItem[]
  next_cursor?: string
}

export interface UserListFilters {
  name?: string
  email?: string
  school_id?: string
  registered_from?: string
  registered_to?: string
  verified?: string
  suspended?: string
  provider?: string
}

export interface UserDetail {
  user: {
    id: string
    full_name: string
    email: string
    school_id: string | null
    school_name: string | null
    grade: string | null
    major: string | null
    birthdate: string | null
    email_verified: boolean
    suspended: boolean
    provider: string
    token_balance: number
    created_at: string
    updated_at: string
  }
  stats: {
    assessments_total: number
    assessments_completed: number
    tokens_purchased_lifetime: number
    tokens_granted_lifetime: number
    chat_sessions_count: number
    last_active_at: string | null
  }
  assessments: {
    id: string
    status: string
    submitted_at: string
    completed_at?: string
    model_used?: string | null
  }[]
  chat_sessions: {
    id: string
    assessment_id: string
    title: string | null
    model_used: string
    message_count: number
    last_message_at?: string | null
  }[]
  recent_transactions: {
    id: string
    amount: number
    transaction_type: string
    description: string
    reference_id?: string
    balance_after: number
    created_at: string
  }[]
}

export interface TransactionListResponse {
  transactions: UserDetail['recent_transactions']
  next_cursor?: string
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
}

export const usersApi = {
  list(filters: UserListFilters, cursor?: string, limit = 20): Promise<UserListResponse> {
    const query = buildQuery({ ...filters, cursor, limit: String(limit) })
    return api.get<UserListResponse>(`/admin/users${query}`)
  },

  detail(id: string): Promise<UserDetail> {
    return api.get<UserDetail>(`/admin/users/${id}`)
  },

  transactions(id: string, cursor?: string, type?: string): Promise<TransactionListResponse> {
    const query = buildQuery({ cursor, type, limit: '20' })
    return api.get<TransactionListResponse>(`/admin/users/${id}/transactions${query}`)
  },

  update(id: string, body: Record<string, unknown>): Promise<{ message: string }> {
    return api.put<{ message: string }>(`/admin/users/${id}`, body)
  },

  verifyEmail(id: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/verify-email`)
  },

  suspend(id: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/suspend`)
  },

  unsuspend(id: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/unsuspend`)
  },

  revokeSessions(id: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/revoke-sessions`)
  },

  resetPassword(id: string, password?: string): Promise<{ message: string; temporary_password: string; sessions_revoked: boolean }> {
    return api.post(`/admin/users/${id}/reset-password`, password ? { password } : undefined)
  },

  grantTokens(id: string, amount: number, reason: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/grant-tokens`, { amount, reason })
  },

  deductTokens(id: string, amount: number, reason: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/admin/users/${id}/deduct-tokens`, { amount, reason })
  },
}
