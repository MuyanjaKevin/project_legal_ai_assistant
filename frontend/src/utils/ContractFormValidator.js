// src/utils/ContractFormValidator.js

/**
 * Validates contract form data based on template fields
 * @param {Object} formData - The form data to validate
 * @param {Array} templateFields - The template field definitions
 * @returns {Object} - Validation result containing isValid and errors
 */
export const validateContractForm = (formData, templateFields) => {
    const errors = {};
    let isValid = true;
    
    if (!templateFields || !Array.isArray(templateFields)) {
      return { isValid: false, errors: { general: 'Template fields not available' } };
    }
    
    // Check each required field
    templateFields.forEach(field => {
      const fieldId = field.id;
      const fieldValue = formData[fieldId];
      
      // Check if required field is empty
      if (field.required && (!fieldValue || fieldValue.trim() === '')) {
        errors[fieldId] = `${field.label || fieldId} is required`;
        isValid = false;
      }
      
      // Additional validation based on field type
      if (fieldValue) {
        if (field.type === 'date' && isNaN(new Date(fieldValue).getTime())) {
          errors[fieldId] = `${field.label || fieldId} must be a valid date`;
          isValid = false;
        }
        
        if (field.type === 'number' && isNaN(Number(fieldValue))) {
          errors[fieldId] = `${field.label || fieldId} must be a number`;
          isValid = false;
        }
        
        // Add length validation for text fields if needed
        if ((field.type === 'text' || field.type === 'textarea') && 
            field.maxLength && fieldValue.length > field.maxLength) {
          errors[fieldId] = `${field.label || fieldId} exceeds maximum length of ${field.maxLength}`;
          isValid = false;
        }
      }
    });
    
    return {
      isValid,
      errors
    };
  };
  
  /**
   * Format validation errors for display
   * @param {Object} errors - The validation errors
   * @returns {String} - Formatted error message
   */
  export const formatValidationErrors = (errors) => {
    if (!errors || Object.keys(errors).length === 0) {
      return '';
    }
    
    const errorMessages = Object.values(errors);
    
    if (errorMessages.length === 1) {
      return errorMessages[0];
    }
    
    return (
      'Please fix the following errors:\n' + 
      errorMessages.map(msg => `• ${msg}`).join('\n')
    );
  };
  
  /**
   * Check if all required fields are filled
   * @param {Object} formData - The form data to check
   * @param {Array} templateFields - The template field definitions
   * @returns {boolean} - True if all required fields are filled
   */
  export const areRequiredFieldsFilled = (formData, templateFields) => {
    if (!templateFields || !Array.isArray(templateFields)) {
      return false;
    }
    
    const requiredFields = templateFields.filter(field => field.required);
    
    for (const field of requiredFields) {
      const fieldValue = formData[field.id];
      if (!fieldValue || fieldValue.trim() === '') {
        return false;
      }
    }
    
    return true;
  };
  
  /**
   * Get a list of missing required fields
   * @param {Object} formData - The form data to check
   * @param {Array} templateFields - The template field definitions
   * @returns {Array} - List of missing field labels
   */
  export const getMissingRequiredFields = (formData, templateFields) => {
    if (!templateFields || !Array.isArray(templateFields)) {
      return ['Template fields not available'];
    }
    
    const missingFields = [];
    
    templateFields.forEach(field => {
      if (field.required) {
        const fieldValue = formData[field.id];
        if (!fieldValue || fieldValue.trim() === '') {
          missingFields.push(field.label || field.id);
        }
      }
    });
    
    return missingFields;
  };