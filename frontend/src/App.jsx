import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/profile/ProfilePage';
import SearchPage from './pages/SearchPage';
import Layout from './components/layout/Layout';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — all wrapped in Layout */}
          <Route path="/feed" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
          <Route path="/posts/:id" element={<ProtectedRoute><Layout><PostDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>} />
          <Route path="/profile/:username" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

