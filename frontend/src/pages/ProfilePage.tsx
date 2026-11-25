import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Monitor, RefreshCw, Save, Trash2, UserCircle } from 'lucide-react';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { UserSession } from '../types';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsErr, setSessionsErr] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsErr(null);
    try {
      const data = await authApi.listSessions();
      setSessions(data);
    } catch (err) {
      setSessionsErr(getErrorMessage(err, 'Failed to load sessions.'));
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setProfileSaving(true);
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      setUser(updated);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileErr(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);

    if (newPassword !== confirmNewPassword) {
      setPwdErr('New passwords do not match.');
      return;
    }

    setPwdSaving(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwdMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPwdErr(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setPwdSaving(false);
    }
  };

  const handleRevokeSession = async (session: UserSession) => {
    setRevokingId(session.id);
    setSessionsErr(null);
    try {
      await authApi.revokeSession(session.id);
      if (session.is_current) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      await loadSessions();
    } catch (err) {
      setSessionsErr(getErrorMessage(err, 'Failed to revoke session.'));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Account &amp; Security</h1>
          <p className="page-subtitle">
            Manage your profile details, password, and active login sessions.
          </p>
        </div>
        {user && (
          <div className="header-actions">
            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
              Role: {user.role.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Profile Card */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCircle size={18} />
              <span>Profile Information</span>
            </h2>
          </div>
          <div className="card-body">
            {profileMsg && <div className="alert alert-success">{profileMsg}</div>}
            {profileErr && <div className="alert alert-error">{profileErr}</div>}

            <form className="form-stack" onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-username">
                  Username
                </label>
                <input
                  id="profile-username"
                  type="text"
                  className="form-input"
                  value={user?.username ?? ''}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-fullname">
                  Full Name
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                  <Save size={15} />
                  <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Password Change Card */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={18} />
              <span>Change Password</span>
            </h2>
          </div>
          <div className="card-body">
            {pwdMsg && <div className="alert alert-success">{pwdMsg}</div>}
            {pwdErr && <div className="alert alert-error">{pwdErr}</div>}

            <form className="form-stack" onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="pwd-current">
                  Current Password
                </label>
                <input
                  id="pwd-current"
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pwd-new">
                  New Password
                </label>
                <input
                  id="pwd-new"
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8+ chars, upper, lower, number"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pwd-confirm">
                  Confirm New Password
                </label>
                <input
                  id="pwd-confirm"
                  type="password"
                  className="form-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                  <KeyRound size={15} />
                  <span>{pwdSaving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Active Sessions Card */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={18} />
            <span>Active &amp; Recent Sessions</span>
          </h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadSessions}
            disabled={sessionsLoading}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {sessionsErr && (
            <div style={{ padding: '16px 20px 0' }}>
              <div className="alert alert-error">{sessionsErr}</div>
            </div>
          )}

          {sessionsLoading ? (
            <div className="empty-state">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">No sessions found.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Browser / Device</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const isExpired = new Date(s.expires_at).getTime() <= Date.now();
                    const canRevoke = !s.is_revoked && !isExpired;

                    return (
                      <tr key={s.id}>
                        <td>
                          {s.is_current ? (
                            <span className="badge badge-info">Current Session</span>
                          ) : s.is_revoked ? (
                            <span className="badge badge-danger">Revoked</span>
                          ) : isExpired ? (
                            <span className="badge badge-warning">Expired</span>
                          ) : (
                            <span className="badge badge-active">Active</span>
                          )}
                        </td>
                        <td className="mono">{s.ip_address || 'unknown'}</td>
                        <td
                          title={s.user_agent || ''}
                          style={{
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.user_agent || 'unknown'}
                        </td>
                        <td>{formatDateTime(s.last_used_at || s.created_at)}</td>
                        <td>{formatDateTime(s.expires_at)}</td>
                        <td>
                          {canRevoke ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={revokingId === s.id}
                              onClick={() => handleRevokeSession(s)}
                            >
                              <Trash2 size={13} />
                              <span>
                                {revokingId === s.id
                                  ? 'Revoking...'
                                  : s.is_current
                                    ? 'Revoke & Sign Out'
                                    : 'Revoke'}
                              </span>
                            </button>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}