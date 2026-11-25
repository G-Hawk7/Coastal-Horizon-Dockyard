import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { LoginPayload, SignupPayload } from '../api/auth';
import apiClient, {
  getAccessToken,
  setAccessToken,
  setAuthFailureHandler,
} from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInitializing: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Guard so React 19 StrictMode double-mount does not trigger two refresh-token rotations
let initialRestoreStarted = false;
let initialRestorePromise: Promise<User | null> | null = null;

// Tracks an in-flight background logout so an immediate re-login cannot lose its new cookie
let pendingLogoutPromise: Promise<void> | null = null;

function restoreSessionOnce(): Promise<User | null> {
  if (!initialRestoreStarted) {
    initialRestoreStarted = true;
    initialRestorePromise = authApi
      .refresh()
      .then((res) => {
        setAccessToken(res.access_token);
        return res.user;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      });
  }
  return initialRestorePromise ?? Promise.resolve(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  useEffect(() => {
    setAuthFailureHandler((reason?: string) => {
      setUser(null);
      if (reason) {
        setAuthNotice(reason);
      }
    });

    let active = true;
    restoreSessionOnce().then((restoredUser) => {
      if (active) {
        setUser(restoredUser);
        setIsInitializing(false);
      }
    });

    return () => {
      active = false;
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    if (pendingLogoutPromise) {
      await pendingLogoutPromise;
    }
    const res = await authApi.login(payload);
    setAccessToken(res.access_token);
    setUser(res.user);
    setAuthNotice(null);
    return res.user;
  }, []);

  const signup = useCallback(async (payload: SignupPayload): Promise<User> => {
    if (pendingLogoutPromise) {
      await pendingLogoutPromise;
    }
    const res = await authApi.signup(payload);
    setAccessToken(res.access_token);
    setUser(res.user);
    setAuthNotice(null);
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    setAccessToken(null);
    setUser(null);

    const request = apiClient
      .post(
        '/auth/logout',
        {},
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      )
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        if (pendingLogoutPromise === request) {
          pendingLogoutPromise = null;
        }
      });

    pendingLogoutPromise = request;
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const freshUser = await authApi.getMe();
    setUser(freshUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isInitializing,
        authNotice,
        clearAuthNotice,
        login,
        signup,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}