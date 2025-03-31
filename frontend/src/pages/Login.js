// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Clear any existing token when the login page loads
  useEffect(() => {
    localStorage.removeItem('token');
    // Debug message removed
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // We'll keep this function but not display the messages
  const addDebugMessage = (message) => {
    console.log(message); // Still log to console for your debugging
    // But don't add to state anymore
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
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
          
          {/* Debug log section removed */}
        </div>
      </div>
    </div>
  );
};

export default Login;