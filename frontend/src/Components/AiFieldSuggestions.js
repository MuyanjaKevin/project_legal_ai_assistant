// src/Components/AiFieldSuggestions.js
import React, { useState, useEffect } from 'react';
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
  const [normalizedSuggestions, setNormalizedSuggestions] = useState({});

  // Normalize suggestions on component mount or when suggestions change
  useEffect(() => {
    // Handle different suggestion formats and normalize them
    const normalized = {};
    
    if (suggestions && typeof suggestions === 'object') {
      Object.keys(suggestions).forEach(fieldId => {
        const suggestion = suggestions[fieldId];
        
        if (typeof suggestion === 'object' && suggestion.value) {
          // Already in the correct format
          normalized[fieldId] = suggestion;
        } else {
          // Convert string format to object format
          normalized[fieldId] = {
            value: suggestion,
            label: fieldId.replace(/([A-Z])/g, ' $1')
                       .replace(/_/g, ' ')
                       .replace(/^\w/, c => c.toUpperCase())
          };
        }
      });
    }
    
    setNormalizedSuggestions(normalized);
  }, [suggestions]);

  // Toggle field expansion
  const toggleField = (fieldId) => {
    setExpandedField(expandedField === fieldId ? null : fieldId);
  };

  // Apply a single suggestion
  const handleApplySuggestion = (fieldId) => {
    // Get the value from normalized suggestions
    const suggestionValue = normalizedSuggestions[fieldId]?.value;
    
    if (suggestionValue) {
      onApplySuggestion(fieldId, suggestionValue);
      setExpandedField(null); // Collapse after applying
    }
  };

  // Check if we have any suggestions
  const hasSuggestions = normalizedSuggestions && Object.keys(normalizedSuggestions).length > 0;

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
          Object.keys(normalizedSuggestions).map(fieldId => {
            const suggestion = normalizedSuggestions[fieldId];
            const fieldLabel = suggestion.label || fieldId.replace(/([A-Z])/g, ' $1')
                              .replace(/_/g, ' ')
                              .replace(/^\w/, c => c.toUpperCase());
              
            return (
              <div 
                key={fieldId}
                className={`suggestion-item ${expandedField === fieldId ? 'expanded' : ''}`}
              >
                <div 
                  className="suggestion-header"
                  onClick={() => toggleField(fieldId)}
                >
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
                      {suggestion.value}
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