import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocumentSelector.css';

function DocumentSelector({ onSelect }) {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No need to redirect here since parent component will handle it
        throw new Error('Authentication token not found');
      }
      
      console.log('Using token (first 10 chars):', token.substring(0, 10));
      
      const response = await fetch('/api/documents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        // Token is invalid, let parent component handle redirection
        throw new Error('Session expired. Please login again.');
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Documents API response:', data);
      
      // Handle different response formats
      if (data.documents) {
        setDocuments(data.documents);
      } else if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        console.error('Unexpected data structure:', data);
        throw new Error('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(`Failed to load documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (docId) => {
    const updatedSelection = selected.includes(docId)
      ? selected.filter(id => id !== docId)
      : [...selected, docId];
    setSelected(updatedSelection);
    onSelect(updatedSelection);
  };

  if (loading) return <div className="loading-message">Loading documents...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (documents.length === 0) return <div className="info-message">No documents available for comparison.</div>;

  return (
    <div className="document-selector">
      <h3>Select Documents to Compare (minimum 2)</h3>
      <div className="documents-grid">
        {documents.map(doc => (
          <div 
            key={doc._id} 
            className={`doc-item ${selected.includes(doc._id) ? 'selected' : ''}`}
            onClick={() => handleSelect(doc._id)}
          >
            <span className="doc-title">{doc.name || doc.title || 'Untitled'}</span>
            <span className="doc-type">{doc.file_type}</span>
            {doc.category && <span className="doc-category">{doc.category}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentSelector;