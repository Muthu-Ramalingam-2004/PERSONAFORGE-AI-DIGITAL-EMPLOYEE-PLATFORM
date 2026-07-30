import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, signIn, signUp, logout, resetPassword, updateDisplayName } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // Firebase User
  const [dbUser, setDbUser] = useState(null); // Local DB User
  const [loading, setLoading] = useState(true);

  // Synchronize user authentication profile with PostgreSQL database
  const syncWithBackend = async () => {
    try {
      const response = await api.post('/auth/sync');
      if (response.data && response.data.success) {
        setDbUser(response.data.user);
      }
    } catch (error) {
      console.error('Error synchronizing authenticated profile with server:', error);
    }
  };

  useEffect(() => {
    // If we are in mock mode, auth.onAuthStateChanged will be a custom mock listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Sync with PostgreSQL backend database
        try {
          const response = await api.post('/auth/sync');
          if (response.data && response.data.success) {
            setDbUser(response.data.user);
          }
        } catch (error) {
          console.error('Backend sync failed on state change:', error.message);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login handler
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const credential = await signIn(email, password);
      return credential;
    } finally {
      setLoading(false);
    }
  };

  // Registration handler
  const handleRegister = async (email, password, name) => {
    setLoading(true);
    try {
      const credential = await signUp(email, password, name);
      return credential;
    } finally {
      setLoading(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setCurrentUser(null);
      setDbUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Password reset request handler
  const handleResetPassword = async (email) => {
    return await resetPassword(email);
  };

  // Update profile name handler
  const handleUpdateProfile = async (name) => {
    setLoading(true);
    try {
      // 1. Update Firebase Auth Display Name
      await updateDisplayName(name);
      
      // 2. Update Backend PostgreSQL database
      const response = await api.put('/auth/profile', { name });
      if (response.data && response.data.success) {
        setDbUser(response.data.user);
        // Refresh Current User state to reflect displayName change
        setCurrentUser({ ...auth.currentUser });
      }
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    dbUser,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    updateProfile: handleUpdateProfile,
    syncWithBackend
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
