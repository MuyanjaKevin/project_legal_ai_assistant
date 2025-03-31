import React, { createContext, useState, useEffect, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { getUserPreferences, updateUserPreferences } from '../services/settings';

// Create context
export const ThemeContext = createContext();

// Create light and dark themes
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4285f4',
    },
    secondary: {
      main: '#4caf50',
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#81c784',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Provider component
export const ThemeProvider = ({ children }) => {
  // Default to light theme
  const [themeMode, setThemeMode] = useState('light');
  const [loading, setLoading] = useState(true);
  
  // Function to toggle theme
  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    
    // Save to user preferences if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      updateUserPreferences({ theme: newMode }).catch(console.error);
    }
    
    // Also save to localStorage for persistence
    localStorage.setItem('themePreference', newMode);
  };
  
  // Set specific theme
  const setTheme = (mode) => {
    if (mode !== themeMode) {
      setThemeMode(mode);
      
      // Save to user preferences if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        updateUserPreferences({ theme: mode }).catch(console.error);
      }
      
      // Also save to localStorage for persistence
      localStorage.setItem('themePreference', mode);
    }
  };
  
  // Load user preferences on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Try to get from localStorage first (faster)
        const savedTheme = localStorage.getItem('themePreference');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
        
        // If user is logged in, get from API
        const token = localStorage.getItem('token');
        if (token) {
          const preferences = await getUserPreferences();
          if (preferences?.theme) {
            setThemeMode(preferences.theme);
            localStorage.setItem('themePreference', preferences.theme);
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Apply system preference if set to "system"
  useEffect(() => {
    if (themeMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDark ? 'dark' : 'light');
      
      // Add listener for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setThemeMode(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);
  
  // Determine which theme to use
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setTheme, loading }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);