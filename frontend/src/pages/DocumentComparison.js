import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentSelector from '../Components/DocumentSelector';
import ComparisonView from '../Components/ComparisonView';
import './DocumentComparison.css';

function DocumentComparison() {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Verify authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        // Verify the token is valid
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('Auth verification failed');
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleDocumentSelect = (docIds) => {
    setSelectedDocs(docIds);
    setError(null);
    if (comparisonResult) {
      setComparisonResult(null);
    }
  };

  const handleCompare = async () => {
    if (selectedDocs.length < 2) {
      setError('Please select at least 2 documents to compare');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Direct fetch approach that bypasses axios and any potential middleware issues
      const response = await fetch('http://localhost:5000/api/documents/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentIds: selectedDocs
        }),
        credentials: 'include'  // Important for CORS with credentials
      });
      
      if (response.status === 401) {
        console.error('Authentication failed for comparison');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error: ${response.status}` }));
        throw new Error(errorData.error || 'Failed to compare documents');
      }
      
      const data = await response.json();
      console.log('Comparison result:', data);
      
      setComparisonResult(data);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to compare documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comparison-container">
      <h2>Document Comparison</h2>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <DocumentSelector onSelect={handleDocumentSelect} />
      
      {selectedDocs.length >= 2 ? (
        <button 
          className="compare-btn" 
          onClick={handleCompare}
          disabled={loading}
        >
          {loading ? 'Comparing...' : 'Compare Documents'}
        </button>
      ) : (
        <div className="info-message">Please select at least 2 documents to compare</div>
      )}
      
      {loading && <div className="loading">Processing comparison...</div>}
      
      {comparisonResult && <ComparisonView result={comparisonResult} />}
    </div>
  );
}

export default DocumentComparison;