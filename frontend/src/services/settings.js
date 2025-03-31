// src/services/settings.js
import api from './api';

export const getUserProfile = async () => {
  try {
    const response = await api.get('/settings/profile');
    return response.data.profile;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/settings/profile', profileData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getUserPreferences = async () => {
  try {
    const response = await api.get('/settings/preferences');
    return response.data.preferences;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateUserPreferences = async (preferencesData) => {
  try {
    const response = await api.put('/settings/preferences', preferencesData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getApiKeys = async () => {
  try {
    const response = await api.get('/settings/api-keys');
    return response.data.api_keys;
  } catch (error) {
    // If 403 error (not enterprise), return empty array
    if (error.response && error.response.status === 403) {
      return [];
    }
    throw error.response?.data || error.message;
  }
};

export const createApiKey = async (keyName) => {
  try {
    const response = await api.post('/settings/api-keys', { name: keyName });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteApiKey = async (keyId) => {
  try {
    const response = await api.delete(`/settings/api-keys/${keyId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};