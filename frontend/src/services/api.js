import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Using token: ${token.substring(0, 10)}...`);
    } else {
      console.warn('No token available for request!');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Document services
export const getDocuments = async () => {
  try {
    console.log('Fetching documents with auth...');
    const response = await api.get('/documents');
    return response.data.documents || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const getDocument = async (id) => {
  try {
    const response = await api.get(`/documents/${id}`);
    return response.data.document;
  } catch (error) {
    console.error(`Error fetching document ${id}:`, error);
    throw error;
  }
};

export const uploadDocument = async (formData) => {
  try {
    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const deleteDocument = async (docId) => {
  try {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const suggestDocumentCategory = async (docId) => {
  try {
    const response = await api.post(`/documents/${docId}/suggest-category`);
    return response.data;
  } catch (error) {
    console.error('Error suggesting category:', error);
    throw error;
  }
};

export const compareDocuments = async (documentIds) => {
  try {
    const response = await api.post('/documents/compare', { documentIds });
    return response.data;
  } catch (error) {
    console.error('Error comparing documents:', error);
    throw error;
  }
};

export const generateContract = async (templateId, formData, outputFormat) => {
  try {
    const response = await api.post('/contracts/generate', {
      templateId,
      formData,
      outputFormat
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error generating contract');
  }
};

export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;
    localStorage.setItem('token', token);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const verifyToken = async () => {
  try {
    const response = await api.get('/auth/verify');
    return response.data;
  } catch (error) {
    console.error('Token verification error:', error);
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
  suggestDocumentCategory,
  compareDocuments,
  generateContract,
  verifyToken
};

