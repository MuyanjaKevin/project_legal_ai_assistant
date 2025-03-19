// src/components/Navigation.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation = ({ onLogout }) => {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
      <div className="container">
        <div className="nav-content">
          <div className="nav-logo">
            <Link to="/dashboard">AI Legal Assistant</Link>
          </div>
          
          <div className="nav-links">
            <Link 
              to="/dashboard" 
              className={location.pathname === '/dashboard' ? 'active' : ''}
            >
              Dashboard
            </Link>
            <Link 
              to="/upload" 
              className={location.pathname === '/upload' ? 'active' : ''}
            >
              Upload
            </Link>
            <button onClick={onLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;