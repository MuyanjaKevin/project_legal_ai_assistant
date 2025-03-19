// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found in localStorage, user already logged in');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addDebugMessage = (message) => {
    console.log(message);
    setDebugLog(prev => [...prev, message]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Logging in with email: ${formData.email}`);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      // IMPORTANT: Make sure token is stored in memory and localStorage
      console.log(`Login successful, token: ${data.token.substring(0, 10)}...`);
      
      // Log localStorage before storage
      console.log("localStorage before:", localStorage.getItem('token'));
      
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      
      // Verify token was stored
      console.log("localStorage after:", localStorage.getItem('token'));
      
      // Store user data if available
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Make test request to verify token works
      console.log("Making test request with token");
      const testResponse = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      console.log("Test response status:", testResponse.status);
      
      if (testResponse.status === 200) {
        console.log("Test request successful, token is working!");
      } else {
        console.warn("Test request failed with status:", testResponse.status);
      }
      
      // Force a full page reload to ensure clean state
      window.location.href = '/';
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Login to AI Legal Assistant</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="off"
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="off"
                className="input-field"
              />
            </div>
            
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  <span>Logging in...</span>
                </>
              ) : 'Login'}
            </button>
          </form>
          
          <p className="auth-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
          
          <p className="auth-link">
            <Link to="/">Back to Home</Link>
          </p>
          
          {debugLog.length > 0 && (
            <div className="debug-log" style={{ backgroundColor: '#f5f5f5', padding: '10px', marginTop: '20px', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Debug Log:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {debugLog.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;