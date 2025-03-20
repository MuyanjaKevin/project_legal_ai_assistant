// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentView from './pages/DocumentView';
import DocumentUpload from './pages/DocumentUpload';
import LandingPage from './pages/LandingPage';
import DocumentComparison from './pages/DocumentComparison';
import Navigation from './Components/Navigation';
import ProtectedRoute from './Components/ProtectedRoute';
import './styles/theme.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  
  useEffect(() => {
    // Check for token on mount, but don't redirect
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setIsAuthLoaded(true);
    
    console.log('App mounted, auth state:', !!token);
    
    // This helps debug issues with token storage
    if (token) {
      console.log(`Token found (first 10 chars): ${token.substring(0, 10)}...`);
    } else {
      console.log('No token found');
    }
  }, []);

  // Update auth state when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    console.log('User logged out');
  };

  // Wait until auth is checked
  if (!isAuthLoaded) {
    return <div className="loading">Loading application...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navigation isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
          />
          
          {/* Protected routes - individual route protection approach */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/documents/:id" 
            element={
              <ProtectedRoute>
                <DocumentView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <DocumentUpload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/compare" 
            element={
              <ProtectedRoute>
                <DocumentComparison />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;