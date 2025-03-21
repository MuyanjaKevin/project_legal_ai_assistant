// src/components/Navigation.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="main-nav">
      <div className="container">
        <div className="nav-content">
          <div className="nav-logo">
            <Link to="/">Legal AI Assistant</Link>
          </div>
          
          <div className="nav-links">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/upload">Upload Document</Link>
                <Link to="/compare">Compare Documents</Link>
                <Link to="/contracts">Generate Contracts</Link>
                <button className="nav-button" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;