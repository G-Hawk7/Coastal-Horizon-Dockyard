import apiClient from './client';
import type {
  Berth,
  BerthCreatePayload,
  BerthUpdatePayload,
} from '../types';

export interface BerthListParams {
  group_id?: string;
  status?: string;
  search?: string;
}

export const berthsApi = {
  async list(params?: BerthListParams): Promise<Berth[]> {
    const cleanParams = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')
    );
    const { data } = await apiClient.get<Berth[]>('/berths', { params: cleanParams });
    return data;
  },

  async getById(berthId: string): Promise<Berth> {
    const { data } = await apiClient.get<Berth>(`/berths/${berthId}`);
    return data;
  },

  async create(payload: BerthCreatePayload): Promise<Berth> {
    const { data } = await apiClient.post<Berth>('/berths', payload);
    return data;
  },

  async update(berthId: string, payload: BerthUpdatePayload): Promise<Berth> {
    const { data } = await apiClient.patch<Berth>(`/berths/${berthId}`, payload);
    return data;
  },

  async assign(berthId: string, assignedToId: string | null): Promise<Berth> {
    const { data } = await apiClient.patch<Berth>(`/berths/${berthId}/assign`, {
      assigned_to_id: assignedToId,
    });
    return data;
  },

  async remove(berthId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/berths/${berthId}`);
    return data;
  },
};