// src/components/ContractAnalysis.js
import React, { useState } from 'react';
import './ContractAnalysis.css';

const ContractAnalysis = ({ analysis, isAnalyzing }) => {
  const [activeTab, setActiveTab] = useState('issues');
  
  if (isAnalyzing) {
    return (
      <div className="contract-analysis">
        <div className="analysis-loading">
          <div className="analysis-spinner"></div>
          <p>AI is analyzing your contract...</p>
        </div>
      </div>
    );
  }
  
  if (!analysis) {
    return null;
  }
  
  const { issues = [], suggestions = [], overall_assessment = '', completeness_score = 0 } = analysis;
  
  // Calculate score color based on completeness
  const getScoreColor = (score) => {
    if (score >= 8) return '#22c55e'; // Green
    if (score >= 6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };
  
  const scoreColor = getScoreColor(completeness_score);
  
  return (
    <div className="contract-analysis">
      <h3 className="analysis-title">Contract Analysis</h3>
      
      <div className="analysis-header">
        <div className="completeness-score" style={{ borderColor: scoreColor }}>
          <div className="score-value" style={{ color: scoreColor }}>
            {completeness_score}
            <span className="score-max">/10</span>
          </div>
          <div className="score-label">Completeness</div>
        </div>
        
        <div className="assessment-summary">
          <h4>Overall Assessment</h4>
          <p>{overall_assessment}</p>
        </div>
      </div>
      
      <div className="analysis-tabs">
        <button 
          className={`tab-button ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues {issues.length > 0 && <span className="tab-count">{issues.length}</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          Suggestions {suggestions.length > 0 && <span className="tab-count">{suggestions.length}</span>}
        </button>
      </div>
      
      <div className="analysis-content">
        {activeTab === 'issues' && (
          <div className="issues-list">
            {issues.length > 0 ? (
              issues.map((issue, index) => (
                <div key={index} className="analysis-item">
                  <div className="item-icon">⚠️</div>
                  <div className="item-text">{issue}</div>
                </div>
              ))
            ) : (
              <div className="empty-list">No issues found</div>
            )}
          </div>
        )}
        
        {activeTab === 'suggestions' && (
          <div className="suggestions-list">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div key={index} className="analysis-item">
                  <div className="item-icon">💡</div>
                  <div className="item-text">{suggestion}</div>
                </div>
              ))
            ) : (
              <div className="empty-list">No suggestions available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractAnalysis;