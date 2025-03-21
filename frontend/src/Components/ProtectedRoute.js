import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Token verification failed');
        }

        const data = await response.json();
        if (data.valid) {
          setIsValid(true);
        } else {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  if (isVerifying) {
    return <div>Verifying authentication...</div>;
  }

  return isValid ? children : null;
};

export default ProtectedRoute;