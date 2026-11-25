import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil,
  Plus,
  RefreshCw,
  Ship,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import { groupsApi } from '../api/groups';
import type { DockyardGroup, GroupMember } from '../types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<DockyardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create / Edit Group modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DockyardGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSaving, setGroupSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Add Member modal
  const [memberTargetGroup, setMemberTargetGroup] = useState<DockyardGroup | null>(null);
  const [memberUsername, setMemberUsername] = useState('');
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canAssign, setCanAssign] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dockyard groups.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDesc('');
    setModalError(null);
    setGroupModalOpen(true);
  };

  const openEditGroup = (group: DockyardGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDesc(group.description ?? '');
    setModalError(null);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setNotice(null);

    if (groupName.trim().length < 2) {
      setModalError('Group name must be at least 2 characters.');
      return;
    }

    setGroupSaving(true);
    try {
      if (editingGroup) {
        await groupsApi.update(editingGroup.id, {
          name: groupName.trim(),
          description: groupDesc.trim(),
        });
        setNotice(`Updated group "${groupName.trim()}".`);
      } else {
        await groupsApi.create({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
        });
        setNotice(`Created group "${groupName.trim()}".`);
      }
      setGroupModalOpen(false);
      await loadGroups();
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to save group.'));
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = async (group: DockyardGroup) => {
    if (
      !window.confirm(
        `Delete group "${group.name}"? Shared berths will remain with their owners as private berths.`
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await groupsApi.remove(group.id);
      setNotice(`Group "${group.name}" deleted.`);
      await loadGroups();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete group.'));
    }
  };

  const openAddMember = (group: DockyardGroup) => {
    setMemberTargetGroup(group);
    setMemberUsername('');
    setCanCreate(true);
    setCanUpdate(false);
    setCanAssign(false);
    setModalError(null);
  };

  const handleAddMemberSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!memberTargetGroup) return;
    setModalError(null);
    setNotice(null);

    if (!memberUsername.trim()) {
      setModalError('Enter a username or email address.');
      return;
    }

    setMemberSaving(true);
    try {
      const updated = await groupsApi.addMember(memberTargetGroup.id, {
        username: memberUsername.trim(),
        can_create: canCreate,
        can_update: canUpdate,
        can_assign: canAssign,
      });
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setNotice(`Added "${memberUsername.trim()}" to "${memberTargetGroup.name}".`);
      setMemberTargetGroup(null);
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to add member.'));
    } finally {
      setMemberSaving(false);
    }
  };

  const handleTogglePermission = async (
    group: DockyardGroup,
    member: GroupMember,
    field: 'can_create' | 'can_update' | 'can_assign'
  ) => {
    const key = `${group.id}:${member.user_id}:${field}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await groupsApi.updateMember(group.id, member.user_id, {
        [field]: !member[field],
      });
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setNotice(`Updated permissions for @${member.username} in "${group.name}".`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update member permissions.'));
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemoveMember = async (group: DockyardGroup, member: GroupMember) => {
    if (!window.confirm(`Remove @${member.username} from "${group.name}"?`)) {
      return;
    }
    const key = `${group.id}:${member.user_id}:remove`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await groupsApi.removeMember(group.id, member.user_id);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setNotice(`Removed @${member.username} from "${group.name}".`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member.'));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shared Dockyard Groups</h1>
          <p className="page-subtitle">
            Collaborate on shared berths with fine-grained per-member Create, Update, and Assign permissions.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadGroups}
            disabled={loading}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateGroup}>
            <Plus size={16} />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">
          <div className="empty-state">Loading dockyard groups...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            You do not belong to any dockyard groups yet. Click <strong>Create Group</strong> to start one.
          </div>
        </div>
      ) : (
        groups.map((group) => {
          const isOwner = group.my_permissions.is_owner;
          const canManageMembers = group.my_permissions.can_manage_members;

          return (
            <section key={group.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Users size={18} color="var(--primary)" />
                    <h2 className="card-title">{group.name}</h2>
                    {isOwner ? (
                      <span className="badge badge-admin">Owner</span>
                    ) : (
                      <span className="badge badge-info">Member</span>
                    )}
                    <span className="muted">
                      Owner: @{group.owner_username} &middot; {group.member_count} member
                      {group.member_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="muted" style={{ margin: '6px 0 0' }}>
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="header-actions">
                  <Link to={`/berths?group_id=${group.id}`} className="btn btn-secondary btn-sm">
                    <Ship size={14} />
                    <span>View Group Berths</span>
                  </Link>
                  {canManageMembers && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openAddMember(group)}
                    >
                      <UserPlus size={14} />
                      <span>Add Member</span>
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditGroup(group)}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteGroup(group)}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="card-body" style={{ paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>
                    Your permissions:
                  </span>
                  {group.my_permissions.can_create && (
                    <span className="badge badge-available">Can Create</span>
                  )}
                  {group.my_permissions.can_update && (
                    <span className="badge badge-info">Can Update</span>
                  )}
                  {group.my_permissions.can_assign && (
                    <span className="badge badge-warning">Can Assign</span>
                  )}
                  {!group.my_permissions.can_create &&
                    !group.my_permissions.can_update &&
                    !group.my_permissions.can_assign && (
                      <span className="badge badge-user">Read Only</span>
                    )}
                </div>

                {group.members.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>
                    No additional members in this group yet.
                  </p>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Email</th>
                          <th>Create Berths</th>
                          <th>Update Berths</th>
                          <th>Assign Berths</th>
                          {canManageMembers && <th>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {group.members.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <strong>{member.full_name}</strong>{' '}
                              <span className="muted">@{member.username}</span>
                            </td>
                            <td>{member.email}</td>
                            <td>
                              {canManageMembers ? (
                                <input
                                  type="checkbox"
                                  checked={member.can_create}
                                  disabled={busyKey === `${group.id}:${member.user_id}:can_create`}
                                  onChange={() =>
                                    handleTogglePermission(group, member, 'can_create')
                                  }
                                  aria-label={`Toggle create permission for ${member.username}`}
                                />
                              ) : (
                                <span
                                  className={`badge ${
                                    member.can_create ? 'badge-available' : 'badge-user'
                                  }`}
                                >
                                  {member.can_create ? 'Allowed' : 'No'}
                                </span>
                              )}
                            </td>
                            <td>
                              {canManageMembers ? (
                                <input
                                  type="checkbox"
                                  checked={member.can_update}
                                  disabled={busyKey === `${group.id}:${member.user_id}:can_update`}
                                  onChange={() =>
                                    handleTogglePermission(group, member, 'can_update')
                                  }
                                  aria-label={`Toggle update permission for ${member.username}`}
                                />
                              ) : (
                                <span
                                  className={`badge ${
                                    member.can_update ? 'badge-available' : 'badge-user'
                                  }`}
                                >
                                  {member.can_update ? 'Allowed' : 'No'}
                                </span>
                              )}
                            </td>
                            <td>
                              {canManageMembers ? (
                                <input
                                  type="checkbox"
                                  checked={member.can_assign}
                                  disabled={busyKey === `${group.id}:${member.user_id}:can_assign`}
                                  onChange={() =>
                                    handleTogglePermission(group, member, 'can_assign')
                                  }
                                  aria-label={`Toggle assign permission for ${member.username}`}
                                />
                              ) : (
                                <span
                                  className={`badge ${
                                    member.can_assign ? 'badge-available' : 'badge-user'
                                  }`}
                                >
                                  {member.can_assign ? 'Allowed' : 'No'}
                                </span>
                              )}
                            </td>
                            {canManageMembers && (
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  disabled={busyKey === `${group.id}:${member.user_id}:remove`}
                                  onClick={() => handleRemoveMember(group, member)}
                                >
                                  <Trash2 size={13} />
                                  <span>Remove</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          );
        })
      )}

      {/* Create / Edit Group Modal */}
      {groupModalOpen && (
        <div className="modal-backdrop" onClick={() => setGroupModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {editingGroup ? `Edit Group "${editingGroup.name}"` : 'Create Dockyard Group'}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setGroupModalOpen(false)}
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveGroup}>
              <div className="modal-body form-stack">
                {modalError && <div className="alert alert-error">{modalError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="group-name">
                    Group Name
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    className="form-input"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Bay Sector Beta Operations"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="group-desc">
                    Description (optional)
                  </label>
                  <textarea
                    id="group-desc"
                    className="form-textarea"
                    rows={3}
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Briefly describe which berths or operations this team shares."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setGroupModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={groupSaving}>
                  {groupSaving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {memberTargetGroup && (
        <div className="modal-backdrop" onClick={() => setMemberTargetGroup(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">Add Member to {memberTargetGroup.name}</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMemberTargetGroup(null)}
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit}>
              <div className="modal-body form-stack">
                {modalError && <div className="alert alert-error">{modalError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="member-username">
                    Username or Email
                  </label>
                  <input
                    id="member-username"
                    type="text"
                    className="form-input"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    placeholder="e.g., officer_redfield"
                    required
                  />
                </div>

                <div className="form-group">
                  <span className="form-label">Member Permissions</span>
                  <div className="checkbox-row" style={{ marginTop: 4 }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={canCreate}
                        onChange={(e) => setCanCreate(e.target.checked)}
                      />
                      <span>Can Create Berths</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={canUpdate}
                        onChange={(e) => setCanUpdate(e.target.checked)}
                      />
                      <span>Can Update Berths</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={canAssign}
                        onChange={(e) => setCanAssign(e.target.checked)}
                      />
                      <span>Can Assign Berths</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMemberTargetGroup(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={memberSaving}>
                  {memberSaving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}