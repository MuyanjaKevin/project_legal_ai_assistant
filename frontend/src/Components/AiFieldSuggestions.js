// src/Components/AiFieldSuggestions.js
import React, { useState } from 'react';
import './AiFieldSuggestions.css';

const AiFieldSuggestions = ({ 
  templateId, 
  formData, 
  onApplySuggestion, 
  onApplyAll,
  isGeneratingSuggestions,
  suggestions 
}) => {
  const [expandedField, setExpandedField] = useState(null);

  // Toggle field expansion
  const toggleField = (fieldId) => {
    setExpandedField(expandedField === fieldId ? null : fieldId);
  };

  // Apply a single suggestion
  const handleApplySuggestion = (fieldId) => {
    // Handle both object format and string format suggestions
    const suggestionValue = typeof suggestions[fieldId] === 'object' 
      ? suggestions[fieldId].value 
      : suggestions[fieldId];
      
    onApplySuggestion(fieldId, suggestionValue);
    setExpandedField(null); // Collapse after applying
  };

  // Check if we have any suggestions
  const hasSuggestions = suggestions && Object.keys(suggestions).length > 0;

  if (isGeneratingSuggestions) {
    return (
      <div className="ai-suggestions-container">
        <div className="ai-generating">
          <div className="ai-spinner"></div>
          <p>AI is generating suggestions for your contract...</p>
        </div>
      </div>
    );
  }

  if (!hasSuggestions) {
    return (
      <div className="ai-suggestions-container">
        <div className="ai-suggestions-empty">
          <p>No AI suggestions available for this contract type.</p>
          <p>Fill in some of the form fields first to get targeted suggestions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions-container">
      <div className="ai-suggestions-header">
        <h3>AI Suggestions</h3>
        {hasSuggestions && (
          <button 
            className="apply-all-button"
            onClick={onApplyAll}
          >
            Apply All Suggestions
          </button>
        )}
      </div>
      
      <div className="ai-suggestions-list">
        {hasSuggestions ? (
          Object.keys(suggestions).map(fieldId => {
            // Handle both object format and string format
            const suggestion = suggestions[fieldId];
            const suggestionValue = typeof suggestion === 'object' ? suggestion.value : suggestion;
            const fieldLabel = typeof suggestion === 'object' && suggestion.label ? 
              suggestion.label : 
              fieldId.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
              
            return (
              <div 
                key={fieldId}
                className={`suggestion-item ${expandedField === fieldId ? 'expanded' : ''}`}
                onClick={() => toggleField(fieldId)}
              >
                <div className="suggestion-header">
                  <div className="suggestion-field">{fieldLabel}</div>
                  <div className="suggestion-actions">
                    <button 
                      className="apply-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplySuggestion(fieldId);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
                
                {expandedField === fieldId && (
                  <div className="suggestion-content">
                    <div className="suggestion-value">
                      {suggestionValue}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="no-suggestions">No suggestions available.</p>
        )}
      </div>
    </div>
  );
};

export default AiFieldSuggestions;