// src/pages/DocumentView.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { deleteDocument } from '../services/api';
import '../App.css';
import LoadingSpinner from '../Components/LoadingSpinner';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    try {
      await deleteDocument(id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
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

  const renderKeyInfo = () => {
    if (!keyInfo) return null;
    
    // Super aggressive text cleaning function
    const cleanAndParseText = (text) => {
      // Convert to string if not already
      let str = String(text);
      
      // Try to identify JSON structure in the text
      const jsonRegex = /{[^}]*"[^"]*"[^}]*}/;
      const match = str.match(jsonRegex);
      
      if (match) {
        try {
          // Extract what looks like JSON
          return JSON.parse(match[0]);
        } catch (e) {
          // If parsing fails, continue with cleaning
        }
      }
      
      // Remove quotes and other non-data characters
      str = str.replace(/^["']+|["']+$/g, '')  // Remove surrounding quotes
              .replace(/\\"/g, '"')          // Replace escaped quotes
              .replace(/\\n/g, ' ')          // Replace newlines with spaces
              .replace(/json\s*/, '')        // Remove "json" word
              .replace(/[\\]{1,}/g, '')      // Remove backslashes
              .trim();
      
      // Extract key-value pairs using regex
      const keyValuePairs = {};
      
      // Extract Parties object
      const partiesMatch = str.match(/"Parties"\s*:\s*{([^}]*)}/);
      if (partiesMatch) {
        const partiesObj = {};
        const disclosingMatch = partiesMatch[1].match(/"Disclosing Party"\s*:\s*"([^"]*)"/);
        const receivingMatch = partiesMatch[1].match(/"Receiving Party"\s*:\s*"([^"]*)"/);
        
        if (disclosingMatch) partiesObj["Disclosing Party"] = disclosingMatch[1];
        if (receivingMatch) partiesObj["Receiving Party"] = receivingMatch[1];
        
        keyValuePairs["Parties"] = partiesObj;
      }
      
      // Extract other fields
      const effectiveDateMatch = str.match(/"Effective Date"\s*:\s*"([^"]*)"/);
      if (effectiveDateMatch) keyValuePairs["Effective Date"] = effectiveDateMatch[1];
      
      const termMatch = str.match(/"Term\/Duration"\s*:\s*"([^"]*)"/);
      if (termMatch) keyValuePairs["Term/Duration"] = termMatch[1];
      
      const lawMatch = str.match(/"Governing Law"\s*:\s*"([^"]*)"/);
      if (lawMatch) keyValuePairs["Governing Law"] = lawMatch[1];
      
      return Object.keys(keyValuePairs).length > 0 ? keyValuePairs : { "Raw Text": str };
    };
    
    // Process the key info
    let processedInfo;
    try {
      // First try normal JSON parsing if it's a string
      if (typeof keyInfo === 'string') {
        try {
          processedInfo = JSON.parse(keyInfo);
        } catch (e) {
          // If that fails, use our aggressive cleaner
          console.log("Standard JSON parsing failed, using text extraction");
          processedInfo = cleanAndParseText(keyInfo);
        }
      } else {
        // Already an object
        processedInfo = keyInfo;
      }
      
      // Render the processed info
      return (
        <div className="key-info-container">
          <h3>Key Information</h3>
          <div className="key-info-content">
            <dl className="info-list">
              {Object.entries(processedInfo).map(([key, value]) => (
                <div key={key} className="info-item">
                  <dt className="info-term">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                  <dd className="info-definition">
                    {typeof value === 'object' && value !== null 
                      ? Object.entries(value).map(([subKey, subVal]) => (
                          <span key={subKey}><strong>{subKey}:</strong> {subVal}<br /></span>
                        ))
                      : String(value)
                    }
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error rendering key info:", e);
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

  return (
    <div className="document-view">
      <div className="document-header">
        <h1>{document.name}</h1>
        <div className="document-meta">
          <p>Uploaded: {new Date(document.upload_date).toLocaleString()}</p>
          <p>Type: {document.file_type}</p>
          {document.category && <p>Category: {document.category}</p>}
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
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="action-button delete-button"
          >
            Delete Document
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

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation">
            <h3>Delete Document</h3>
            <p>Are you sure you want to delete this document? This action cannot be undone.</p>
            <div className="delete-confirmation-actions">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
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

      {summarizing && (
        <div className="loading-overlay">
          <div className="loading-content">
            <LoadingSpinner size="lg" />
            <p>Generating summary with AI...</p>
          </div>
        </div>
      )}

      {extracting && (
        <div className="loading-overlay">
          <div className="loading-content">
            <LoadingSpinner size="lg" />
            <p>Extracting key information with AI...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentView;