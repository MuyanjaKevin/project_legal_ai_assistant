import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Update this import
import DocumentSelector from '../Components/DocumentSelector';
import ComparisonView from '../Components/ComparisonView';
import './DocumentComparison.css';

function DocumentComparison() {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      
      const response = await api.post('/documents/compare', {
        documentIds: selectedDocs
      });

      setComparisonResult(response.data);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.response?.data?.message || 'Failed to compare documents');
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