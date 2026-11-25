export type BerthStatus = 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserSession {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_revoked: boolean;
  expires_at: string;
  created_at?: string | null;
  last_used_at?: string | null;
  is_current: boolean;
}

export interface Berth {
  id: string;
  berth_number: string;
  max_length_meters: number;
  max_draft_meters: number;
  status: BerthStatus;
  owner_id?: string | null;
  owner_username?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  assigned_to_id?: string | null;
  assigned_to_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BerthCreatePayload {
  berth_number: string;
  max_length_meters: number;
  max_draft_meters: number;
  status: BerthStatus;
  group_id?: string | null;
  assigned_to_id?: string | null;
}

export interface BerthUpdatePayload {
  berth_number?: string;
  max_length_meters?: number;
  max_draft_meters?: number;
  status?: BerthStatus;
}

export interface GroupMember {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  can_create: boolean;
  can_update: boolean;
  can_assign: boolean;
  created_at?: string | null;
}

export interface GroupPermissions {
  is_owner: boolean;
  can_create: boolean;
  can_update: boolean;
  can_assign: boolean;
  can_manage_members: boolean;
  can_delete_group: boolean;
}

export interface DockyardGroup {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  owner_username: string;
  member_count: number;
  members: GroupMember[];
  my_permissions: GroupPermissions;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  username?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

export interface AdminOverviewStats {
  total_users: number;
  banned_users: number;
  total_berths: number;
  total_groups: number;
  new_users_7d: number;
  new_berths_7d: number;
  new_groups_7d: number;
  failed_logins_7d: number;
}

export interface PaginatedUsersResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUserDetail {
  user: User;
  berths: Berth[];
  groups: DockyardGroup[];
  sessions: UserSession[];
  recent_activity: AuditLog[];
}

export interface SecurityFailedLoginItem {
  key: string;
  count: number;
  last_attempt?: string | null;
}

export interface AdminSecuritySummary {
  failed_by_ip: SecurityFailedLoginItem[];
  failed_by_account: SecurityFailedLoginItem[];
  recent_failed_logs: AuditLog[];
}