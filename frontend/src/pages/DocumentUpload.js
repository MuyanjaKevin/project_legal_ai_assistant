import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { suggestDocumentCategory } from '../services/api';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Uncategorized');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [useAutoCategory, setUseAutoCategory] = useState(true);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const navigate = useNavigate();

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('/api/documents/categories', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, [navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setMessage(null);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  // Direct upload using fetch API to avoid CORS issues
  const uploadDocumentDirect = async (formData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Attempting document upload with direct fetch...');
    
    const response = await fetch('http://localhost:5000/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type with FormData - browser will set it with proper boundary
      },
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
    }
    
    return await response.json();
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
    formData.append('category', category);
    
    try {
      // Upload document using direct fetch
      const response = await uploadDocumentDirect(formData);
      
      // If auto-categorization is enabled, suggest category
      if (useAutoCategory && response.document_id) {
        setSuggestingCategory(true);
        try {
          const categoryResponse = await suggestDocumentCategory(response.document_id);
          setMessage(`Document uploaded successfully! AI suggested category: ${categoryResponse.category}`);
        } catch (categoryError) {
          console.error('Error suggesting category:', categoryError);
          setMessage('Document uploaded successfully! (Category suggestion failed)');
        } finally {
          setSuggestingCategory(false);
        }
      } else {
        setMessage('Document uploaded successfully!');
      }
      
      // Redirect to dashboard after successful upload
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Default categories if API call fails
  const defaultCategories = [
    "Uncategorized", 
    "Contract", 
    "NDA", 
    "Agreement", 
    "Employment", 
    "Legal Brief",
    "Terms of Service",
    "Privacy Policy",
    "License"
  ];

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

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
        
        <div className="form-group">
          <label htmlFor="category">Document Category</label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={handleCategoryChange}
            className="category-select"
          >
            {displayCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <div className="auto-category-toggle">
            <input
              type="checkbox"
              id="autoCategory"
              checked={useAutoCategory}
              onChange={() => setUseAutoCategory(!useAutoCategory)}
            />
            <label htmlFor="autoCategory">
              Use AI to suggest document category after upload
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="newCategory">Or Add a New Category</label>
          <div className="new-category-input">
            <input
              type="text"
              id="newCategory"
              placeholder="Enter new category name"
              onChange={(e) => {
                if (e.target.value) {
                  setCategory(e.target.value);
                }
              }}
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="upload-button" 
          disabled={loading || suggestingCategory || !file}
        >
          {loading 
            ? 'Uploading...' 
            : suggestingCategory 
              ? 'Suggesting Category...' 
              : 'Upload Document'
          }
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