// src/pages/UserSettings.js
import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Tabs, Tab, Paper, 
  Divider, TextField, Button, Switch, FormControlLabel,
  Select, MenuItem, FormControl, InputLabel, Alert, 
  Snackbar, Card, CardContent, IconButton, CircularProgress, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { 
  getUserProfile, updateUserProfile,
  getUserPreferences, updateUserPreferences,
  getApiKeys, createApiKey, deleteApiKey
} from '../services/settings';
import { useTheme } from '../context/ThemeContext';
import '../styles/UserSettings.css';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserSettings = () => {
  // Get theme context
  const { setTheme } = useTheme();
  
  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  
  // State for profile
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: ''
  });
  
  // State for preferences
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: {
      email: true,
      browser: true
    },
    ui_settings: {
      language: 'en',
      document_view: 'list'
    }
  });
  
  // State for API keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState({
    profile: false,
    preferences: false,
    apiKeys: false
  });
  const [error, setError] = useState({
    profile: null,
    preferences: null,
    apiKeys: null
  });
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Load user data on component mount
  useEffect(() => {
    loadUserProfile();
    loadUserPreferences();
    loadApiKeys();
  }, []);
  
  // Fetch user profile
  const loadUserProfile = async () => {
    setLoading((prev) => ({ ...prev, profile: true }));
    setError((prev) => ({ ...prev, profile: null }));
    
    try {
      const profileData = await getUserProfile();
      setProfile(profileData);
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        profile: err.message || 'Failed to load profile' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };
  
  // Fetch user preferences
  const loadUserPreferences = async () => {
    setLoading((prev) => ({ ...prev, preferences: true }));
    setError((prev) => ({ ...prev, preferences: null }));
    
    try {
      const preferencesData = await getUserPreferences();
      setPreferences(preferencesData);
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        preferences: err.message || 'Failed to load preferences' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, preferences: false }));
    }
  };
  
  // Fetch API keys (only for enterprise users)
  const loadApiKeys = async () => {
    setLoading((prev) => ({ ...prev, apiKeys: true }));
    setError((prev) => ({ ...prev, apiKeys: null }));
    
    try {
      const keys = await getApiKeys();
      setApiKeys(keys);
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        apiKeys: err.message || 'Failed to load API keys' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, apiKeys: false }));
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, profile: true }));
    setError((prev) => ({ ...prev, profile: null }));
    
    try {
      await updateUserProfile({ name: profile.name });
      showNotification('Profile updated successfully', 'success');
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        profile: err.message || 'Failed to update profile' 
      }));
      showNotification('Failed to update profile', 'error');
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };
  
  // Handle preferences form submission
  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, preferences: true }));
    setError((prev) => ({ ...prev, preferences: null }));
    
    try {
      await updateUserPreferences(preferences);
      // Apply theme immediately
      if (preferences.theme) {
        setTheme(preferences.theme);
      }
      showNotification('Preferences updated successfully', 'success');
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        preferences: err.message || 'Failed to update preferences' 
      }));
      showNotification('Failed to update preferences', 'error');
    } finally {
      setLoading((prev) => ({ ...prev, preferences: false }));
    }
  };
  
  // Handle API key creation
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showNotification('Please enter a name for the API key', 'error');
      return;
    }
    
    setLoading((prev) => ({ ...prev, apiKeys: true }));
    setError((prev) => ({ ...prev, apiKeys: null }));
    
    try {
      const result = await createApiKey(newKeyName);
      setNewKey(result.api_key);
      setNewKeyName('');
      loadApiKeys(); // Reload the list
      showNotification('API key created successfully', 'success');
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        apiKeys: err.message || 'Failed to create API key' 
      }));
      showNotification('Failed to create API key', 'error');
    } finally {
      setLoading((prev) => ({ ...prev, apiKeys: false }));
    }
  };
  
  // Handle API key deletion
  const handleDeleteApiKey = async (keyId) => {
    setLoading((prev) => ({ ...prev, apiKeys: true }));
    setError((prev) => ({ ...prev, apiKeys: null }));
    
    try {
      await deleteApiKey(keyId);
      loadApiKeys(); // Reload the list
      showNotification('API key deleted successfully', 'success');
    } catch (err) {
      setError((prev) => ({ 
        ...prev, 
        apiKeys: err.message || 'Failed to delete API key' 
      }));
      showNotification('Failed to delete API key', 'error');
    } finally {
      setLoading((prev) => ({ ...prev, apiKeys: false }));
    }
  };
  
  // Copy API key to clipboard
  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key);
    showNotification('API key copied to clipboard', 'success');
  };
  
  // Helper function to show notifications
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  // Handle notification close
  const handleNotificationClose = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };
  
  // Handle profile field change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle preferences change
  const handlePreferenceChange = (section, field, value) => {
    if (section) {
      // Nested field (e.g., notifications.email)
      setPreferences((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      // Top-level field (e.g., theme)
      setPreferences((prev) => ({
        ...prev,
        [field]: value
      }));
      
      // If changing theme, apply it immediately
      if (field === 'theme') {
        setTheme(value);
      }
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Settings
      </Typography>
      
      {/* Tabs navigation */}
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Profile" />
          <Tab label="Preferences" />
          <Tab label="API Keys" />
        </Tabs>
      </Paper>
      
      {/* Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {error.profile && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error.profile}
            </Alert>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name"
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  name="email"
                  value={profile.email}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  disabled
                  helperText="Email address cannot be changed"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Account Type"
                  name="role"
                  value={profile.role === 'enterprise' ? 'Enterprise' : 'Standard'}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  disabled
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading.profile}
                  sx={{ mt: 2 }}
                >
                  {loading.profile ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </TabPanel>
      
      {/* Preferences Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            User Preferences
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {error.preferences && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error.preferences}
            </Alert>
          )}
          
          <form onSubmit={handlePreferencesSubmit}>
            <Grid container spacing={3}>
              {/* Theme Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="theme-label">Theme</InputLabel>
                  <Select
                    labelId="theme-label"
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange(null, 'theme', e.target.value)}
                    label="Theme"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System Default</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Language Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="language-label">Language</InputLabel>
                  <Select
                    labelId="language-label"
                    value={preferences.ui_settings?.language || 'en'}
                    onChange={(e) => handlePreferenceChange('ui_settings', 'language', e.target.value)}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="de">Deutsch</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Document View Preference */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="document-view-label">Default Document View</InputLabel>
                  <Select
                    labelId="document-view-label"
                    value={preferences.ui_settings?.document_view || 'list'}
                    onChange={(e) => handlePreferenceChange('ui_settings', 'document_view', e.target.value)}
                    label="Default Document View"
                  >
                    <MenuItem value="list">List View</MenuItem>
                    <MenuItem value="grid">Grid View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Notification Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications?.email || false}
                      onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications?.browser || false}
                      onChange={(e) => handlePreferenceChange('notifications', 'browser', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Browser Notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading.preferences}
                  sx={{ mt: 2 }}
                >
                  {loading.preferences ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </TabPanel>
      
      {/* API Keys Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Keys
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {profile.role === 'enterprise' 
              ? 'Manage your API keys for programmatic access to the Legal Assistant API.' 
              : 'API keys are only available for enterprise accounts. Please contact support to upgrade.'}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {error.apiKeys && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error.apiKeys}
            </Alert>
          )}
          
          {/* Show newly created key */}
          {newKey && (
            <Alert 
              severity="success" 
              sx={{ mb: 3 }}
              onClose={() => setNewKey(null)}
            >
              <Typography variant="subtitle2">
                API Key created successfully!
              </Typography>
              <Box 
                sx={{ 
                  p: 2, 
                  mt: 1, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  position: 'relative'
                }}
              >
                {newKey.key}
                <IconButton 
                  size="small" 
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                  onClick={() => copyApiKey(newKey.key)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="error">
                This key will only be shown once. Please copy it now.
              </Typography>
            </Alert>
          )}
          
          {/* API Key Creation Form */}
          {profile.role === 'enterprise' && (
            <Box sx={{ mb: 4 }}>
              <form onSubmit={handleCreateApiKey}>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs>
                    <TextField
                      label="API Key Name"
                      placeholder="e.g., Development, Production"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      fullWidth
                      margin="normal"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={loading.apiKeys || !newKeyName.trim()}
                      startIcon={<AddIcon />}
                      sx={{ height: 56 }}
                    >
                      Create Key
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Box>
          )}
          
          {/* API Keys List */}
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Your API Keys
          </Typography>
          
          {loading.apiKeys ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : apiKeys.length === 0 ? (
            <Alert severity="info">
              {profile.role === 'enterprise' 
                ? 'You haven\'t created any API keys yet.'
                : 'API keys are only available for enterprise accounts.'}
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {apiKeys.map((key) => (
                <Grid item xs={12} key={key.id}>
                  <Card sx={{ display: 'flex', alignItems: 'center' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">
                        {key.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Key: {key.key_preview}
                      </Typography>
                      {key.last_used && (
                        <Typography variant="caption" color="textSecondary">
                          Last used: {new Date(key.last_used).toLocaleString()}
                        </Typography>
                      )}
                    </CardContent>
                    <Box sx={{ p: 2 }}>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteApiKey(key.id)}
                        disabled={loading.apiKeys}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </TabPanel>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleNotificationClose} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserSettings;