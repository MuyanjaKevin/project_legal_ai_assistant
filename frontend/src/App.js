// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentView from './pages/DocumentView';
import DocumentUpload from './pages/DocumentUpload';
import { getAuthToken } from './utils/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const token = getAuthToken();
    setIsAuthenticated(!!token);
    setCheckingAuth(false);
    
    console.log('App mounted, auth state:', !!token);
    
    // This helps debug issues with token storage
    if (token) {
      console.log(`Token found (first 10 chars): ${token.substring(0, 10)}...`);
    } else {
      console.log('No token found');
    }
  }, []);

  // Wait until we've checked authentication
  if (checkingAuth) {
    return <div className="loading">Initializing application...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/documents/:id" 
            element={isAuthenticated ? <DocumentView /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/upload" 
            element={isAuthenticated ? <DocumentUpload /> : <Navigate to="/login" />} 
          />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;