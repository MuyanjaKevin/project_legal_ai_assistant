// frontend/src/components/DocumentTranslation.js

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, CircularProgress, Alert,
  Select, MenuItem, FormControl, InputLabel, Button,
  Divider, Tabs, Tab
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { getSupportedLanguages, translateDocument } from '../services/translation';

const DocumentTranslation = ({ documentId, documentText }) => {
  const [loading, setLoading] = useState(false);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Load supported languages
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const langs = await getSupportedLanguages();
        setLanguages(langs);
      } catch (err) {
        console.error("Failed to load languages:", err);
        setError("Failed to load supported languages");
      } finally {
        setLanguagesLoading(false);
      }
    };
    
    loadLanguages();
  }, []);
  
  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };
  
  const handleTranslate = async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Starting translation for document:", documentId);
      console.log("Target language:", selectedLanguage);
      
      const result = await translateDocument(documentId, selectedLanguage);
      console.log("Translation result:", result);
      
      if (!result.translated_text) {
        throw new Error("No translation received from the server");
      }
      
      setTranslatedText(result.translated_text);
      // Switch to translated text tab
      setTabValue(1);
    } catch (err) {
      console.error("Translation error:", err);
      setError(err.message || "Failed to translate document");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TranslateIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Document Translation</Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="language-label">Target Language</InputLabel>
          <Select
            labelId="language-label"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            label="Target Language"
            disabled={languagesLoading}
          >
            {languages.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          onClick={handleTranslate}
          disabled={loading || !documentId}
          startIcon={loading ? <CircularProgress size={20} /> : <TranslateIcon />}
        >
          {loading ? 'Translating...' : 'Translate'}
        </Button>
      </Box>
      
      {(documentText || translatedText) && (
        <>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Original" />
            <Tab label="Translated" disabled={!translatedText} />
          </Tabs>
          
          <Box sx={{ 
            maxHeight: '400px', 
            overflow: 'auto', 
            p: 2, 
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            bgcolor: '#f9f9f9',
            color: '#333333',          // Added dark text color
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',   // Added monospace font for better text display
            fontSize: '0.9rem',        // Added appropriate font size
            lineHeight: 1.5,           // Improved line height for readability
            boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)' // Subtle inner shadow
          }}>
            {tabValue === 0 ? (
              documentText || "No document text available"
            ) : (
              translatedText || "No translation available"
            )}
          </Box>
          
          {/* Added test button for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outlined" 
              size="small"
              sx={{ mt: 2 }}
              onClick={() => {
                setTranslatedText("This is test translated text to verify display.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.");
                setTabValue(1);
              }}
            >
              Test Display
            </Button>
          )}
        </>
      )}
    </Paper>
  );
};

export default DocumentTranslation;