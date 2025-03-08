import api from './api';

export const uploadDocument = async (file, metadata = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add any additional metadata
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getDocuments = async () => {
  try {
    const response = await api.get('/documents');
    return response.data.documents;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};