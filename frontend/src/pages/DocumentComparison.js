import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocumentComparison.css';

function DocumentComparison() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch documents on initial load
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Use fetch directly instead of axios
        const response = await fetch('http://localhost:5000/api/documents', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err) {
        setError(`Failed to load documents: ${err.message}`);
      }
    };
    
    fetchDocuments();
  }, [navigate]);

  // Toggle document selection
  const toggleDocument = (docId) => {
    setSelectedDocs(prev => {
      const isSelected = prev.includes(docId);
      return isSelected 
        ? prev.filter(id => id !== docId) 
        : [...prev, docId];
    });
  };

  // Handle document comparison
  const handleCompare = async () => {
    if (selectedDocs.length < 2) {
      setError("Please select at least 2 documents to compare");
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
      
      // Direct fetch approach
      const response = await fetch('http://localhost:5000/api/documents/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          documentIds: selectedDocs
        })
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      setComparisonResult(result);
    } catch (err) {
      setError(`Failed to compare documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (fileType) => {
    switch(fileType?.toLowerCase()) {
      case 'pdf':
        return <div className="doc-icon pdf-icon">PDF</div>;
      case 'docx':
        return <div className="doc-icon docx-icon">DOCX</div>;
      case 'txt':
        return <div className="doc-icon txt-icon">TXT</div>;
      default:
        return <div className="doc-icon">DOC</div>;
    }
  };

  return (
    <div className="comparison-page">
      <h2>Document Comparison</h2>
      
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      
      <div className="comparison-container">
        <div className="document-selection-section">
          <h3>Select Documents to Compare</h3>
          
          {documents.length === 0 ? (
            <div className="empty-state">
              <p>No documents available for comparison.</p>
              <button 
                className="action-button secondary" 
                onClick={() => navigate('/upload')}
              >
                Upload Documents
              </button>
            </div>
          ) : (
            <>
              <div className="documents-grid">
                {documents.map(doc => (
                  <div 
                    key={doc._id}
                    className={`document-card ${selectedDocs.includes(doc._id) ? 'selected' : ''}`}
                    onClick={() => toggleDocument(doc._id)}
                  >
                    <div className="document-card-inner">
                      {getDocumentIcon(doc.file_type)}
                      <div className="document-details">
                        <h3 className="document-name">{doc.name}</h3>
                        <div className="document-meta">
                          {doc.category && <span className="document-category">{doc.category}</span>}
                          <span className="document-date">
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {selectedDocs.includes(doc._id) && (
                        <div className="selection-badge">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="selection-summary">
                <h3>{selectedDocs.length} document(s) selected</h3>
                
                {selectedDocs.length >= 2 ? (
                  <button 
                    className="action-button primary"
                    onClick={handleCompare}
                    disabled={loading}
                  >
                    {loading ? 'Comparing...' : 'Compare Documents'}
                  </button>
                ) : (
                  <p className="hint-text">Please select at least two documents to compare</p>
                )}
              </div>
            </>
          )}
        </div>
        
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Comparing documents...</p>
          </div>
        )}
        
        {comparisonResult && (
          <div className="comparison-results-section">
            <h3>Comparison Results</h3>
            
            <div className="similarity-score">
              <h4>Similarity Score</h4>
              <div className="score-container">
                <div className="score-value">
                  {comparisonResult.comparison.similarity_score}%
                </div>
                <div className="score-bar-container">
                  <div 
                    className="score-bar" 
                    style={{ 
                      width: `${comparisonResult.comparison.similarity_score}%`,
                      backgroundColor: comparisonResult.comparison.similarity_score > 75 
                        ? '#4CAF50' 
                        : comparisonResult.comparison.similarity_score > 50 
                          ? '#FFC107' 
                          : '#F44336'
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="changes-summary">
              <div className="change-stat">
                <div className="stat-label">Added</div>
                <div className="stat-value added">
                  {comparisonResult.comparison.summary.added_lines}
                </div>
              </div>
              <div className="change-stat">
                <div className="stat-label">Removed</div>
                <div className="stat-value removed">
                  {comparisonResult.comparison.summary.removed_lines}
                </div>
              </div>
              <div className="change-stat">
                <div className="stat-label">Modified</div>
                <div className="stat-value modified">
                  {comparisonResult.comparison.summary.modified_lines}
                </div>
              </div>
            </div>
            
            <div className="diff-container">
              <h4>Text Differences</h4>
              <div className="diff-content">
                {comparisonResult.comparison.diff.slice(0, 100).map((line, index) => (
                  <div 
                    key={index} 
                    className={`diff-line ${
                      line.startsWith('+') ? 'added-line' :
                      line.startsWith('-') ? 'removed-line' :
                      line.startsWith('?') ? 'modified-line' : 'unchanged-line'
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {comparisonResult.comparison.diff.length > 100 && (
                  <div className="diff-more">
                    ... and {comparisonResult.comparison.diff.length - 100} more lines
                  </div>
                )}
              </div>
            </div>
            
            <div className="analysis-section">
              <h4>Analysis</h4>
              <p>
                {comparisonResult.comparison.similarity_score > 90 
                  ? 'The documents are nearly identical with only minor differences.'
                  : comparisonResult.comparison.similarity_score > 70
                    ? 'The documents have significant similarities with some notable differences.'
                    : comparisonResult.comparison.similarity_score > 40
                      ? 'The documents share some content but have substantial differences.'
                      : 'The documents are considerably different from each other.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentComparison;