// src/Components/ContractPdfGenerator.js
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './ContractPdfGenerator.css';

const ContractPdfGenerator = ({ htmlContent, contractTitle, onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayContent, setDisplayContent] = useState('');
  const previewRef = useRef(null);

  // Process the HTML content when it changes
  useEffect(() => {
    console.log("HTML content received, length:", htmlContent ? htmlContent.length : 0);
    
    // Reset states
    setPdfBlob(null);
    setError(null);
    setLoading(true);
    
    // Validate HTML content
    if (!htmlContent) {
      setError("No content received from server. Please try again.");
      setLoading(false);
      return;
    }
    
    // Safely set the display content with a short delay
    const timer = setTimeout(() => {
      try {
        setDisplayContent(htmlContent);
        setLoading(false);
      } catch (err) {
        console.error("Error setting HTML content:", err);
        setError("Error preparing preview: " + err.message);
        setLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [htmlContent]);

  // Generate PDF using direct HTML text with better formatting
  const generatePdf = async () => {
    if (!htmlContent || !previewRef.current) {
      setError("Preview not ready. Please try again.");
      return;
    }
    
    try {
      setIsGenerating(true);
      setProgress(10);
      setError(null);
      
      console.log("Starting PDF generation process...");
      
      // Default PDF settings
      const pdfWidth = 8.5; // inches (letter)
      const pdfHeight = 11; // inches (letter)
      const margins = {
        top: 0.75,    // 0.75 inch top margin
        bottom: 0.75, // 0.75 inch bottom margin
        left: 0.75,   // 0.75 inch left margin
        right: 0.75   // 0.75 inch right margin
      };
      
      // Initialize PDF with proper settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
        compress: true
      });
      
      setProgress(20);
      
      // Get content from HTML
      const element = previewRef.current;
      
      // Create a clone of the element to avoid modifying the displayed content
      const clone = element.cloneNode(true);
      
      // Add specific styling for print to the clone
      clone.style.width = `${pdfWidth - margins.left - margins.right}in`;
      clone.style.padding = '0';
      clone.style.fontFamily = 'Arial, sans-serif';
      
      // Improve styling for the PDF rendering
      const styleTag = document.createElement('style');
      styleTag.innerHTML = `
        * { box-sizing: border-box; }
        h1, h2, h3, h4, h5, h6 { margin-top: 12px; margin-bottom: 8px; }
        p { margin-top: 5px; margin-bottom: 5px; }
        strong { font-weight: bold; }
      `;
      clone.appendChild(styleTag);
      
      // Append the clone to the body temporarily for html2canvas
      document.body.appendChild(clone);
      
      setProgress(30);
      
      try {
        // Enhanced canvas capture settings
        const canvas = await html2canvas(clone, {
          scale: 3, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#FFFFFF',
          imageTimeout: 15000,
          windowWidth: pdfWidth * 96 - (margins.left + margins.right) * 96, // Convert inches to px (96dpi)
          windowHeight: 10000, // arbitrary large height
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0
        });
        
        // Remove the clone from the document
        document.body.removeChild(clone);
        
        setProgress(60);
        
        // Calculate PDF pages with proper margins
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = pdfWidth - margins.left - margins.right;
        const pageHeight = pdfHeight - margins.top - margins.bottom;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = margins.top; // Start at top margin
        let pageCount = 1;
        
        // Add title to the first page
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(contractTitle || 'NON-DISCLOSURE AGREEMENT', pdfWidth/2, 0.5, { align: 'center' });
        
        // Add first page content
        pdf.addImage(
          imgData, 
          'JPEG', 
          margins.left, // left margin
          position, // top position 
          imgWidth, // width with margins
          imgHeight // height
        );
        
        heightLeft -= pageHeight;
        
        // Add additional pages as needed
        while (heightLeft > 0) {
          position = margins.top - pdfHeight * pageCount;
          
          // Add new page
          pdf.addPage();
          
          // Add page number in footer
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Page ${pageCount + 1}`, pdfWidth - margins.right - 0.5, pdfHeight - 0.3);
          
          // Add image again but positioned to show next portion
          pdf.addImage(
            imgData, 
            'JPEG', 
            margins.left, 
            position, 
            imgWidth, 
            imgHeight
          );
          
          heightLeft -= pageHeight;
          pageCount++;
        }
        
        // Add page number to first page
        pdf.setPage(1);
        pdf.setFontSize(10);
        pdf.text(`Page 1`, pdfWidth - margins.right - 0.5, pdfHeight - 0.3);
        
        setProgress(90);
        console.log(`Generated PDF with ${pageCount} pages`);
      } catch (canvasError) {
        // Clean up the clone if error occurred
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
        
        console.error("Canvas generation failed:", canvasError);
        
        // Fallback: Create a simple text PDF with better formatting
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(contractTitle || 'NON-DISCLOSURE AGREEMENT', pdfWidth/2, 1, {align: 'center'});
        
        // Extract and format text content
        const textContent = element.innerText || element.textContent || '';
        
        // Split content by sections
        const sections = textContent.split(/\*\*([^*]+)\*\*/g)
          .filter(section => section.trim().length > 0);
        
        let yPos = 1.5;
        
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i].trim();
          
          // If it's a header (even index in the split)
          if (i % 2 === 0) {
            // Add a bit of space before each section
            yPos += 0.3;
            
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(section, 0.75, yPos);
            yPos += 0.4;
          } else {
            // For regular content
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            
            // Split text to fit page width
            const splitText = pdf.splitTextToSize(section, pdfWidth - 1.5);
            
            // Check if we need a new page
            if (yPos + splitText.length * 0.2 > pdfHeight - 0.75) {
              pdf.addPage();
              yPos = 1;
            }
            
            pdf.text(splitText, 0.75, yPos);
            yPos += splitText.length * 0.2 + 0.3;
          }
        }
        
        console.log("Generated fallback text-based PDF");
      }
      
      // Generate PDF as array buffer for better reliability
      const arrayBuffer = pdf.output('arraybuffer');
      
      // Create a proper blob with correct MIME type
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      
      setPdfBlob(blob);
      
      // Notify parent component if needed
      if (onGenerated) {
        // Create a temporary URL just for the callback
        const tempUrl = URL.createObjectURL(blob);
        onGenerated(blob, tempUrl);
        // Revoke URL after callback
        setTimeout(() => URL.revokeObjectURL(tempUrl), 100);
      }
      
      setProgress(100);
      console.log("PDF generation completed successfully");
      
      // Trigger download with a slight delay
      setTimeout(() => handleDownload(blob), 100);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError("Failed to generate PDF: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (blobToDownload) => {
    const fileBlob = blobToDownload || pdfBlob;
    
    if (!fileBlob) {
      setError("No PDF available to download");
      return;
    }
    
    try {
      console.log("Triggering PDF download...");
      
      // Create a secure download URL
      const blobUrl = URL.createObjectURL(fileBlob);
      
      // Create download element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${contractTitle || 'Legal-Contract'}.pdf`;
      link.style.display = 'none';
      
      // Add to DOM, click, then remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 200);
    } catch (error) {
      console.error("Download failed:", error);
      setError("Failed to download PDF: " + error.message);
    }
  };

  return (
    <div className="pdf-generator">
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
          {!pdfBlob ? (
            <button 
              className={`generate-pdf-button ${loading ? 'loading-button' : ''}`}
              onClick={generatePdf}
              disabled={loading || !displayContent}
            >
              {loading ? (
                <>
                  <span className="loading-icon"></span> Loading Preview...
                </>
              ) : !displayContent ? (
                'Preview Not Ready'
              ) : (
                'Generate PDF'
              )}
            </button>
          ) : (
            <div className="pdf-ready">
              <p>Your PDF is ready!</p>
              <button 
                className="download-pdf-button"
                onClick={() => handleDownload()}
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
        ) : !displayContent ? (
          <div className="empty-preview">
            <p>No preview content available. Please try again.</p>
          </div>
        ) : (
          <div 
            ref={previewRef}
            className="contract-preview"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ContractPdfGenerator;