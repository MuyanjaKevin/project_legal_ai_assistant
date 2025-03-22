// src/pages/EnhancedContractGenerator.js
import React, { useState, useEffect } from 'react';
import AiFieldSuggestions from '../Components/AiFieldSuggestions';
import ContractAnalysis from '../Components/ContractAnalysis';
import ContractPdfGenerator from '../Components/ContractPdfGenerator';
import api from '../services/api';
import './ContractGenerator.css';
import './EnhancedContractGenerator.css';

function EnhancedContractGenerator() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [activeStep, setActiveStep] = useState('template');
  const [suggestions, setSuggestions] = useState({});
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [requirementText, setRequirementText] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [templateFields, setTemplateFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Fetch templates when component mounts
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Add effect to fetch template fields when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateFields(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  // Function to fetch template fields
  const fetchTemplateFields = async (templateId) => {
    try {
      setLoadingFields(true);
      const response = await api.get(`/contracts/template/${templateId}/fields`);
      setTemplateFields(response.data.fields || []);
    } catch (error) {
      console.error('Error fetching template fields:', error);
      setError('Failed to load template fields');
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplateLoading(true);
      const response = await api.get('/contracts/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load contract templates');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    setSelectedTemplate(template);
    setActiveStep('form');
    setError(null);
    setSuccess(null);
    setHtmlContent(null);
    setContractId(null);
    setFieldErrors({});
    setTouchedFields({});
    
    try {
      // Fetch template fields
      const response = await api.get(`/contracts/template/${template.id}/fields`);
      const fields = response.data.fields || [];
      
      // Initialize form data with empty values
      const initialData = {};
      fields.forEach(field => {
        initialData[field.id] = '';
      });
      
      setFormData(initialData);
      
      // Generate AI suggestions for fields
      generateFieldSuggestions(template.id, {});
    } catch (error) {
      console.error('Error fetching template fields:', error);
    }
  };

  const generateFieldSuggestions = async (templateId, context) => {
    try {
      setIsGeneratingSuggestions(true);
      
      const response = await api.post(`/contracts/template/${templateId}/suggest-fields`, {
        context
      });
      
      // Standardize the suggestions format
      const rawSuggestions = response.data.suggestions || {};
      const normalizedSuggestions = {};
      
      // Normalize suggestions to ensure consistent format
      Object.keys(rawSuggestions).forEach(fieldId => {
        const suggestion = rawSuggestions[fieldId];
        
        if (typeof suggestion === 'object' && suggestion.value) {
          // Already in the correct format
          normalizedSuggestions[fieldId] = suggestion;
        } else {
          // Convert string format to object format
          normalizedSuggestions[fieldId] = {
            value: suggestion,
            label: fieldId.replace(/([A-Z])/g, ' $1')
                       .replace(/_/g, ' ')
                       .replace(/^\w/, c => c.toUpperCase())
          };
        }
      });
      
      setSuggestions(normalizedSuggestions);
    } catch (error) {
      console.error('Error generating field suggestions:', error);
      setError('Failed to generate AI suggestions. Please try again.');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData({
      ...formData,
      [fieldId]: value
    });
    
    // If we modify a field, clear its suggestion
    if (suggestions[fieldId]) {
      const newSuggestions = { ...suggestions };
      delete newSuggestions[fieldId];
      setSuggestions(newSuggestions);
    }
  };

  const handleFieldBlur = (fieldId) => {
    setTouchedFields({
      ...touchedFields,
      [fieldId]: true
    });
    
    // Validate this field
    validateField(fieldId);
  };

  const validateField = (fieldId) => {
    const field = templateFields.find(f => f.id === fieldId);
    if (!field) return;
    
    const value = formData[fieldId];
    const newErrors = { ...fieldErrors };
    
    // Clear previous error
    delete newErrors[fieldId];
    
    // Check required
    if (field.required && (!value || value.trim() === '')) {
      newErrors[fieldId] = `${field.label} is required`;
    }
    
    // Type-specific validation
    if (value) {
      if (field.type === 'date' && isNaN(new Date(value).getTime())) {
        newErrors[fieldId] = `Please enter a valid date`;
      }
      
      if (field.type === 'number' && isNaN(Number(value))) {
        newErrors[fieldId] = `Please enter a valid number`;
      }
    }
    
    setFieldErrors(newErrors);
  };

  const handleApplySuggestion = (fieldId, value) => {
    // Update form data with the suggestion value
    handleInputChange(fieldId, value);
    
    // Remove the applied suggestion
    const newSuggestions = { ...suggestions };
    delete newSuggestions[fieldId];
    setSuggestions(newSuggestions);
  };

  const handleApplyAllSuggestions = () => {
    // Apply all suggestions to form data
    const newFormData = { ...formData };
    
    Object.keys(suggestions).forEach(fieldId => {
      // Handle both object format and string format
      const suggestionValue = typeof suggestions[fieldId] === 'object' 
        ? suggestions[fieldId].value 
        : suggestions[fieldId];
        
      newFormData[fieldId] = suggestionValue;
    });
    
    setFormData(newFormData);
    setSuggestions({}); // Clear all suggestions after applying
  };

  const validateForm = () => {
    // Mark all fields as touched
    const allTouched = {};
    templateFields.forEach(field => {
      allTouched[field.id] = true;
    });
    setTouchedFields(allTouched);
    
    // Validate all fields
    const newErrors = {};
    let isValid = true;
    
    templateFields.forEach(field => {
      const fieldId = field.id;
      const value = formData[fieldId];
      
      // Check required
      if (field.required && (!value || value.trim() === '')) {
        newErrors[fieldId] = `${field.label} is required`;
        isValid = false;
      }
      
      // Type-specific validation
      if (value) {
        if (field.type === 'date' && isNaN(new Date(value).getTime())) {
          newErrors[fieldId] = `Please enter a valid date`;
          isValid = false;
        }
        
        if (field.type === 'number' && isNaN(Number(value))) {
          newErrors[fieldId] = `Please enter a valid number`;
          isValid = false;
        }
      }
    });
    
    setFieldErrors(newErrors);
    
    // If there are errors, scroll to the first error
    if (!isValid) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }
    }
    
    return isValid;
  };

  const generateContract = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Generating contract with form data:", formData);
      console.log("Selected template:", selectedTemplate);
      
      // Generate contract HTML
      const response = await api.post('/contracts/generate-html', {
        templateId: selectedTemplate.id,
        formData: formData
      });
      
      console.log("API Response:", response.data);
      
      // Check if response contains expected data
      if (!response.data) {
        throw new Error("Empty response received from server");
      }
      
      if (!response.data.html_content && !response.data.contract_id) {
        console.error("Invalid response format:", response.data);
        throw new Error("Invalid response format from server");
      }
      
      // Get HTML content directly or fetch it if only contract_id is returned
      let htmlContent = response.data.html_content;
      let contractId = response.data.contract_id;
      
      // If we only got contract_id but no HTML content, fetch the HTML separately
      if (contractId && !htmlContent) {
        console.log("No HTML in response, fetching it using contract ID:", contractId);
        const htmlResponse = await api.get(`/contracts/${contractId}/html`);
        if (htmlResponse.data && htmlResponse.data.html_content) {
          htmlContent = htmlResponse.data.html_content;
        } else {
          console.error("Failed to fetch HTML content:", htmlResponse.data);
          throw new Error("Failed to fetch contract HTML content");
        }
      }
      
      // Verify we have HTML content
      if (!htmlContent) {
        console.error("No HTML content in response");
        throw new Error("No contract content received from server");
      }
      
      // Set HTML content and contract ID
      console.log("Setting HTML content, length:", htmlContent.length);
      setHtmlContent(htmlContent);
      setContractId(contractId);
      setSuccess('Contract generated successfully!');
      setActiveStep('preview');
      
      // Analyze the contract
      analyzeContract(contractId);
    } catch (error) {
      console.error('Error generating contract:', error);
      // Provide a more specific error message
      const errorMessage = error.response?.data?.message || error.message || 'Error generating contract. Please try again.';
      setError(errorMessage);
      setHtmlContent(null); // Clear any partial content
    } finally {
      setLoading(false);
    }
  };

  const analyzeContract = async (contractId) => {
    if (!contractId) return;
    
    try {
      setIsAnalyzing(true);
      setAnalysis(null);
      
      const response = await api.post(`/contracts/${contractId}/analyze`);
      
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing contract:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetRecommendation = async () => {
    if (!requirementText.trim()) {
      setError('Please describe your requirements to get a recommendation');
      return;
    }
    
    try {
      setIsRecommending(true);
      setRecommendation(null);
      setError(null);
      
      const response = await api.post('/contracts/recommend-template', {
        requirements: requirementText
      });
      
      setRecommendation(response.data.recommendation);
      
      // If we have a recommendation with high confidence, select it automatically
      if (response.data.recommendation.confidence >= 0.7) {
        const recommendedId = response.data.recommendation.recommended_template;
        const recommendedTemplate = templates.find(t => t.id === recommendedId);
        
        if (recommendedTemplate) {
          handleTemplateSelect(recommendedTemplate);
        }
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      setError('Failed to get template recommendation. Please try again.');
    } finally {
      setIsRecommending(false);
    }
  };

  const handlePdfGenerated = (pdfBlob, pdfUrl) => {
    // Could be used to upload the PDF to the server if needed
    console.log('PDF generated:', pdfUrl);
  };

  // Render the template selection step
  const renderTemplateSelector = () => (
    <div className="template-selector">
      <h2>Select a Contract Template</h2>
      
      <div className="template-advisor">
        <h3>Need help choosing a template?</h3>
        <p>Describe your requirements and our AI will recommend the best template for you.</p>
        
        <div className="advisor-input">
          <textarea 
            placeholder="E.g., I need a contract to protect confidential information shared with a business partner..."
            value={requirementText}
            onChange={(e) => setRequirementText(e.target.value)}
            rows={4}
          ></textarea>
          
          <button 
            className="recommend-button"
            onClick={handleGetRecommendation}
            disabled={isRecommending || !requirementText.trim()}
          >
            {isRecommending ? 'Getting Recommendation...' : 'Get Recommendation'}
          </button>
        </div>
        
        {recommendation && (
          <div className="recommendation-result">
            <h4>Recommended Template: {templates.find(t => t.id === recommendation.recommended_template)?.name}</h4>
            <div className="confidence-bar">
              <div 
                className="confidence-level" 
                style={{ width: `${recommendation.confidence * 100}%` }}
              ></div>
            </div>
            <p className="confidence-text">
              Confidence: {Math.round(recommendation.confidence * 100)}%
            </p>
            <p className="recommendation-reason">{recommendation.reason}</p>
            
            <button 
              className="use-recommendation-button"
              onClick={() => {
                const template = templates.find(t => t.id === recommendation.recommended_template);
                if (template) handleTemplateSelect(template);
              }}
            >
              Use Recommended Template
            </button>
          </div>
        )}
      </div>
      
      {templateLoading ? (
        <div className="loading">Loading templates...</div>
      ) : (
        <div className="template-grid">
          {templates.map(template => (
            <div 
              key={template.id} 
              className={`template-card ${recommendation && recommendation.recommended_template === template.id ? 'recommended' : ''}`}
              onClick={() => handleTemplateSelect(template)}
            >
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <button className="select-button">Select Template</button>
              
              {recommendation && recommendation.recommended_template === template.id && (
                <div className="recommendation-badge">Recommended</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render the form step
  const renderContractForm = () => (
    <div className="contract-form-container">
      <h2>Customize {selectedTemplate?.name}</h2>
      <button 
        className="back-button"
        onClick={() => {
          setActiveStep('template');
          setSelectedTemplate(null);
          setSuggestions({});
        }}
      >
        ← Back to Templates
      </button>
      
      <div className="form-and-suggestions">
        <div className="contract-form">
          <form onSubmit={(e) => { e.preventDefault(); generateContract(); }}>
            {selectedTemplate && (
              <>
                {loadingFields ? (
                  <div className="loading-fields">Loading form fields...</div>
                ) : (
                  templateFields.map(field => {
                    const fieldId = field.id;
                    const hasError = fieldErrors[fieldId] && touchedFields[fieldId];
                    
                    return (
                      <div key={fieldId} className={`form-group ${hasError ? 'has-error' : ''}`}>
                        <label htmlFor={fieldId}>
                          {field.label} {field.required && <span className="required">*</span>}
                        </label>
                        
                        {field.type === 'textarea' ? (
                          <textarea
                            id={fieldId}
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleFieldBlur(fieldId)}
                            required={field.required}
                            rows={4}
                            className={hasError ? 'error-field' : ''}
                          />
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            id={fieldId}
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleFieldBlur(fieldId)}
                            required={field.required}
                            className={hasError ? 'error-field' : ''}
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            id={fieldId}
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleFieldBlur(fieldId)}
                            required={field.required}
                            className={hasError ? 'error-field' : ''}
                          />
                        ) : (
                          <input
                            type="text"
                            id={fieldId}
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleFieldBlur(fieldId)}
                            required={field.required}
                            className={hasError ? 'error-field' : ''}
                          />
                        )}
                        
                        {hasError && (
                          <div className="error-message">{fieldErrors[fieldId]}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </form>
        </div>
        
        <div className="suggestions-panel">
          <AiFieldSuggestions 
            templateId={selectedTemplate?.id}
            formData={formData}
            onApplySuggestion={handleApplySuggestion}
            onApplyAll={handleApplyAllSuggestions}
            isGeneratingSuggestions={isGeneratingSuggestions}
            suggestions={suggestions}
          />
        </div>
      </div>
      
      {/* Move the form-actions div outside the form to make it more prominent */}
      <div className="form-actions">
        <button 
          onClick={generateContract}
          className="generate-button"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'GENERATE CONTRACT'}
        </button>
      </div>
    </div>
  );

  // Render the preview step
  const renderContractPreview = () => (
    <div className="contract-preview-container">
      <h2>Contract Preview and Download</h2>
      <button 
        className="back-button"
        onClick={() => setActiveStep('form')}
      >
        ← Back to Form
      </button>
      
      <div className="preview-and-analysis">
        <div className="preview-section">
          <h3>Preview and Download</h3>
          <ContractPdfGenerator 
            htmlContent={htmlContent}
            contractTitle={selectedTemplate?.name}
            onGenerated={handlePdfGenerated}
          />
        </div>
        
        <div className="analysis-section">
          <ContractAnalysis 
            analysis={analysis}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="enhanced-contract-generator">
      <h1>AI-Enhanced Contract Generator</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="step-indicators">
        <div 
          className={`step ${activeStep === 'template' ? 'active' : ''} ${activeStep === 'form' || activeStep === 'preview' ? 'completed' : ''}`}
          onClick={() => activeStep !== 'template' && setActiveStep('template')}
        >
          <div className="step-number">1</div>
          <div className="step-label">Select Template</div>
        </div>
        <div className="step-connector"></div>
        <div 
          className={`step ${activeStep === 'form' ? 'active' : ''} ${activeStep === 'preview' ? 'completed' : ''}`}
          onClick={() => activeStep === 'preview' && setActiveStep('form')}
        >
          <div className="step-number">2</div>
          <div className="step-label">Customize Contract</div>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${activeStep === 'preview' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Generate & Download</div>
        </div>
      </div>
      
      <div className="contract-generator-content">
        {activeStep === 'template' && renderTemplateSelector()}
        {activeStep === 'form' && renderContractForm()}
        {activeStep === 'preview' && renderContractPreview()}
      </div>
    </div>
  );
}

export default EnhancedContractGenerator;