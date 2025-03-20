import React, { useState } from 'react';
import DocumentSelector from '../Components/DocumentSelector';
import ComparisonView from '../Components/ComparisonView';
import './DocumentComparison.css';

function DocumentComparison() {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDocumentSelect = (docIds) => {
    setSelectedDocs(docIds);
    setError(null);
    // Clear previous comparison when selection changes
    if (comparisonResult) {
      setComparisonResult(null);
    }
  };

  const handleCompare = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Comparing documents:', selectedDocs);
      
      const response = await fetch('/api/documents/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentIds: selectedDocs })
      });
      
      const responseData = await response.json();
      console.log('Server response:', responseData);
      
      if (!response.ok) {
        const errorMessage = responseData.error || `Server returned ${response.status}`;
        console.error('Comparison failed:', errorMessage);
        throw new Error(errorMessage);
      }

      setComparisonResult(responseData.comparison);
    } catch (error) {
      setError(error.message);
      console.error('Comparison failed:', error);
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
      
      {comparisonResult && (
        <ComparisonView result={comparisonResult} />
      )}
    </div>
  );
}

export default DocumentComparison;