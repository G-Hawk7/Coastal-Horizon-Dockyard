import apiClient, { refreshSessionRequest } from './client';
import type { AuthTokenResponse, User, UserSession } from '../types';

export interface SignupPayload {
  username: string;
  email: string;
  full_name: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  email?: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export const authApi = {
  async signup(payload: SignupPayload): Promise<AuthTokenResponse> {
    const { data } = await apiClient.post<AuthTokenResponse>('/auth/signup', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthTokenResponse> {
    const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', payload);
    return data;
  },

  async refresh(): Promise<AuthTokenResponse> {
    return refreshSessionRequest();
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    const { data } = await apiClient.patch<User>('/auth/me', payload);
    return data;
  },

  async changePassword(payload: PasswordChangePayload): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload);
    return data;
  },

  async listSessions(): Promise<UserSession[]> {
    const { data } = await apiClient.get<UserSession[]>('/auth/sessions');
    return data;
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
    return data;
  },
};