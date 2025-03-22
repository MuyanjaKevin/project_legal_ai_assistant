// src/components/ContractPreview.js
import React, { useRef, useEffect, useState } from 'react';
import './ContractPreview.css';

const ContractPreview = ({ htmlContent, onPreviewReady, onPreviewError }) => {
  const previewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    if (!htmlContent) {
      setError('No content available to preview');
      setIsLoading(false);
      if (onPreviewError) onPreviewError('No content available');
      return;
    }
    
    // Sanitize HTML to prevent script execution (optional, based on your security needs)
    const sanitizedHtml = sanitizeHtml(htmlContent);
    
    // Create a new document container for the preview
    const createPreview = () => {
      if (previewRef.current) {
        try {
          // Clear previous content
          previewRef.current.innerHTML = '';
          
          // Create a container for the content
          const container = document.createElement('div');
          container.className = 'contract-content';
          container.innerHTML = sanitizedHtml;
          
          // Append to the preview container
          previewRef.current.appendChild(container);
          
          // Notify parent component that preview is ready
          if (onPreviewReady) onPreviewReady(previewRef.current);
          
          setIsLoading(false);
        } catch (err) {
          console.error('Error rendering preview:', err);
          setError('Error rendering preview. Please try again.');
          setIsLoading(false);
          if (onPreviewError) onPreviewError(err.message);
        }
      }
    };
    
    // Set a small timeout to ensure the DOM is ready
    const timer = setTimeout(createPreview, 100);
    
    return () => {
      clearTimeout(timer);
      if (previewRef.current) {
        previewRef.current.innerHTML = '';
      }
    };
  }, [htmlContent, onPreviewReady, onPreviewError]);
  
  // Simple HTML sanitizer (can be replaced with a library like DOMPurify)
  const sanitizeHtml = (html) => {
    // Remove potentially dangerous script tags
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };
  
  return (
    <div className="contract-preview-wrapper">
      {isLoading && (
        <div className="preview-loading">
          <div className="preview-spinner"></div>
          <p>Preparing preview...</p>
        </div>
      )}
      
      {error && (
        <div className="preview-error">
          <p>{error}</p>
        </div>
      )}
      
      <div 
        ref={previewRef}
        className={`contract-preview ${isLoading ? 'hidden' : ''}`}
      ></div>
    </div>
  );
};

export default ContractPreview;