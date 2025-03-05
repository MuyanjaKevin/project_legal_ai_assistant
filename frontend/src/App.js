import React from 'react'; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
import Dashboard from './pages/Dashboard'; 
import Login from './pages/Login'; 
import Register from './pages/Register'; 
import DocumentView from './pages/DocumentView'; 
import './App.css'; 
 
function App() { 
  return ( 
    <Router> 
      <div className="App"> 
        <Routes> 
          <Route path="/login" element={<Login />} /> 
          <Route path="/register" element={<Register />} /> 
          <Route path="/documents/:id" element={<DocumentView />} /> 
          <Route path="/" element={<Dashboard />} /> 
        </Routes> 
      </div> 
    </Router> 
  ); 
} 
 
export default App; 
