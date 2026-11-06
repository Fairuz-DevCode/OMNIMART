import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import API, { setAccessToken } from '../../../shared/services/api';
import { User } from '../../../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isGuest: boolean;
  loginUser: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  registerUser: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updatedData: Partial<User>) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const refreshRes = await API.post("/auth/refresh");
        const token = refreshRes.data.payload.accessToken;

        setAccessToken(token);

        const userRes = await API.get('/users/me');
        const user = userRes.data.payload.user || userRes.data.payload;

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (isMounted) {
          setAccessToken(null);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    initializeAuth();
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isUser = currentUser?.role === 'user';
  const isGuest = currentUser === null;

  const loginUser = useCallback(async (email: string, password: string) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      setAccessToken(response.data.payload.accessToken);
      setCurrentUser(response.data.payload.user);
      return response.data.payload.user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'login gagal coba lagi';
      throw new Error(message);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const response = await API.post('/auth/google', { idToken });
      setAccessToken(response.data.payload.accessToken);
      setCurrentUser(response.data.payload.user);
      return response.data.payload.user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Google login gagal coba lagi';
      throw new Error(message);
    }
  }, []);

  const registerUser = useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await API.post('/auth/register', { name, email, password });
      setAccessToken(response.data.payload.accessToken);
      setCurrentUser(response.data.payload.user);
      return response.data.payload.user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registrasi gagal.';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('error :', error);
    }
    setAccessToken(null);
    setCurrentUser(null);
  }, []);

  const updateProfile = useCallback(async (updatedData: Partial<User>) => {
    try {
      const response = await API.put("/users/me", updatedData);
      const user = response.data.payload.user || response.data.payload;
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Gagal memperbarui profil:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loginUser,
        loginWithGoogle,
        registerUser,
        logout,
        updateProfile,
        currentUser,
        loading,
        isAdmin,
        isUser,
        isGuest,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
