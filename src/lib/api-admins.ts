import { api } from '@/lib/api'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'superadmin'
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface AdminCreateResponse {
  message: string
  id: string
  email: string
  role: string
  must_change_password: boolean
}

export const adminsApi = {
  list(): Promise<{ admins: AdminUser[] }> {
    return api.get<{ admins: AdminUser[] }>('/admin/admins')
  },

  create(email: string, fullName: string, password: string, role: 'admin' | 'superadmin'): Promise<AdminCreateResponse> {
    return api.post<AdminCreateResponse>('/admin/admins', {
      email,
      full_name: fullName,
      password,
      role,
    })
  },

  update(id: string, body: { email?: string; full_name?: string; role?: string }): Promise<{ message: string }> {
    return api.put<{ message: string }>(`/admin/admins/${id}`, body)
  },

  delete(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/admin/admins/${id}`)
  },

  resetPassword(id: string, newPassword: string): Promise<{ message: string; must_change_password: boolean }> {
    return api.post<{ message: string; must_change_password: boolean }>(`/admin/admins/${id}/reset-password`, {
      new_password: newPassword,
    })
  },

  updateMe(body: { full_name?: string; current_password?: string; new_password?: string }): Promise<{ message: string }> {
    return api.put<{ message: string }>('/admin/admins/me', body)
  },
}
