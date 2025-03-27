// src/services/search.js
import api from './api';

/**
 * Search for documents with optional filters
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.q - Search query string
 * @param {string} params.category - Filter by category
 * @param {string} params.start_date - Filter by start date (ISO string)
 * @param {string} params.end_date - Filter by end date (ISO string)
 * @param {string} params.file_type - Filter by file type
 * @param {string} params.status - Filter by document status
 * @param {Array} params.tags - Filter by tags
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.per_page - Results per page (default: 10)
 * @returns {Promise} - Promise resolving to search results
 */
export const searchDocuments = async (params = {}) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string if they exist
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // Handle arrays like tags
          value.forEach(item => {
            if (item) queryParams.append(key, item);
          });
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    const response = await api.get(`/search?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get all available document categories for the current user
 * 
 * @returns {Promise} - Promise resolving to list of categories
 */
export const getCategories = async () => {
  try {
    const response = await api.get('/search/categories');
    return response.data.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get all filter options for search
 * 
 * @returns {Promise} - Promise resolving to filter options (categories, file types, tags, statuses)
 */
export const getFilterOptions = async () => {
  try {
    const response = await api.get('/search/filters');
    return response.data;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get saved searches for the current user
 * 
 * @returns {Promise} - Promise resolving to list of saved searches
 */
export const getSavedSearches = async () => {
  try {
    const response = await api.get('/saved-searches');
    return response.data.saved_searches;
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    throw error.response?.data || error.message;
  }
};

/**
 * Save a search configuration
 * 
 * @param {string} name - Name for the saved search
 * @param {Object} query - The search query parameters
 * @returns {Promise} - Promise resolving to the saved search ID
 */
export const saveSearch = async (name, query) => {
  try {
    const response = await api.post('/saved-searches', {
      name,
      query
    });
    return response.data;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error.response?.data || error.message;
  }
};

/**
 * Delete a saved search
 * 
 * @param {string} searchId - ID of the saved search to delete
 * @returns {Promise} - Promise resolving to success message
 */
export const deleteSavedSearch = async (searchId) => {
  try {
    const response = await api.delete(`/saved-searches/${searchId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    throw error.response?.data || error.message;
  }
};