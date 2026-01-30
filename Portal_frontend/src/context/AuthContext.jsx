import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios'; // Import your axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    // Check localStorage on load
    const storedUser = localStorage.getItem("scribe_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("scribe_user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout'); // Clear cookie on backend
    } catch (err) {
      console.error("Logout failed", err);
    }
    setUser(null);
    localStorage.removeItem("scribe_user");
  };

  if (loading) return null; // Prevent flickering

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);