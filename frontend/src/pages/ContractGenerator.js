// src/pages/ContractGenerator.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contractTemplates from '../data/contractTemplates';
import './ContractGenerator.css';

function ContractGenerator() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [downloadReady, setDownloadReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch templates from backend
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // For now, use the local data
      // In a real app, you'd fetch from your API
      setTemplates(contractTemplates);
      setLoading(false);
      
      // Uncomment this when your backend is ready
      /*
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contracts/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching templates: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates);
      setLoading(false);
      */
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load contract templates');
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Initialize form data with empty values
    const initialData = {};
    template.fields.forEach(field => {
      initialData[field.id] = '';
    });
    
    setFormData(initialData);
    setError(null);
    setSuccess(null);
    setDownloadReady(false);
  };

  const handleInputChange = (fieldId, value) => {
    setFormData({
      ...formData,
      [fieldId]: value
    });
  };

  const handleFormatChange = (e) => {
    setOutputFormat(e.target.value);
  };

  const generateSimpleDocument = () => {
    // Create a simple text document with the form data
    let content = `# ${selectedTemplate.name}\n\n`;
    
    // Add form data
    Object.keys(formData).forEach(key => {
      const field = selectedTemplate.fields.find(f => f.id === key);
      if (field) {
        content += `**${field.label}**: ${formData[key]}\n`;
      }
    });
    
    // Create a blob
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate.id}_contract.txt`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    console.log("Form submitted with data:", formData);
    
    // Validate form
    const missingRequiredFields = selectedTemplate.fields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);
    
    if (missingRequiredFields.length > 0) {
      console.log("Missing required fields:", missingRequiredFields);
      setError(`Please fill out all required fields: ${missingRequiredFields.join(', ')}`);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Preparing to generate contract...");
      const token = localStorage.getItem('token');
      console.log("Token available:", !!token);
      
      // Create a simpler mock response for now to test the UI flow
      console.log("Generating contract with:", {
        templateId: selectedTemplate.id,
        formData: formData,
        outputFormat: outputFormat
      });
      
      // For testing - uncomment this and comment out the fetch call
      setTimeout(() => {
        console.log("Mock contract generation complete");
        setSuccess('Contract generated successfully! Your document is ready.');
        setDownloadReady(true);
        generateSimpleDocument();
        setLoading(false);
      }, 2000);
      
      /* 
      // Uncomment this for real API implementation
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          formData: formData,
          outputFormat: outputFormat
        })
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error generating contract: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      
      setSuccess('Contract generated successfully! Download will start shortly.');
      setDownloadReady(true);
      
      // Trigger download
      window.location.href = data.download_url;
      */
      
    } catch (error) {
      console.error('Error generating contract:', error);
      setError(`Failed to generate contract: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="contract-generator">
      <h1>Contract Generator</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          {success}
          {downloadReady && (
            <button 
              className="download-button"
              onClick={generateSimpleDocument}
            >
              Download Again
            </button>
          )}
        </div>
      )}
      
      {!selectedTemplate ? (
        <div className="template-selector">
          <h2>Select a Contract Template</h2>
          {loading ? (
            <div className="loading">Loading templates...</div>
          ) : (
            <div className="template-grid">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className="template-card"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <button className="select-button">Select Template</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="contract-form">
          <h2>Customize {selectedTemplate.name}</h2>
          <button 
            className="back-button"
            onClick={() => setSelectedTemplate(null)}
          >
            ← Back to Templates
          </button>
          
          <form onSubmit={handleSubmit}>
            {selectedTemplate.fields.map(field => (
              <div key={field.id} className="form-group">
                <label htmlFor={field.id}>
                  {field.label} {field.required && <span className="required">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                    rows={4}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    id={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    id={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  />
                ) : (
                  <input
                    type="text"
                    id={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            
            <div className="form-group">
              <label>Output Format</label>
              <div className="format-options">
                <label>
                  <input
                    type="radio"
                    name="outputFormat"
                    value="pdf"
                    checked={outputFormat === 'pdf'}
                    onChange={handleFormatChange}
                  /> PDF
                </label>
                <label>
                  <input
                    type="radio"
                    name="outputFormat"
                    value="docx"
                    checked={outputFormat === 'docx'}
                    onChange={handleFormatChange}
                  /> DOCX
                </label>
              </div>
            </div>
          </form>
          
          {/* Standalone button outside the form */}
          <div style={{
            margin: '40px 0',
            textAlign: 'center'
          }}>
            <button 
              onClick={handleSubmit}
              style={{
                backgroundColor: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
              disabled={loading}
            >
              {loading ? 'GENERATING...' : 'GENERATE CONTRACT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractGenerator;