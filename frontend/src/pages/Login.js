// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Add this import

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const navigate = useNavigate();

  // Clear any existing token when the login page loads
  useEffect(() => {
    localStorage.removeItem('token');
    addDebugMessage('Token cleared from localStorage on login page load');
  }, []);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.login({
        email: formData.email,
        password: formData.password
      });

      const { token } = response;
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Login to AI Legal Assistant</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleLogin} autoComplete="off">
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