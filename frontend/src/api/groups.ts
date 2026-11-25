import apiClient from './client';
import type { DockyardGroup } from '../types';

export interface GroupCreatePayload {
  name: string;
  description?: string;
}

export interface GroupUpdatePayload {
  name?: string;
  description?: string;
}

export interface GroupMemberAddPayload {
  username: string;
  can_create: boolean;
  can_update: boolean;
  can_assign: boolean;
}

export interface GroupMemberUpdatePayload {
  can_create?: boolean;
  can_update?: boolean;
  can_assign?: boolean;
}

export const groupsApi = {
  async list(): Promise<DockyardGroup[]> {
    const { data } = await apiClient.get<DockyardGroup[]>('/groups');
    return data;
  },

  async getById(groupId: string): Promise<DockyardGroup> {
    const { data } = await apiClient.get<DockyardGroup>(`/groups/${groupId}`);
    return data;
  },

  async create(payload: GroupCreatePayload): Promise<DockyardGroup> {
    const { data } = await apiClient.post<DockyardGroup>('/groups', payload);
    return data;
  },

  async update(groupId: string, payload: GroupUpdatePayload): Promise<DockyardGroup> {
    const { data } = await apiClient.patch<DockyardGroup>(`/groups/${groupId}`, payload);
    return data;
  },

  async remove(groupId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/groups/${groupId}`);
    return data;
  },

  async addMember(groupId: string, payload: GroupMemberAddPayload): Promise<DockyardGroup> {
    const { data } = await apiClient.post<DockyardGroup>(`/groups/${groupId}/members`, payload);
    return data;
  },

  async updateMember(
    groupId: string,
    memberUserId: string,
    payload: GroupMemberUpdatePayload
  ): Promise<DockyardGroup> {
    const { data } = await apiClient.patch<DockyardGroup>(
      `/groups/${groupId}/members/${memberUserId}`,
      payload
    );
    return data;
  },

  async removeMember(groupId: string, memberUserId: string): Promise<DockyardGroup> {
    const { data } = await apiClient.delete<DockyardGroup>(
      `/groups/${groupId}/members/${memberUserId}`
    );
    return data;
  },
};