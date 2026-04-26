import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const isOnboarded = !!user?.isOnboarded;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await apiClient.get('/auth/me');
        setUser(data);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const signInWithGoogle = async () => {
    let credential;
    try {
      credential = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Silently ignore popup closed by user
      if (err?.code === 'auth/popup-closed-by-user') return null;
      throw err;
    }
    const firebaseIdToken = await credential.user.getIdToken();
    const { data } = await apiClient.post('/auth/firebase', { firebaseIdToken });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    // Return the user so callers can read isOnboarded immediately
    return data.user;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (formData) => {
    const { data } = await apiClient.put('/users/profile', formData);
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isOnboarded,
      loading,
      signInWithGoogle,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
