// src/pages/DocumentView.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './DocumentView.css';

const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`/api/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`Error fetching document: ${response.status}`);
        }

        const data = await response.json();
        setDocument(data.document);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, navigate]);

  const handleSummarize = async () => {
    if (summarizing) return;
    
    setSummarizing(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/documents/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error generating summary: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error summarizing document:', err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleExtractInfo = async () => {
    if (extracting) return;
    
    setExtracting(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/documents/${id}/extract-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error extracting info: ${response.status}`);
      }

      const data = await response.json();
      setKeyInfo(data.key_info);
    } catch (err) {
      console.error('Error extracting information:', err);
      setError('Failed to extract key information. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  // Fixed renderKeyInfo function to handle objects properly
  const renderKeyInfo = () => {
    if (!keyInfo) return null;
    
    try {
      // Try to parse if it's a string
      let infoObject;
      if (typeof keyInfo === 'string') {
        // Check if it looks like JSON
        if (keyInfo.trim().startsWith('{') || keyInfo.trim().startsWith('[')) {
          infoObject = JSON.parse(keyInfo);
        } else {
          // Not JSON, display as text
          return (
            <div className="key-info-container">
              <h3>Key Information</h3>
              <div className="key-info-content">
                <p>{keyInfo}</p>
              </div>
            </div>
          );
        }
      } else {
        // Already an object
        infoObject = keyInfo;
      }
      
      // Render object properties
      return (
        <div className="key-info-container">
          <h3>Key Information</h3>
          <div className="key-info-content">
            {Object.entries(infoObject).map(([key, value]) => (
              <div key={key} className="info-item">
                <strong>{key}:</strong> {
                  // Check if the value is an object or array
                  typeof value === 'object' && value !== null
                    ? JSON.stringify(value) // Convert nested objects to string
                    : String(value) // Convert any value to string
                }
              </div>
            ))}
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error rendering key info:", e);
      // Fallback render as string
      return (
        <div className="key-info-container">
          <h3>Key Information</h3>
          <div className="key-info-content">
            <p>{String(keyInfo)}</p>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading document...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="not-found-container">
        <h2>Document Not Found</h2>
        <p>The requested document could not be found.</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="document-view">
      <div className="document-header">
        <h1>{document.name}</h1>
        <div className="document-meta">
          <p>Uploaded: {new Date(document.upload_date).toLocaleString()}</p>
          <p>Type: {document.file_type}</p>
        </div>
        <div className="document-actions">
          <button 
            onClick={handleSummarize} 
            disabled={summarizing}
            className="action-button"
          >
            {summarizing ? 'Generating Summary...' : 'Generate Summary'}
          </button>
          <button 
            onClick={handleExtractInfo} 
            disabled={extracting}
            className="action-button"
          >
            {extracting ? 'Extracting Info...' : 'Extract Key Information'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="summary-container">
          <h3>Document Summary</h3>
          <div className="summary-content">
            <p>{summary}</p>
          </div>
        </div>
      )}

      {keyInfo && renderKeyInfo()}

      <div className="document-content">
        <h3>Document Content</h3>
        {document.extracted_text ? (
          <div className="text-content">
            <pre>{document.extracted_text}</pre>
          </div>
        ) : (
          <p>No text content available for this document.</p>
        )}
      </div>

      <div className="view-controls">
        <button onClick={() => navigate('/')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default DocumentView;