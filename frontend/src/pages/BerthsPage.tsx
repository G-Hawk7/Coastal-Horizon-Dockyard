import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { berthsApi } from '../api/berths';
import { getErrorMessage } from '../api/client';
import { groupsApi } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import type { Berth, BerthStatus, DockyardGroup } from '../types';

function statusBadgeClass(status: BerthStatus): string {
  if (status === 'AVAILABLE') return 'badge badge-available';
  if (status === 'OCCUPIED') return 'badge badge-occupied';
  return 'badge badge-maintenance';
}

function statusLabel(status: BerthStatus): string {
  if (status === 'UNDER_MAINTENANCE') return 'Maintenance';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function BerthsPage() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [berths, setBerths] = useState<Berth[]>([]);
  const [groups, setGroups] = useState<DockyardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState(searchParams.get('group_id') ?? '');

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBerth, setEditingBerth] = useState<Berth | null>(null);
  const [berthNumber, setBerthNumber] = useState('');
  const [maxLength, setMaxLength] = useState('');
  const [maxDraft, setMaxDraft] = useState('');
  const [berthStatus, setBerthStatus] = useState<BerthStatus>('AVAILABLE');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Assign modal state
  const [assigningBerth, setAssigningBerth] = useState<Berth | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const groupMap = useMemo(() => {
    const map = new Map<string, DockyardGroup>();
    for (const g of groups) {
      map.set(g.id, g);
    }
    return map;
  }, [groups]);

  const creatableGroups = useMemo(
    () => groups.filter((g) => isAdmin || g.my_permissions.is_owner || g.my_permissions.can_create),
    [groups, isAdmin]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [berthList, groupList] = await Promise.all([
        berthsApi.list({
          group_id: groupFilter || undefined,
          status: statusFilter || undefined,
          search: searchTerm.trim() || undefined,
        }),
        groupsApi.list(),
      ]);
      setBerths(berthList);
      setGroups(groupList);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load berths.'));
    } finally {
      setLoading(false);
    }
  }, [groupFilter, statusFilter, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGroupFilterChange = (value: string) => {
    setGroupFilter(value);
    if (value) {
      setSearchParams({ group_id: value });
    } else {
      setSearchParams({});
    }
  };

  // Permission helpers mirroring backend rbac.py
  const canUpdateBerth = (berth: Berth): boolean => {
    if (!user) return false;
    if (isAdmin || berth.owner_id === user.id) return true;
    if (berth.group_id) {
      const grp = groupMap.get(berth.group_id);
      return Boolean(grp?.my_permissions.is_owner || grp?.my_permissions.can_update);
    }
    return false;
  };

  const canAssignBerth = (berth: Berth): boolean => {
    if (!user) return false;
    if (isAdmin || berth.owner_id === user.id) return true;
    if (berth.group_id) {
      const grp = groupMap.get(berth.group_id);
      return Boolean(grp?.my_permissions.is_owner || grp?.my_permissions.can_assign);
    }
    return false;
  };

  const canDeleteBerth = (berth: Berth): boolean => {
    if (!user) return false;
    if (isAdmin || berth.owner_id === user.id) return true;
    if (berth.group_id) {
      const grp = groupMap.get(berth.group_id);
      return Boolean(grp?.my_permissions.is_owner);
    }
    return false;
  };

  const openCreateModal = () => {
    setEditingBerth(null);
    setBerthNumber('');
    setMaxLength('180');
    setMaxDraft('10.5');
    setBerthStatus('AVAILABLE');
    const preselected =
      groupFilter && creatableGroups.some((g) => g.id === groupFilter) ? groupFilter : '';
    setSelectedGroupId(preselected);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (berth: Berth) => {
    setEditingBerth(berth);
    setBerthNumber(berth.berth_number);
    setMaxLength(String(berth.max_length_meters));
    setMaxDraft(String(berth.max_draft_meters));
    setBerthStatus(berth.status);
    setSelectedGroupId(berth.group_id ?? '');
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBerth(null);
    setModalError(null);
  };

  const handleSaveBerth = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setNotice(null);

    const parsedLength = Number(maxLength);
    const parsedDraft = Number(maxDraft);
    if (!berthNumber.trim() || Number.isNaN(parsedLength) || parsedLength <= 0 || Number.isNaN(parsedDraft) || parsedDraft <= 0) {
      setModalError('Please enter a valid berth number and positive numeric dimensions.');
      return;
    }

    setSaving(true);
    try {
      if (editingBerth) {
        await berthsApi.update(editingBerth.id, {
          berth_number: berthNumber.trim(),
          max_length_meters: parsedLength,
          max_draft_meters: parsedDraft,
          status: berthStatus,
        });
        setNotice(`Berth ${berthNumber.trim()} updated.`);
      } else {
        await berthsApi.create({
          berth_number: berthNumber.trim(),
          max_length_meters: parsedLength,
          max_draft_meters: parsedDraft,
          status: berthStatus,
          group_id: selectedGroupId || null,
        });
        setNotice(`Berth ${berthNumber.trim()} created.`);
      }
      closeModal();
      await loadData();
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to save berth.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBerth = async (berth: Berth) => {
    if (!window.confirm(`Delete berth "${berth.berth_number}"? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await berthsApi.remove(berth.id);
      setNotice(`Berth ${berth.berth_number} deleted.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete berth.'));
    }
  };

  const openAssignModal = (berth: Berth) => {
    setAssigningBerth(berth);
    setSelectedAssigneeId(berth.assigned_to_id ?? '');
    setModalError(null);
  };

  const assigneeOptions = useMemo(() => {
    if (!assigningBerth) return [];
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    const addOption = (id: string, label: string) => {
      if (!seen.has(id)) {
        seen.add(id);
        options.push({ id, label });
      }
    };

    if (assigningBerth.group_id) {
      const grp = groupMap.get(assigningBerth.group_id);
      if (grp) {
        addOption(grp.owner_id, `${grp.owner_username} (Group Owner)`);
        for (const m of grp.members) {
          addOption(m.user_id, `${m.full_name} (@${m.username})`);
        }
      }
    } else if (assigningBerth.owner_id && assigningBerth.owner_username) {
      addOption(assigningBerth.owner_id, `${assigningBerth.owner_username} (Owner)`);
    }

    if (user && !assigningBerth.group_id) {
      addOption(user.id, `${user.full_name} (@${user.username})`);
    }

    return options;
  }, [assigningBerth, groupMap, user]);

  const handleAssignSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!assigningBerth) return;
    setAssignSaving(true);
    setModalError(null);
    setNotice(null);
    try {
      await berthsApi.assign(assigningBerth.id, selectedAssigneeId || null);
      setNotice(`Updated assignment for berth ${assigningBerth.berth_number}.`);
      setAssigningBerth(null);
      await loadData();
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to assign berth.'));
    } finally {
      setAssignSaving(false);
    }
  };

  const stats = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let maintenance = 0;
    for (const b of berths) {
      if (b.status === 'AVAILABLE') available += 1;
      else if (b.status === 'OCCUPIED') occupied += 1;
      else maintenance += 1;
    }
    return { total: berths.length, available, occupied, maintenance };
  }, [berths]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Berth Operations</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Viewing all dockyard berths across every owner and shared team.'
              : 'Manage your private berths and berths shared with your dockyard groups.'}
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>New Berth</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-label">Visible Berths</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-meta">Matching current filters</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {stats.available}
          </div>
          <div className="stat-meta">Ready for docking</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Occupied</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {stats.occupied}
          </div>
          <div className="stat-meta">Currently berthed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Maintenance</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {stats.maintenance}
          </div>
          <div className="stat-meta">Out of service</div>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 8 }}>
          <div className="toolbar">
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: 34 }}
                placeholder="Search berth number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            </select>

            <select
              className="form-select"
              value={groupFilter}
              onChange={(e) => handleGroupFilterChange(e.target.value)}
              aria-label="Filter by group"
            >
              <option value="">All Accessible Berths</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  Group: {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">Loading berths...</div>
          ) : berths.length === 0 ? (
            <div className="empty-state">
              No berths match your current filter. Click <strong>New Berth</strong> to add one.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Berth #</th>
                  <th>Max Length / Draft</th>
                  <th>Status</th>
                  <th>Scope / Group</th>
                  <th>Owner</th>
                  <th>Assigned Officer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {berths.map((berth) => {
                  const allowEdit = canUpdateBerth(berth);
                  const allowAssign = canAssignBerth(berth);
                  const allowDelete = canDeleteBerth(berth);

                  return (
                    <tr key={berth.id}>
                      <td>
                        <strong>{berth.berth_number}</strong>
                      </td>
                      <td className="mono">
                        {berth.max_length_meters.toFixed(2)}m &times;{' '}
                        {berth.max_draft_meters.toFixed(2)}m
                      </td>
                      <td>
                        <span className={statusBadgeClass(berth.status)}>
                          {statusLabel(berth.status)}
                        </span>
                      </td>
                      <td>
                        {berth.group_name ? (
                          <span className="badge badge-info">{berth.group_name}</span>
                        ) : (
                          <span className="badge badge-user">Private</span>
                        )}
                      </td>
                      <td>{berth.owner_username ? `@${berth.owner_username}` : '—'}</td>
                      <td>
                        {berth.assigned_to_username ? (
                          <span>@{berth.assigned_to_username}</span>
                        ) : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {allowEdit && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(berth)}
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                          )}
                          {allowAssign && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openAssignModal(berth)}
                            >
                              <UserCheck size={13} />
                              <span>Assign</span>
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteBerth(berth)}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                          {!allowEdit && !allowAssign && !allowDelete && (
                            <span className="muted">View only</span>
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
      </div>

      {/* Create / Edit Berth Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {editingBerth ? `Edit Berth ${editingBerth.berth_number}` : 'Create New Berth'}
              </h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeModal}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveBerth}>
              <div className="modal-body form-stack">
                {modalError && <div className="alert alert-error">{modalError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="berth-number">
                    Berth Number
                  </label>
                  <input
                    id="berth-number"
                    type="text"
                    className="form-input"
                    value={berthNumber}
                    onChange={(e) => setBerthNumber(e.target.value)}
                    placeholder="e.g., ALPHA-03"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="berth-length">
                      Max Length (m)
                    </label>
                    <input
                      id="berth-length"
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-input"
                      value={maxLength}
                      onChange={(e) => setMaxLength(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="berth-draft">
                      Max Draft (m)
                    </label>
                    <input
                      id="berth-draft"
                      type="number"
                      step="0.01"
                      min="0.5"
                      className="form-input"
                      value={maxDraft}
                      onChange={(e) => setMaxDraft(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="berth-status">
                    Operational Status
                  </label>
                  <select
                    id="berth-status"
                    className="form-select"
                    value={berthStatus}
                    onChange={(e) => setBerthStatus(e.target.value as BerthStatus)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>

                {!editingBerth && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="berth-group">
                      Workspace / Shared Group
                    </label>
                    <select
                      id="berth-group"
                      className="form-select"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    >
                      <option value="">Private Berth (Only Me)</option>
                      {creatableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          Shared Group: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingBerth ? 'Update Berth' : 'Create Berth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Berth Modal */}
      {assigningBerth && (
        <div className="modal-backdrop" onClick={() => setAssigningBerth(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">Assign Berth {assigningBerth.berth_number}</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAssigningBerth(null)}
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body form-stack">
                {modalError && <div className="alert alert-error">{modalError}</div>}
                <p className="muted" style={{ margin: 0 }}>
                  {assigningBerth.group_name
                    ? `Assign an officer from "${assigningBerth.group_name}" to manage this berth.`
                    : 'Assign this private berth to yourself or leave it unassigned.'}
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="assign-officer">
                    Assigned Officer
                  </label>
                  <select
                    id="assign-officer"
                    className="form-select"
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssigningBerth(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignSaving}>
                  {assignSaving ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}