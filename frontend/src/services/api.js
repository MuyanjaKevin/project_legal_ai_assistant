// src/services/api.js

// Create a fetch wrapper that always includes the token
const fetchWithAuth = async (url, options = {}) => {
  // Get the token directly from localStorage
  const token = localStorage.getItem('token');
  
  // Prepare headers with Authorization
  const headers = {
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`Using token: ${token.substring(0, 10)}...`);
  } else {
    console.warn('No token available for request!');
  }
  
  // Return fetch with auth headers
  return fetch(url, {
    ...options,
    headers
  });
};

// Document services
export const getDocuments = async () => {
  try {
    console.log('Fetching documents with auth...');
    const response = await fetchWithAuth('/api/documents/');
    console.log('Documents response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const getDocument = async (id) => {
  try {
    const response = await fetchWithAuth(`/api/documents/${id}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.document;
  } catch (error) {
    console.error(`Error fetching document ${id}:`, error);
    throw error;
  }
};

export const uploadDocument = async (formData) => {
  try {
    const response = await fetchWithAuth('/api/documents/', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Add delete document function
export const deleteDocument = async (docId) => {
  try {
    const response = await fetchWithAuth(`/api/documents/${docId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const suggestDocumentCategory = async (docId) => {
  try {
    const response = await fetchWithAuth(`/api/documents/${docId}/suggest-category`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error suggesting category:', error);
    throw error;
  }
};

export const login = async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export default {
  login,
  register,
  getDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  suggestDocumentCategory
};

