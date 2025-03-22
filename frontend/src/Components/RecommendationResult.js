// src/components/RecommendationResult.js
import React from 'react';
import './RecommendationResult.css';

const RecommendationResult = ({ recommendation, templates, onSelectTemplate }) => {
  if (!recommendation) return null;
  
  const { recommended_template, confidence, reason } = recommendation;
  
  // Find the recommended template from our templates list
  const recommendedTemplate = templates.find(t => t.id === recommended_template);
  
  if (!recommendedTemplate) return null;
  
  // Calculate confidence level class
  const getConfidenceClass = (score) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  };
  
  const confidenceClass = getConfidenceClass(confidence);
  
  return (
    <div className="recommendation-result">
      <h3>AI Recommendation</h3>
      
      <div className="recommended-template">
        <div className={`confidence-badge ${confidenceClass}`}>
          {Math.round(confidence * 100)}% Match
        </div>
        
        <h4>{recommendedTemplate.name}</h4>
        <p className="recommendation-reason">{reason}</p>
        
        <div className="recommendation-actions">
          <button 
            className="use-template-btn"
            onClick={() => onSelectTemplate(recommendedTemplate)}
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationResult;