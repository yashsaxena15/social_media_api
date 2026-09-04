import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Fetch current user details
          const response = await api.get('users/me/');
          setUser(response.data);
        } catch (error) {
          console.error("Failed to fetch user data", error);
          // Interceptor will handle token refresh or clearing tokens
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('token/', { username, password });
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Fetch user profile after login
      const userResponse = await api.get('users/me/');
      setUser(userResponse.data);
      
      navigate('/feed');
      return { success: true };
    } catch (error) {
      console.error('Login error', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // POST /api/users/me/ creates a user per our router. Wait, the endpoint is actually
      // POST /api/users/ which registers the user?
      // Let's check the backend endpoint for registration.
      // Usually DRF DefaultRouter for 'users' viewset handles POST to /api/users/
      await api.post('users/me/', userData);
      
      // Auto-login after registration
      return await login(userData.username, userData.password);
    } catch (error) {
      console.error('Registration error', error);
      let message = 'Registration failed';
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          message = Object.values(errors).map(err => Array.isArray(err) ? err[0] : err).join(', ');
        }
      }
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/');
  };

  const contextValue = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
