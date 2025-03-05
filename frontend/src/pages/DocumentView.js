import React from 'react'; 
import { useParams } from 'react-router-dom'; 
 
const DocumentView = () =
  const { id } = useParams(); 
 
  return ( 
    <div> 
      <h1>Document Viewer</h1> 
      <p>Viewing document with ID: {id}</p> 
    </div> 
  ); 
}; 
 
export default DocumentView; 
