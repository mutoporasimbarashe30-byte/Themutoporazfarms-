import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types/index.ts';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isWorker: boolean;
  isVet: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; full_name: string; role?: Role; contact_number?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { full_name?: string; contact_number?: string; current_password?: string; new_password?: string }) => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        // Auto-login as default SIMBA on first visit if no token exists yet!
        try {
          const res = await api.post('/auth/login', {
            identifier: 'mutoporasimbarashe30@gmail.com',
            password: 'SimbaFarm2026!',
          });
          setAuthToken(res.token);
          setToken(res.token);
          setUser(res.user);
        } catch (e) {
          console.warn('Initial default login failed:', e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await api.get<User>('/auth/me');
        setUser(profile);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        clearAuthToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.post('/auth/login', { identifier, password });
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const signup = async (data: { email: string; password: string; full_name: string; role?: Role; contact_number?: string }) => {
    const res = await api.post('/auth/signup', data);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: any) => {
    const res = await api.put('/auth/profile', data);
    setUser(res.user);
  };

  // Quick switch for evaluating different roles easily
  const switchDemoRole = async (targetRole: Role) => {
    let identifier = 'mutoporasimbarashe30@gmail.com';
    let password = 'SimbaFarm2026!';
    if (targetRole === 'worker') {
      identifier = 'worker@mutoporaz.com';
      password = 'WorkerPass123!';
    } else if (targetRole === 'vet') {
      identifier = 'vet@mutoporaz.com';
      password = 'VetPass123!';
    }

    await login(identifier, password);
  };

  const isAdmin = user?.role === 'admin';
  const isWorker = user?.role === 'worker';
  const isVet = user?.role === 'vet';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isWorker,
        isVet,
        login,
        signup,
        logout,
        updateProfile,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
