import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for active session
    const savedToken = localStorage.getItem('gym_token');
    const savedGym = localStorage.getItem('gym_user');

    if (savedToken && savedGym) {
      setToken(savedToken);
      try {
        setGym(JSON.parse(savedGym));
      } catch (e) {
        console.error('Error parsing stored gym data:', e);
        localStorage.removeItem('gym_token');
        localStorage.removeItem('gym_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, gymData) => {
    setToken(newToken);
    setGym(gymData);
    localStorage.setItem('gym_token', newToken);
    localStorage.setItem('gym_user', JSON.stringify(gymData));
  };

  const logout = () => {
    setToken(null);
    setGym(null);
    localStorage.removeItem('gym_token');
    localStorage.removeItem('gym_user');
    // Force reload window to clear states
    window.location.reload();
  };

  const value = {
    token,
    gym,
    isAuthenticated: !!token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }
  return context;
}
