// src/pages/DocumentUpload.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('Uploading file:', file.name);
      console.log('Using token (first 15 chars):', token.substring(0, 15) + '...');
      
      // Make direct request to backend
      const response = await fetch('http://localhost:5000/api/documents/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type for FormData
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      setMessage('Document uploaded successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h1>Upload Document</h1>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="document">Select a document (PDF, DOCX, or TXT)</label>
          <input 
            type="file" 
            id="document" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
          />
        </div>
        
        <button 
          type="submit" 
          className="upload-button" 
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
      
      <button 
        className="back-button" 
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default DocumentUpload;