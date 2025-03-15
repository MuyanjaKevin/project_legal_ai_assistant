// src/pages/DocumentUpload.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, suggestDocumentCategory } from '../services/api';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Uncategorized');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [useAutoCategory, setUseAutoCategory] = useState(true); // New state for auto-categorization
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
        // Don't set error state here, just use default categories
      }
    };

    fetchCategories();
  }, [navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
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
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('Uploading file:', file.name, 'Category:', category);
      
      // Upload document
      const response = await uploadDocument(formData);
      
      // If auto-categorization is enabled, suggest category
      if (useAutoCategory && response.document_id) {
        setSuggestingCategory(true);
        try {
          console.log('Auto-categorizing document...');
          const categoryResponse = await suggestDocumentCategory(response.document_id);
          console.log('Suggested category:', categoryResponse.category);
          setMessage(`Document uploaded successfully! AI suggested category: ${categoryResponse.category}`);
        } catch (categoryError) {
          console.error('Error suggesting category:', categoryError);
          // Don't fail the upload if category suggestion fails
          setMessage('Document uploaded successfully! (Category suggestion failed)');
        } finally {
          setSuggestingCategory(false);
        }
      } else {
        setMessage('Document uploaded successfully!');
      }
      
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
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