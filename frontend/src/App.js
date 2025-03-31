import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentView from './pages/DocumentView';
import DocumentUpload from './pages/DocumentUpload';
import LandingPage from './pages/LandingPage';
import DocumentComparison from './pages/DocumentComparison';
import ContractGenerator from './pages/ContractGenerator';
import EnhancedContractGenerator from './pages/EnhancedContractGenerator';
import SearchPage from './pages/SearchPage';
import UserSettings from './pages/UserSettings';
import Navigation from './Components/Navigation';
import ProtectedRoute from './Components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import './styles/theme.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    console.log('User logged out');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Navigation isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <LandingPage />} />
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/register" 
              element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
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
                isAuthenticated ? <DocumentUpload /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/compare" 
              element={
                isAuthenticated ? <DocumentComparison /> : <Navigate to="/login" />
              } 
            />
            
            {/* New search route */}
            <Route 
              path="/search" 
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Settings route */}
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Contract generation routes */}
            <Route 
              path="/contracts" 
              element={
                <ProtectedRoute>
                  <EnhancedContractGenerator />
                </ProtectedRoute>
              } 
            />
            
            {/* Keep the original route accessible at /contracts/basic for backward compatibility */}
            <Route 
              path="/contracts/basic" 
              element={
                <ProtectedRoute>
                  <ContractGenerator />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;