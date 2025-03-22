// src/Components/ContractPdfGenerator.js
import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './ContractPdfGenerator.css';

const ContractPdfGenerator = ({ htmlContent, contractTitle, onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const contractRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Reset states when content changes
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    setError(null);
    setPreviewReady(false);
    setLoading(true);
    
    // Debug HTML content
    console.log("HTML Content received:", htmlContent ? `${htmlContent.substring(0, 100)}... (length: ${htmlContent.length})` : "None");
    
    // Check if HTML content is provided
    if (!htmlContent) {
      setError("No content received from server. Please try again.");
      setLoading(false);
      return;
    }
    
    // Add a timeout to give a better user experience and ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        if (contractRef.current) {
          // Set preview as ready
          setPreviewReady(true);
          setLoading(false);
        } else {
          setError("Preview container not available. Please refresh the page.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error preparing preview:", err);
        setError("Error preparing contract preview: " + err.message);
        setLoading(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [htmlContent, pdfUrl]);

  const generatePdf = async () => {
    if (!htmlContent || !contractRef.current) {
      setError("No content available to generate PDF");
      return;
    }
    
    try {
      setIsGenerating(true);
      setProgress(10);
      setError(null);
      
      console.log("Starting PDF generation process...");
      
      // Get the preview element and prepare for capture
      const previewElement = contractRef.current;
      
      // Temporarily modify the preview element for better capture
      const originalStyle = previewElement.style.cssText;
      previewElement.style.width = '8.5in';
      previewElement.style.margin = '0';
      previewElement.style.padding = '0.5in';
      previewElement.style.backgroundColor = '#FFFFFF';
      previewElement.style.fontFamily = 'Times New Roman, serif';
      
      setProgress(20);
      
      // Initialize PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter' // 8.5 x 11 inches
      });
      
      // Get PDF dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      setProgress(30);
      
      try {
        // Use a better rendering scale for high-quality PDF
        const scale = 2; // Higher scale for better quality
        
        // Capture the content as a canvas
        console.log("Capturing HTML with html2canvas...");
        const canvas = await html2canvas(previewElement, {
          scale: scale,
          useCORS: true,
          logging: true, // Enable logging to help with debugging
          backgroundColor: '#FFFFFF',
          allowTaint: true,
          // Improve rendering quality
          imageTimeout: 15000,
          removeContainer: false
        });
        
        setProgress(70);
        console.log("HTML captured as canvas");
        
        // Convert canvas to image and add to PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Calculate dimensions to fit the page properly
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        
        // If image is taller than the page, we need to split it into multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;
        
        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        
        // Add additional pages if needed
        while (heightLeft > 0) {
          position = -pdfHeight * page;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
          page++;
        }
        
        setProgress(90);
        console.log("Added images to PDF, pages:", page);
      } catch (canvasError) {
        console.error("Error during canvas generation:", canvasError);
        
        // Fallback approach: render each section of the document separately
        console.log("Using section-by-section fallback approach");
        
        // Get all major sections from the preview
        const sections = previewElement.querySelectorAll('.section, .header, .signature-block');
        
        if (sections.length > 0) {
          let yPosition = 0.5; // Start 0.5 inches from top
          
          // Add title to first page if available
          const headerElement = previewElement.querySelector('.header');
          if (headerElement) {
            pdf.setFontSize(16);
            pdf.setFont('times', 'bold');
            pdf.text(headerElement.textContent.trim(), pdfWidth / 2, yPosition, { align: 'center' });
            yPosition += 0.5; // Move down after title
          }
          
          // Process each section
          pdf.setFontSize(12);
          pdf.setFont('times', 'normal');
          
          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            
            // Skip header as we've already processed it
            if (section.classList.contains('header')) continue;
            
            // Get section text
            const sectionText = section.textContent.trim();
            
            // Split text into lines to fit page width
            const lines = pdf.splitTextToSize(sectionText, pdfWidth - 1);
            
            // Check if we need to add a new page
            const sectionHeight = lines.length * 0.2; // Estimate height
            if (yPosition + sectionHeight > pdfHeight - 0.5) {
              pdf.addPage();
              yPosition = 0.5; // Reset position for new page
            }
            
            // Add section title if available
            const sectionTitle = section.querySelector('.section-title');
            if (sectionTitle) {
              pdf.setFont('times', 'bold');
              pdf.text(sectionTitle.textContent.trim(), 0.5, yPosition);
              yPosition += 0.25;
              pdf.setFont('times', 'normal');
            }
            
            // Add section content
            pdf.text(lines, 0.5, yPosition);
            yPosition += sectionHeight + 0.3; // Add space after section
          }
        } else {
          // Ultra fallback: just add the text content
          pdf.setFontSize(12);
          const textContent = previewElement.textContent || previewElement.innerText;
          if (textContent && textContent.trim()) {
            const lines = pdf.splitTextToSize(textContent, pdfWidth - 1);
            pdf.text(0.5, 0.5, lines);
          } else {
            pdf.text(0.5, 0.5, "Error: Unable to extract content from contract.");
          }
        }
      }
      
      // Restore original style
      previewElement.style.cssText = originalStyle;
      
      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      // Notify parent component that PDF is ready
      if (onGenerated) {
        onGenerated(pdfBlob, url);
      }
      
      setProgress(100);
      console.log("PDF generation completed successfully");
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      console.log("Triggering PDF download...");
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${contractTitle || 'Legal-Contract'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setError("No PDF available to download");
    }
  };

  // Check if we have just empty HTML or a message indicating no preview content
  const hasRealContent = htmlContent && 
    !htmlContent.includes('<div class="empty-preview">') &&
    !htmlContent.includes('No preview content available');

  return (
    <div className="pdf-generator" ref={containerRef}>
      {error && <div className="pdf-error-message">{error}</div>}
      
      {isGenerating ? (
        <div className="generating-overlay">
          <div className="generating-content">
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p>Generating PDF {Math.round(progress)}%</p>
          </div>
        </div>
      ) : (
        <div className="pdf-actions">
          {!pdfUrl ? (
            loading ? (
              <button className="generate-pdf-button loading-button" disabled>
                <span className="loading-icon"></span> Loading Preview...
              </button>
            ) : (
              <button 
                className="generate-pdf-button"
                onClick={generatePdf}
                disabled={!previewReady || !hasRealContent || loading}
              >
                {!previewReady || !hasRealContent ? 'Preview Not Ready' : 'Generate PDF'}
              </button>
            )
          ) : (
            <div className="pdf-ready">
              <p>Your PDF is ready!</p>
              <button 
                className="download-pdf-button"
                onClick={handleDownload}
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="contract-preview-container">
        {loading ? (
          <div className="preview-loading">
            <div className="loading-spinner"></div>
            <p>Loading Preview...</p>
          </div>
        ) : htmlContent ? (
          <div 
            ref={contractRef} 
            className="contract-preview"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          ></div>
        ) : (
          <div className="empty-preview">
            <p>No preview content available. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractPdfGenerator;