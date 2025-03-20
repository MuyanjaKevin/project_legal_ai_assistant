// src/Components/ProtectedRoute.js
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAuthentication = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          if (isMounted) {
            setIsChecking(false);
            setIsAuthenticated(false);
          }
          return;
        }
        
        if (isMounted) {
          setIsChecking(false);
          setIsAuthenticated(true);
        }
        
      } catch (error) {
        console.error('Authentication verification error:', error);
        if (isMounted) {
          setIsChecking(false);
          setIsAuthenticated(false);
        }
      }
    };
    
    verifyAuthentication();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="auth-loading">
        <p>Verifying authentication...</p>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('Token invalid, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Render children if authenticated
  return children || <Outlet />;
};

export default ProtectedRoute;