import React, { useState, useEffect } from 'react';
import './DocumentSelector.css';

function DocumentSelector({ onSelect }) {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Add this to include cookies
      });

      if (response.status === 401) {
        localStorage.removeItem('token'); // Clear invalid token
        window.location.href = '/login'; // Redirect to login
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      setError(error.message);
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
  if (error) return <div className="error-message">⚠️ {error}</div>;
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