// src/components/TemplateRecommender.js
import React, { useState } from 'react';
import './TemplateRecommender.css';

const TemplateRecommender = ({ onRecommendationReceived, templates }) => {
  const [requirements, setRequirements] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requirements.trim()) {
      setError('Please describe your requirements to get a recommendation');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contracts/recommend-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requirements })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }
      
      const data = await response.json();
      
      // Pass the recommendation to the parent component
      onRecommendationReceived(data.recommendation);
    } catch (err) {
      console.error('Error getting recommendation:', err);
      setError('Failed to generate recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="template-recommender">
      <h3>Need help choosing a template?</h3>
      <p>Describe your requirements and our AI will recommend the best template for you.</p>
      
      {error && <div className="recommender-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="E.g., I need a contract for hiring a new employee in California..."
          rows={4}
          className="requirements-input"
        />
        
        <button 
          type="submit" 
          className="recommend-button"
          disabled={isLoading || !requirements.trim()}
        >
          {isLoading ? 'Getting Recommendation...' : 'Get Recommendation'}
        </button>
      </form>
    </div>
  );
};

export default TemplateRecommender;