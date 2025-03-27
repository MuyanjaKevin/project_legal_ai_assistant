import React, { useState, useEffect } from 'react';
import {
  Paper, Typography, List, ListItem, ListItemText, ListItemIcon,
  ListItemSecondaryAction, IconButton, Divider, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Box, CircularProgress, Alert
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../../services/search';

const SavedSearchesPanel = ({ currentSearch, onLoadSearch }) => {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load saved searches
  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      setLoading(true);
      const searches = await getSavedSearches();
      setSavedSearches(searches || []);
      setError(null);
    } catch (err) {
      console.error('Error loading saved searches:', err);
      setError('Failed to load saved searches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening save dialog
  const handleSaveSearch = () => {
    // Check if current search has any parameters
    const hasSearchParams = currentSearch.q || 
                           currentSearch.category !== 'All' || 
                           currentSearch.start_date || 
                           currentSearch.end_date;
    
    if (!hasSearchParams) {
      setError('Please enter search criteria before saving');
      return;
    }
    
    setSaveDialogOpen(true);
    setSearchName('');
  };

  // Handle saving search
  const handleSaveConfirm = async () => {
    if (!searchName.trim()) {
      setError('Please enter a name for your search');
      return;
    }

    try {
      setLoading(true);
      
      // Format dates for storage
      const searchToSave = { ...currentSearch };
      if (searchToSave.start_date instanceof Date) {
        searchToSave.start_date = searchToSave.start_date.toISOString().split('T')[0];
      }
      if (searchToSave.end_date instanceof Date) {
        searchToSave.end_date = searchToSave.end_date.toISOString().split('T')[0];
      }
      
      await saveSearch(searchName, searchToSave);
      await loadSavedSearches();
      setSaveDialogOpen(false);
      setSuccess('Search saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving search:', err);
      setError('Failed to save search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening delete dialog
  const handleDeleteClick = (id, event) => {
    event.stopPropagation();
    setSelectedSearchId(id);
    setDeleteDialogOpen(true);
  };

  // Handle deleting saved search
  const handleDeleteConfirm = async () => {
    if (!selectedSearchId) return;

    try {
      setLoading(true);
      await deleteSavedSearch(selectedSearchId);
      await loadSavedSearches();
      setDeleteDialogOpen(false);
      setSuccess('Search deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting saved search:', err);
      setError('Failed to delete search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Paper elevation={3} className="saved-searches-panel">
        <Box p={2}>
          <Typography variant="h6" component="h2" gutterBottom>
            Saved Searches
          </Typography>
          
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleSaveSearch}
            startIcon={<BookmarkIcon />}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Save Current Search
          </Button>
          
          <Divider sx={{ my: 2 }} />
          
          {loading ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress size={28} />
            </Box>
          ) : savedSearches && savedSearches.length > 0 ? (
            <List>
              {savedSearches.map((search) => (
                <ListItem
                  button
                  key={search._id}
                  onClick={() => onLoadSearch(search)}
                  className="saved-search-item"
                >
                  <ListItemIcon>
                    <SearchIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={search.name}
                    secondary={
                      search.query.q 
                        ? `"${search.query.q}"`
                        : "No search terms"
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => handleDeleteClick(search._id, e)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="textSecondary" align="center">
              No saved searches yet. Save a search to quickly access it later.
            </Typography>
          )}
        </Box>
      </Paper>
      
      {/* Save Search Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        aria-labelledby="save-search-dialog-title"
      >
        <DialogTitle id="save-search-dialog-title">Save Search</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for this search to save it for future use.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Search Name"
            fullWidth
            variant="outlined"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfirm}
            color="primary"
            variant="contained"
            disabled={!searchName.trim() || loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-search-dialog-title"
      >
        <DialogTitle id="delete-search-dialog-title">Delete Saved Search</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this saved search? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SavedSearchesPanel;
