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

// Updated upload document function using fetch instead of axios
export const uploadDocument = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    
    console.log('Attempting document upload with fetch API...');
    
    // Use the Fetch API directly for more control
    const response = await fetch('http://localhost:5000/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type with FormData, browser will set it with boundary
      },
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Upload successful:', result);
    return result;
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

// New contract-related functions
export const getTemplates = async () => {
  try {
    const response = await api.get('/contracts/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

export const getTemplateFields = async (templateId) => {
  try {
    const response = await api.get(`/contracts/template/${templateId}/fields`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching fields for template ${templateId}:`, error);
    throw error;
  }
};

export const suggestFields = async (templateId, context) => {
  try {
    const response = await api.post(`/contracts/template/${templateId}/suggest-fields`, { context });
    return response.data;
  } catch (error) {
    console.error('Error getting field suggestions:', error);
    throw error;
  }
};

export const generateContractHtml = async (templateId, formData) => {
  try {
    const response = await api.post('/contracts/generate-html', {
      templateId,
      formData
    });
    return response.data;
  } catch (error) {
    console.error('Error generating contract HTML:', error);
    throw error;
  }
};

export const analyzeContract = async (contractId) => {
  try {
    const response = await api.post(`/contracts/${contractId}/analyze`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing contract:', error);
    throw error;
  }
};

export const recommendTemplate = async (requirements) => {
  try {
    const response = await api.post('/contracts/recommend-template', { requirements });
    return response.data;
  } catch (error) {
    console.error('Error recommending template:', error);
    throw error;
  }
};

// Auth services
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

// Export both the axios instance methods and the service functions
export default {
  // Core axios methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
  
  // Service functions
  login,
  register,
  getDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  suggestDocumentCategory,
  compareDocuments,
  generateContract,
  verifyToken,
  
  // New contract functions
  getTemplates,
  getTemplateFields,
  suggestFields,
  generateContractHtml,
  analyzeContract,
  recommendTemplate
};