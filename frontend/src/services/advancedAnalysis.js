// frontend/src/services/advancedAnalysis.js

import api from './api';

export const assessContractRisks = async (documentId) => {
  try {
    const response = await api.post(`/advanced-analysis/risk-assessment/${documentId}`);
    return response.data.results;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getClauseRecommendations = async (documentId, clauseText = null) => {
  try {
    const response = await api.post(`/advanced-analysis/clause-recommendations/${documentId}`, 
      clauseText ? { clause_text: clauseText } : {}
    );
    return response.data.results;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const findSimilarPrecedents = async (documentId, query = null) => {
  try {
    const response = await api.post(`/advanced-analysis/precedent-matching/${documentId}`, 
      query ? { query } : {}
    );
    return response.data.results;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const checkCompliance = async (documentId, jurisdiction = null, regulationType = null) => {
  try {
    const response = await api.post(`/advanced-analysis/compliance-check/${documentId}`, {
      jurisdiction,
      regulation_type: regulationType
    });
    return response.data.results;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};