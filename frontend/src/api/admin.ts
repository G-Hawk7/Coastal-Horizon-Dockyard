import apiClient from './client';
import type {
  AdminOverviewStats,
  AdminSecuritySummary,
  AdminUserDetail,
  AuditLog,
  Berth,
  DockyardGroup,
  PaginatedUsersResponse,
  User,
  UserRole,
} from '../types';

export interface AdminUserListParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface AdminBerthListParams {
  search?: string;
  status?: string;
  owner?: string;
}

export interface AdminGroupListParams {
  search?: string;
  owner?: string;
}

export interface AdminAuditListParams {
  search?: string;
  action?: string;
  username?: string;
  ip_address?: string;
  limit?: number;
}

function cleanQuery(params?: object): Record<string, string | number> {
  if (!params) return {};
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value as string | number;
    }
  }
  return result;
}

async function downloadCsv(url: string, filename: string, params?: object): Promise<void> {
  const response = await apiClient.get<Blob>(url, {
    params: cleanQuery(params),
    responseType: 'blob',
  });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export const adminApi = {
  async getStats(): Promise<AdminOverviewStats> {
    const { data } = await apiClient.get<AdminOverviewStats>('/admin/stats');
    return data;
  },

  async getSecuritySummary(): Promise<AdminSecuritySummary> {
    const { data } = await apiClient.get<AdminSecuritySummary>('/admin/security');
    return data;
  },

  async listUsers(params?: AdminUserListParams): Promise<PaginatedUsersResponse> {
    const { data } = await apiClient.get<PaginatedUsersResponse>('/admin/users', {
      params: cleanQuery(params),
    });
    return data;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const { data } = await apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
    return data;
  },

  async banUser(userId: string, reason: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/admin/users/${userId}/ban`, { reason });
    return data;
  },

  async unbanUser(userId: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/admin/users/${userId}/unban`);
    return data;
  },

  async bulkBanUsers(
    userIds: string[],
    reason?: string
  ): Promise<{ updated: number; skipped: number }> {
    const { data } = await apiClient.post<{ updated: number; skipped: number }>(
      '/admin/users/bulk-ban',
      { user_ids: userIds, reason }
    );
    return data;
  },

  async bulkUnbanUsers(userIds: string[]): Promise<{ updated: number }> {
    const { data } = await apiClient.post<{ updated: number }>('/admin/users/bulk-unban', {
      user_ids: userIds,
    });
    return data;
  },

  async changeUserRole(userId: string, role: UserRole): Promise<User> {
    const { data } = await apiClient.patch<User>(`/admin/users/${userId}/role`, { role });
    return data;
  },

  async revokeUserSessions(userId: string): Promise<{ revoked: number }> {
    const { data } = await apiClient.post<{ revoked: number }>(
      `/admin/users/${userId}/revoke-sessions`
    );
    return data;
  },

  async listBerths(params?: AdminBerthListParams): Promise<Berth[]> {
    const { data } = await apiClient.get<Berth[]>('/admin/berths', {
      params: cleanQuery(params),
    });
    return data;
  },

  async deleteBerth(berthId: string): Promise<{ deleted: number }> {
    const { data } = await apiClient.delete<{ deleted: number }>(`/admin/berths/${berthId}`);
    return data;
  },

  async bulkDeleteBerths(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await apiClient.post<{ deleted: number }>('/admin/berths/bulk-delete', {
      ids,
    });
    return data;
  },

  async listGroups(params?: AdminGroupListParams): Promise<DockyardGroup[]> {
    const { data } = await apiClient.get<DockyardGroup[]>('/admin/groups', {
      params: cleanQuery(params),
    });
    return data;
  },

  async deleteGroup(groupId: string): Promise<{ deleted: number }> {
    const { data } = await apiClient.delete<{ deleted: number }>(`/admin/groups/${groupId}`);
    return data;
  },

  async bulkDeleteGroups(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await apiClient.post<{ deleted: number }>('/admin/groups/bulk-delete', {
      ids,
    });
    return data;
  },

  async listAuditLogs(params?: AdminAuditListParams): Promise<AuditLog[]> {
    const { data } = await apiClient.get<AuditLog[]>('/admin/audit-logs', {
      params: cleanQuery(params),
    });
    return data;
  },

  exportUsersCsv(params?: Omit<AdminUserListParams, 'page' | 'page_size'>): Promise<void> {
    return downloadCsv('/admin/export/users', 'users_export.csv', params);
  },

  exportBerthsCsv(params?: AdminBerthListParams): Promise<void> {
    return downloadCsv('/admin/export/berths', 'berths_export.csv', params);
  },

  exportAuditLogsCsv(params?: Omit<AdminAuditListParams, 'limit'>): Promise<void> {
    return downloadCsv('/admin/export/audit-logs', 'audit_logs_export.csv', params);
  },
};