// src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="hero">
        <div className="container">
          <h1>AI Legal Assistant</h1>
          <p className="hero-subtitle">
            Intelligent document analysis and management for legal professionals
          </p>
          <div className="hero-cta">
            <Link to="/register" className="button button-primary">Get Started</Link>
            <Link to="/login" className="button button-secondary">Login</Link>
          </div>
        </div>
      </header>

      <section className="features">
        <div className="container">
          <h2 className="section-title text-center">Key Features</h2>
          
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Document Management</h3>
              <p>Easily upload, categorize, and manage your legal documents in one secure place.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>AI-Powered Analysis</h3>
              <p>Extract key information and generate summaries of complex legal documents instantly.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏷️</div>
              <h3>Smart Categorization</h3>
              <p>Our AI automatically suggests categories for your documents based on content analysis.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Storage</h3>
              <p>Your legal documents are encrypted and stored securely with controlled access.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title text-center">How It Works</h2>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Documents</h3>
              <p>Upload your legal documents in PDF, DOCX, or TXT format.</p>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our AI will process your documents to extract key information and generate summaries.</p>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3>Review & Organize</h3>
              <p>Review the analysis, organize documents by categories, and access them anytime.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2025 AI Legal Assistant. All rights reserved.</p>
          <p>A powerful tool for legal professionals.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;