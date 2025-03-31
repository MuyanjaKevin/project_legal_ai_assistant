// frontend/src/services/translation.js

import api from './api';

export const getSupportedLanguages = async () => {
  try {
    const response = await api.get('/translation/languages');
    return response.data.languages;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const detectLanguage = async (text) => {
  try {
    const response = await api.post('/translation/detect', { text });
    return response.data.detected_language;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const translateDocument = async (documentId, targetLanguage = 'en') => {
  try {
    const response = await api.post(`/translation/document/${documentId}`, {
      target_language: targetLanguage
    });
    return response.data.translation;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const translateSearchQuery = async (query, targetLanguages = null) => {
  try {
    const response = await api.post('/translation/search-query', {
      query,
      target_languages: targetLanguages
    });
    return response.data.translations;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};