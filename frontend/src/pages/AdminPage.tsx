import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { adminApi } from '../api/admin';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  AdminOverviewStats,
  AdminSecuritySummary,
  AdminUserDetail,
  AuditLog,
  Berth,
  BerthStatus,
  DockyardGroup,
  User,
  UserRole,
} from '../types';

type AdminTab = 'overview' | 'users' | 'moderation' | 'audit';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function berthStatusClass(status: BerthStatus): string {
  if (status === 'AVAILABLE') return 'badge badge-available';
  if (status === 'OCCUPIED') return 'badge badge-occupied';
  return 'badge badge-maintenance';
}

export default function AdminPage() {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Overview & Security
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [security, setSecurity] = useState<AdminSecuritySummary | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Users tab
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // User Detail Modal
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);

  // Ban Modal (single or bulk)
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [bulkBanModalOpen, setBulkBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Moderation tab (Berths & Groups)
  const [adminBerths, setAdminBerths] = useState<Berth[]>([]);
  const [berthSearch, setBerthSearch] = useState('');
  const [berthStatusFilter, setBerthStatusFilter] = useState('');
  const [berthOwnerFilter, setBerthOwnerFilter] = useState('');
  const [selectedBerthIds, setSelectedBerthIds] = useState<string[]>([]);

  const [adminGroups, setAdminGroups] = useState<DockyardGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupOwnerFilter, setGroupOwnerFilter] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);

  // Audit Logs tab
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditUsernameFilter, setAuditUsernameFilter] = useState('');
  const [auditIpFilter, setAuditIpFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // ---------- Loaders ----------

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setError(null);
    try {
      const [statsData, secData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSecuritySummary(),
      ]);
      setStats(statsData);
      setSecurity(secData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load admin overview statistics.'));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({
        search: userSearch.trim() || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        page: userPage,
        page_size: userPageSize,
      });
      setUsers(res.items);
      setUsersTotal(res.total);
      setSelectedUserIds([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users.'));
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter, userPage]);

  const loadModeration = useCallback(async () => {
    setModerationLoading(true);
    setError(null);
    try {
      const [berthData, groupData] = await Promise.all([
        adminApi.listBerths({
          search: berthSearch.trim() || undefined,
          status: berthStatusFilter || undefined,
          owner: berthOwnerFilter.trim() || undefined,
        }),
        adminApi.listGroups({
          search: groupSearch.trim() || undefined,
          owner: groupOwnerFilter.trim() || undefined,
        }),
      ]);
      setAdminBerths(berthData);
      setAdminGroups(groupData);
      setSelectedBerthIds([]);
      setSelectedGroupIds([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load moderation records.'));
    } finally {
      setModerationLoading(false);
    }
  }, [berthSearch, berthStatusFilter, berthOwnerFilter, groupSearch, groupOwnerFilter]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setError(null);
    try {
      const logs = await adminApi.listAuditLogs({
        search: auditSearch.trim() || undefined,
        action: auditActionFilter || undefined,
        username: auditUsernameFilter.trim() || undefined,
        ip_address: auditIpFilter.trim() || undefined,
        limit: 200,
      });
      setAuditLogs(logs);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load audit logs.'));
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch, auditActionFilter, auditUsernameFilter, auditIpFilter]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'moderation') {
      loadModeration();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadOverview, loadUsers, loadModeration, loadAuditLogs]);

  const refreshActiveTab = () => {
    setNotice(null);
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'moderation') loadModeration();
    else loadAuditLogs();
  };

  // ---------- User Actions ----------

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await adminApi.getUserDetail(userId);
      setUserDetail(detail);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openSingleBanModal = (target: User) => {
    setBanTargetUser(target);
    setBulkBanModalOpen(false);
    setBanReason('');
  };

  const openBulkBanModal = () => {
    setBanTargetUser(null);
    setBulkBanModalOpen(true);
    setBanReason('');
  };

  const handleConfirmBan = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (banTargetUser && banReason.trim().length < 3) {
      setError('Please enter a ban reason of at least 3 characters.');
      return;
    }

    setBanSubmitting(true);
    try {
      if (banTargetUser) {
        await adminApi.banUser(banTargetUser.id, banReason.trim());
        setNotice(`Banned user @${banTargetUser.username} and revoked active sessions.`);
        setBanTargetUser(null);
      } else if (bulkBanModalOpen) {
        const res = await adminApi.bulkBanUsers(
          selectedUserIds,
          banReason.trim() || 'Bulk administrative ban'
        );
        setNotice(
          `Bulk ban complete: ${res.updated} banned, ${res.skipped} protected account(s) skipped.`
        );
        setBulkBanModalOpen(false);
      }
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to ban user(s).'));
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleUnbanUser = async (target: User) => {
    setError(null);
    setNotice(null);
    try {
      await adminApi.unbanUser(target.id);
      setNotice(`Unbanned user @${target.username}.`);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to unban user.'));
    }
  };

  const handleBulkUnban = async () => {
    if (selectedUserIds.length === 0) return;
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.bulkUnbanUsers(selectedUserIds);
      setNotice(`Unbanned ${res.updated} user(s).`);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to bulk unban users.'));
    }
  };

  const handleChangeRole = async (target: User, newRole: UserRole) => {
    if (
      !window.confirm(
        `Change role for @${target.username} from "${target.role}" to "${newRole}"?`
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await adminApi.changeUserRole(target.id, newRole);
      setNotice(`Updated @${target.username} role to ${newRole.toUpperCase()}.`);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update role.'));
    }
  };

  const handleRevokeAllSessions = async (target: User) => {
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.revokeUserSessions(target.id);
      setNotice(`Revoked ${res.revoked} active session(s) for @${target.username}.`);
      if (userDetail && userDetail.user.id === target.id) {
        await openUserDetail(target.id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to revoke user sessions.'));
    }
  };

  // ---------- Moderation Actions ----------

  const toggleBerthSelection = (id: string) => {
    setSelectedBerthIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleGroupSelection = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteBerth = async (berth: Berth) => {
    if (!window.confirm(`Permanently delete berth "${berth.berth_number}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      await adminApi.deleteBerth(berth.id);
      setNotice(`Deleted berth ${berth.berth_number}.`);
      await loadModeration();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete berth.'));
    }
  };

  const handleBulkDeleteBerths = async () => {
    if (selectedBerthIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedBerthIds.length} selected berth(s)?`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.bulkDeleteBerths(selectedBerthIds);
      setNotice(`Deleted ${res.deleted} berth(s).`);
      await loadModeration();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to bulk delete berths.'));
    }
  };

  const handleDeleteGroup = async (group: DockyardGroup) => {
    if (!window.confirm(`Permanently delete dockyard group "${group.name}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      await adminApi.deleteGroup(group.id);
      setNotice(`Deleted group "${group.name}".`);
      await loadModeration();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete group.'));
    }
  };

  const handleBulkDeleteGroups = async () => {
    if (selectedGroupIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedGroupIds.length} selected group(s)?`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.bulkDeleteGroups(selectedGroupIds);
      setNotice(`Deleted ${res.deleted} group(s).`);
      await loadModeration();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to bulk delete groups.'));
    }
  };

  // ---------- CSV Exports ----------

  const handleExportUsers = async () => {
    setError(null);
    try {
      await adminApi.exportUsersCsv({
        search: userSearch.trim() || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
      });
      setNotice('Exported filtered users to users_export.csv.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export users CSV.'));
    }
  };

  const handleExportBerths = async () => {
    setError(null);
    try {
      await adminApi.exportBerthsCsv({
        search: berthSearch.trim() || undefined,
        status: berthStatusFilter || undefined,
        owner: berthOwnerFilter.trim() || undefined,
      });
      setNotice('Exported filtered berths to berths_export.csv.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export berths CSV.'));
    }
  };

  const handleExportAudit = async () => {
    setError(null);
    try {
      await adminApi.exportAuditLogsCsv({
        search: auditSearch.trim() || undefined,
        action: auditActionFilter || undefined,
        username: auditUsernameFilter.trim() || undefined,
        ip_address: auditIpFilter.trim() || undefined,
      });
      setNotice('Exported filtered audit logs to audit_logs_export.csv.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export audit logs CSV.'));
    }
  };

  const totalUserPages = Math.max(1, Math.ceil(usersTotal / userPageSize));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="var(--primary)" />
            <span>Admin Control Center</span>
          </h1>
          <p className="page-subtitle">
            Monitor dockyard security, manage user roles and bans, moderate berths and groups, and audit system activity.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={refreshActiveTab}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`tab-btn${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview &amp; Security
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`tab-btn${activeTab === 'users' ? ' active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'moderation'}
          className={`tab-btn${activeTab === 'moderation' ? ' active' : ''}`}
          onClick={() => setActiveTab('moderation')}
        >
          Content Moderation
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`tab-btn${activeTab === 'audit' ? ' active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ===================== TAB 1: OVERVIEW & SECURITY ===================== */}
      {activeTab === 'overview' && (
        <div>
          {overviewLoading && !stats ? (
            <div className="card">
              <div className="empty-state">Loading overview metrics...</div>
            </div>
          ) : (
            <>
              <div className="grid-4">
                <div className="stat-card">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{stats?.total_users ?? 0}</div>
                  <div className="stat-meta">
                    +{stats?.new_users_7d ?? 0} in 7d &middot; {stats?.banned_users ?? 0} banned
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Berths</div>
                  <div className="stat-value">{stats?.total_berths ?? 0}</div>
                  <div className="stat-meta">+{stats?.new_berths_7d ?? 0} created in 7d</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Dockyard Groups</div>
                  <div className="stat-value">{stats?.total_groups ?? 0}</div>
                  <div className="stat-meta">+{stats?.new_groups_7d ?? 0} created in 7d</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Failed Logins (7d)</div>
                  <div
                    className="stat-value"
                    style={{ color: (stats?.failed_logins_7d ?? 0) > 0 ? 'var(--danger)' : undefined }}
                  >
                    {stats?.failed_logins_7d ?? 0}
                  </div>
                  <div className="stat-meta">Tracked for brute-force protection</div>
                </div>
              </div>

              <div className="grid-2">
                <section className="card">
                  <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={17} color="var(--warning)" />
                      <span>Failed Logins by IP</span>
                    </h2>
                  </div>
                  <div className="table-wrapper">
                    {!security || security.failed_by_ip.length === 0 ? (
                      <div className="empty-state">No failed login attempts recorded.</div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>IP Address</th>
                            <th>Attempts</th>
                            <th>Last Attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {security.failed_by_ip.map((item) => (
                            <tr key={item.key}>
                              <td className="mono">{item.key}</td>
                              <td>
                                <span className="badge badge-danger">{item.count}</span>
                              </td>
                              <td>{formatDateTime(item.last_attempt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                <section className="card">
                  <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={17} color="var(--danger)" />
                      <span>Failed Logins by Account</span>
                    </h2>
                  </div>
                  <div className="table-wrapper">
                    {!security || security.failed_by_account.length === 0 ? (
                      <div className="empty-state">No failed login attempts recorded.</div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Account / Identifier</th>
                            <th>Attempts</th>
                            <th>Last Attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {security.failed_by_account.map((item) => (
                            <tr key={item.key}>
                              <td>{item.key}</td>
                              <td>
                                <span className="badge badge-danger">{item.count}</span>
                              </td>
                              <td>{formatDateTime(item.last_attempt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
              </div>

              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Failed Login Events</h2>
                </div>
                <div className="table-wrapper">
                  {!security || security.recent_failed_logs.length === 0 ? (
                    <div className="empty-state">No recent failed logins.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Username</th>
                          <th>IP Address</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {security.recent_failed_logs.map((log) => (
                          <tr key={log.id}>
                            <td>{formatDateTime(log.created_at)}</td>
                            <td>{log.username || '—'}</td>
                            <td className="mono">{log.ip_address || 'unknown'}</td>
                            <td>{log.details || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ===================== TAB 2: USERS MANAGEMENT ===================== */}
      {activeTab === 'users' && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Registered Accounts ({usersTotal})</h2>
            <div className="header-actions">
              {selectedUserIds.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={openBulkBanModal}
                  >
                    <Ban size={13} />
                    <span>Bulk Ban ({selectedUserIds.length})</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleBulkUnban}
                  >
                    <CheckCircle size={13} />
                    <span>Bulk Unban ({selectedUserIds.length})</span>
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportUsers}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="card-body" style={{ paddingBottom: 8 }}>
            <div className="toolbar">
              <input
                type="text"
                className="form-input"
                placeholder="Search username, email, name..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
              <select
                className="form-select"
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select
                className="form-select"
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                aria-label="Filter by account status"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            {usersLoading ? (
              <div className="empty-state">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users match your filters.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={users.length > 0 && selectedUserIds.length === users.length}
                        onChange={(e) =>
                          setSelectedUserIds(e.target.checked ? users.map((u) => u.id) : [])
                        }
                        aria-label="Select all users on page"
                      />
                    </th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = currentAdmin?.id === u.id;
                    const isTargetAdmin = u.role === 'admin';

                    return (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            aria-label={`Select ${u.username}`}
                          />
                        </td>
                        <td>
                          <strong>{u.full_name}</strong>{' '}
                          <span className="muted">@{u.username}</span>
                          {isSelf && (
                            <span className="badge badge-info" style={{ marginLeft: 6 }}>
                              You
                            </span>
                          )}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.role === 'admin' ? 'badge-admin' : 'badge-user'
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {u.is_banned ? (
                            <span className="badge badge-banned" title={u.ban_reason || ''}>
                              Banned
                            </span>
                          ) : (
                            <span className="badge badge-active">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openUserDetail(u.id)}
                            >
                              <Eye size={13} />
                              <span>Inspect</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={isSelf}
                              title={isSelf ? 'Admins cannot change their own role.' : undefined}
                              onClick={() =>
                                handleChangeRole(u, u.role === 'admin' ? 'user' : 'admin')
                              }
                            >
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>

                            {u.is_banned ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUnbanUser(u)}
                              >
                                <CheckCircle size={13} />
                                <span>Unban</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={isSelf || isTargetAdmin}
                                title={
                                  isSelf
                                    ? 'Admins cannot ban themselves.'
                                    : isTargetAdmin
                                      ? 'Admins cannot ban another admin.'
                                      : undefined
                                }
                                onClick={() => openSingleBanModal(u)}
                              >
                                <Ban size={13} />
                                <span>Ban</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="pagination">
              <span>
                Page {userPage} of {totalUserPages} ({usersTotal} total users)
              </span>
              <div className="header-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={userPage >= totalUserPages}
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 3: CONTENT MODERATION ===================== */}
      {activeTab === 'moderation' && (
        <div>
          {/* All Berths Moderation */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">All Berths ({adminBerths.length})</h2>
              <div className="header-actions">
                {selectedBerthIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleBulkDeleteBerths}
                  >
                    <Trash2 size={13} />
                    <span>Bulk Delete ({selectedBerthIds.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportBerths}
                >
                  <Download size={14} />
                  <span>Export Berths CSV</span>
                </button>
              </div>
            </div>

            <div className="card-body" style={{ paddingBottom: 8 }}>
              <div className="toolbar">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search berth #..."
                  value={berthSearch}
                  onChange={(e) => setBerthSearch(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter by owner username..."
                  value={berthOwnerFilter}
                  onChange={(e) => setBerthOwnerFilter(e.target.value)}
                />
                <select
                  className="form-select"
                  value={berthStatusFilter}
                  onChange={(e) => setBerthStatusFilter(e.target.value)}
                  aria-label="Filter berths by status"
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div className="table-wrapper">
              {moderationLoading ? (
                <div className="empty-state">Loading berths...</div>
              ) : adminBerths.length === 0 ? (
                <div className="empty-state">No berths match your filters.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={
                            adminBerths.length > 0 && selectedBerthIds.length === adminBerths.length
                          }
                          onChange={(e) =>
                            setSelectedBerthIds(
                              e.target.checked ? adminBerths.map((b) => b.id) : []
                            )
                          }
                          aria-label="Select all berths"
                        />
                      </th>
                      <th>Berth #</th>
                      <th>Dimensions</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Group</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminBerths.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedBerthIds.includes(b.id)}
                            onChange={() => toggleBerthSelection(b.id)}
                            aria-label={`Select berth ${b.berth_number}`}
                          />
                        </td>
                        <td>
                          <strong>{b.berth_number}</strong>
                        </td>
                        <td className="mono">
                          {b.max_length_meters.toFixed(2)}m &times; {b.max_draft_meters.toFixed(2)}m
                        </td>
                        <td>
                          <span className={berthStatusClass(b.status)}>{b.status}</span>
                        </td>
                        <td>{b.owner_username ? `@${b.owner_username}` : '—'}</td>
                        <td>{b.group_name || <span className="muted">Private</span>}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteBerth(b)}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* All Groups Moderation */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">All Dockyard Groups ({adminGroups.length})</h2>
              <div className="header-actions">
                {selectedGroupIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleBulkDeleteGroups}
                  >
                    <Trash2 size={13} />
                    <span>Bulk Delete ({selectedGroupIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="card-body" style={{ paddingBottom: 8 }}>
              <div className="toolbar">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search group name..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter by owner username..."
                  value={groupOwnerFilter}
                  onChange={(e) => setGroupOwnerFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrapper">
              {moderationLoading ? (
                <div className="empty-state">Loading groups...</div>
              ) : adminGroups.length === 0 ? (
                <div className="empty-state">No groups match your filters.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={
                            adminGroups.length > 0 && selectedGroupIds.length === adminGroups.length
                          }
                          onChange={(e) =>
                            setSelectedGroupIds(
                              e.target.checked ? adminGroups.map((g) => g.id) : []
                            )
                          }
                          aria-label="Select all groups"
                        />
                      </th>
                      <th>Group Name</th>
                      <th>Owner</th>
                      <th>Members</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminGroups.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(g.id)}
                            onChange={() => toggleGroupSelection(g.id)}
                            aria-label={`Select group ${g.name}`}
                          />
                        </td>
                        <td>
                          <strong>{g.name}</strong>
                          {g.description && <div className="muted">{g.description}</div>}
                        </td>
                        <td>@{g.owner_username}</td>
                        <td>{g.member_count}</td>
                        <td>{formatDateTime(g.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteGroup(g)}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ===================== TAB 4: AUDIT LOGS ===================== */}
      {activeTab === 'audit' && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} />
              <span>System Audit Trail ({auditLogs.length})</span>
            </h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportAudit}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="card-body" style={{ paddingBottom: 8 }}>
            <div className="toolbar">
              <input
                type="text"
                className="form-input"
                placeholder="Search details, action, user..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Filter username..."
                value={auditUsernameFilter}
                onChange={(e) => setAuditUsernameFilter(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Filter IP address..."
                value={auditIpFilter}
                onChange={(e) => setAuditIpFilter(e.target.value)}
              />
              <select
                className="form-select"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                aria-label="Filter by audit action"
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="SIGNUP">SIGNUP</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
                <option value="PASSWORD_CHANGE_FAILED">PASSWORD_CHANGE_FAILED</option>
                <option value="BERTH_CREATED">BERTH_CREATED</option>
                <option value="BERTH_UPDATED">BERTH_UPDATED</option>
                <option value="BERTH_ASSIGNED">BERTH_ASSIGNED</option>
                <option value="BERTH_DELETED">BERTH_DELETED</option>
                <option value="GROUP_CREATED">GROUP_CREATED</option>
                <option value="GROUP_MEMBER_ADDED">GROUP_MEMBER_ADDED</option>
                <option value="GROUP_MEMBER_UPDATED">GROUP_MEMBER_UPDATED</option>
                <option value="USER_BANNED">USER_BANNED</option>
                <option value="USER_UNBANNED">USER_UNBANNED</option>
                <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                <option value="ADMIN_BERTH_DELETED">ADMIN_BERTH_DELETED</option>
                <option value="ADMIN_GROUP_DELETED">ADMIN_GROUP_DELETED</option>
                <option value="EXPORT_USERS_CSV">EXPORT_USERS_CSV</option>
                <option value="EXPORT_BERTHS_CSV">EXPORT_BERTHS_CSV</option>
                <option value="EXPORT_AUDIT_CSV">EXPORT_AUDIT_CSV</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            {auditLoading ? (
              <div className="empty-state">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="empty-state">No audit events match your filters.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                      <td>
                        <span
                          className={`badge ${
                            log.action.includes('FAILED') || log.action.includes('BANNED')
                              ? 'badge-danger'
                              : log.action.includes('DELETE')
                                ? 'badge-warning'
                                : 'badge-info'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>{log.username ? `@${log.username}` : '—'}</td>
                      <td className="mono">{log.ip_address || 'unknown'}</td>
                      <td>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ===================== BAN REASON MODAL ===================== */}
      {(banTargetUser || bulkBanModalOpen) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setBanTargetUser(null);
            setBulkBanModalOpen(false);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {banTargetUser
                  ? `Ban @${banTargetUser.username}`
                  : `Bulk Ban ${selectedUserIds.length} User(s)`}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setBanTargetUser(null);
                  setBulkBanModalOpen(false);
                }}
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleConfirmBan}>
              <div className="modal-body form-stack">
                <p className="muted" style={{ margin: 0 }}>
                  Banned users are blocked immediately and all their active sessions are revoked.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="ban-reason-input">
                    Reason for Ban
                  </label>
                  <textarea
                    id="ban-reason-input"
                    className="form-textarea"
                    rows={3}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="e.g., Repeated unauthorized docking schedule modifications"
                    required={Boolean(banTargetUser)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setBanTargetUser(null);
                    setBulkBanModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={banSubmitting}>
                  {banSubmitting ? 'Applying Ban...' : 'Confirm Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== USER INSPECT MODAL ===================== */}
      {(detailLoading || userDetail) && (
        <div className="modal-backdrop" onClick={() => setUserDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {userDetail
                  ? `Account Inspection: ${userDetail.user.full_name} (@${userDetail.user.username})`
                  : 'Loading User Details...'}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setUserDetail(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body form-stack">
              {detailLoading || !userDetail ? (
                <div className="empty-state">Fetching user activity...</div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div>
                        <strong>Email:</strong> {userDetail.user.email}
                      </div>
                      <div className="muted">
                        Role: {userDetail.user.role.toUpperCase()} &middot; Joined:{' '}
                        {formatDateTime(userDetail.user.created_at)}
                      </div>
                      {userDetail.user.is_banned && (
                        <div style={{ color: 'var(--danger)', marginTop: 4 }}>
                          <strong>Banned:</strong> {userDetail.user.ban_reason || 'No reason given'}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRevokeAllSessions(userDetail.user)}
                    >
                      Revoke All Sessions
                    </button>
                  </div>

                  <div>
                    <h3 className="card-title" style={{ marginBottom: 8 }}>
                      Owned Berths ({userDetail.berths.length})
                    </h3>
                    {userDetail.berths.length === 0 ? (
                      <p className="muted">No berths owned.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {userDetail.berths.map((b) => (
                          <span key={b.id} className={berthStatusClass(b.status)}>
                            {b.berth_number} ({b.status})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="card-title" style={{ marginBottom: 8 }}>
                      Groups ({userDetail.groups.length})
                    </h3>
                    {userDetail.groups.length === 0 ? (
                      <p className="muted">Not in any groups.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {userDetail.groups.map((g) => (
                          <span key={g.id} className="badge badge-info">
                            {g.name} ({g.owner_id === userDetail.user.id ? 'Owner' : 'Member'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="card-title" style={{ marginBottom: 8 }}>
                      Sessions ({userDetail.sessions.length})
                    </h3>
                    {userDetail.sessions.length === 0 ? (
                      <p className="muted">No recorded sessions.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Status</th>
                              <th>IP</th>
                              <th>Last Used</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.sessions.slice(0, 6).map((s) => (
                              <tr key={s.id}>
                                <td>
                                  <span
                                    className={`badge ${
                                      s.is_revoked ? 'badge-danger' : 'badge-active'
                                    }`}
                                  >
                                    {s.is_revoked ? 'Revoked' : 'Active'}
                                  </span>
                                </td>
                                <td className="mono">{s.ip_address || 'unknown'}</td>
                                <td>{formatDateTime(s.last_used_at || s.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="card-title" style={{ marginBottom: 8 }}>
                      Recent Activity ({userDetail.recent_activity.length})
                    </h3>
                    {userDetail.recent_activity.length === 0 ? (
                      <p className="muted">No recent audit events.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>When</th>
                              <th>Action</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.recent_activity.slice(0, 10).map((a) => (
                              <tr key={a.id}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {formatDateTime(a.created_at)}
                                </td>
                                <td>
                                  <span className="badge badge-info">{a.action}</span>
                                </td>
                                <td>{a.details || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}