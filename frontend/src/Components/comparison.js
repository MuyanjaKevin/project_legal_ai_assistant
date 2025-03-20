// import React, { useState, useEffect } from 'react';
// import './DocumentSelector.css';

// function DocumentSelector({ onSelect }) {
//   const [documents, setDocuments] = useState([]);
//   const [selected, setSelected] = useState([]);

//   useEffect(() => {
//     // Fetch documents when component mounts
//     fetchDocuments();
//   }, []);

//   const fetchDocuments = async () => {
//     try {
//       const response = await fetch('/api/documents', {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         }
//       });
//       const data = await response.json();
//       setDocuments(data);
//     } catch (error) {
//       console.error('Error fetching documents:', error);
//     }
//   };

//   const handleSelect = (docId) => {
//     const updatedSelection = selected.includes(docId)
//       ? selected.filter(id => id !== docId)
//       : [...selected, docId];
//     setSelected(updatedSelection);
//     onSelect(updatedSelection);
//   };

//   return (
//     <div className="document-selector">
//       <h3>Select Documents to Compare (minimum 2)</h3>
//       <div className="documents-grid">
//         {documents.map(doc => (
//           <div 
//             key={doc.id} 
//             className={`doc-item ${selected.includes(doc.id) ? 'selected' : ''}`}
//             onClick={() => handleSelect(doc.id)}
//           >
//             <span className="doc-title">{doc.title}</span>
//             <span className="doc-type">{doc.type}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default DocumentSelector;