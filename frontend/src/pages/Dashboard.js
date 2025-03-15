// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteDocument } from '../services/api';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Create a memoized logout function that won't change on re-renders
  const handleLogout = useCallback(() => {
    console.log('Executing logout');
    
    // Set a flag in sessionStorage to indicate intentional logout
    sessionStorage.setItem('loggedOut', 'true');
    
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Force a complete page reload to clear any React state
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    // Check if this is a post-logout reload
    if (sessionStorage.getItem('loggedOut') === 'true') {
      // Clear the flag
      sessionStorage.removeItem('loggedOut');
      // We're already on the correct page
      return;
    }
    
    const loadDocuments = async () => {
      try {
        // Get token directly from localStorage with detailed logging
        const token = localStorage.getItem('token');
        console.log('Dashboard: Token check:', token ? 'Found' : 'Not found');
        
        if (!token) {
          console.error('No authentication token found');
          navigate('/login');
          return;
        }
        
        // Create headers explicitly and log them
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${token}`);
        headers.append('Content-Type', 'application/json');
        
        // Use proxy instead of direct URL (and include trailing slash)
        console.log('Dashboard: Fetching documents...');
        const response = await fetch('/api/documents/', {
          method: 'GET',
          headers: headers
        });
        
        console.log('Dashboard: Response status:', response.status);
        
        // Handle response status
        if (response.status === 401) {
          console.error('Authentication failed in dashboard');
          // Use the dedicated logout function
          handleLogout();
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Process response data
        const data = await response.json();
        console.log(`Dashboard: Retrieved ${data.documents ? data.documents.length : 0} documents`);
        setDocuments(data.documents || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading documents:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadDocuments();
  }, [navigate, handleLogout]);

  // Immediate check for token before rendering
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !sessionStorage.getItem('loggedOut')) {
      console.log('No token detected, redirecting immediately');
      navigate('/login');
    }
  }, [navigate]);

  const handleDeleteClick = (e, docId) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    setDocumentToDelete(docId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete || deleting) return;
    
    setDeleting(true);
    try {
      await deleteDocument(documentToDelete);
      // Update documents list by filtering out the deleted one
      setDocuments(documents.filter(doc => doc._id !== documentToDelete));
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading your documents...</h2>
        <p>Please wait while we retrieve your documents.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Error Loading Documents</h2>
        <p>{error}</p>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
          <button 
            onClick={handleLogout} 
            className="logout-button" 
            style={{ marginLeft: '10px' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Document Dashboard</h1>
        <div>
          <Link to="/upload" className="upload-button" style={{ marginRight: '10px' }}>Upload Document</Link>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </header>
      
      <div className="documents-container">
        <h2>Your Documents</h2>
        
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any documents yet.</p>
            <Link to="/upload" className="button">Upload Your First Document</Link>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map(doc => (
              <div key={doc._id} className="document-card">
                <h3>{doc.name}</h3>
                <p>Type: {doc.file_type}</p>
                <p>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</p>
                <div className="document-actions">
                  <Link to={`/documents/${doc._id}`} className="view-link">View & Analyze</Link>
                  <button 
                    onClick={(e) => handleDeleteClick(e, doc._id)}
                    className="delete-link"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation">
            <h3>Delete Document</h3>
            <p>Are you sure you want to delete this document? This action cannot be undone.</p>
            <div className="delete-confirmation-actions">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDocumentToDelete(null);
                }} 
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className="delete-confirm-button"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;