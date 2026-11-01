import { apiClient } from './client';

export interface Berth {
  id: string;
  berth_number: string;
  max_length_meters: number;
  max_draft_meters: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE';
  created_at?: string;
  updated_at?: string;
}

export type BerthCreate = {
  berth_number: string;
  max_length_meters: number;
  max_draft_meters: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE';
};

export type BerthUpdate = Partial<BerthCreate>;

export const fetchBerths = async (): Promise<Berth[]> => {
  const response = await apiClient.get<Berth[]>('/berths');
  return response.data;
};

export const createBerth = async (data: BerthCreate): Promise<Berth> => {
  const response = await apiClient.post<Berth>('/berths', data);
  return response.data;
};

export const updateBerth = async (id: string, data: BerthUpdate): Promise<Berth> => {
  const response = await apiClient.put<Berth>(`/berths/${id}`, data);
  return response.data;
};

export const deleteBerth = async (id: string): Promise<void> => {
  await apiClient.delete(`/berths/${id}`);
};