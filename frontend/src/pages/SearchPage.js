// src/pages/SearchPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Container, Paper, Typography, TextField, Grid, Button, 
  CircularProgress, Box, FormControl, MenuItem, Select, 
  InputLabel, FormHelperText, Pagination, Card, CardContent,
  Divider, Chip, Accordion, AccordionSummary, AccordionDetails,
  Alert, IconButton, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SavedSearchesPanel from '../Components/Search/SavedSearchesPanel';
import SearchResultList from '../Components/Search/SearchResultList';
import { searchDocuments, getCategories } from '../services/search';
import '../styles/SearchPage.css';

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for search parameters
  const [searchParams, setSearchParams] = useState({
    q: '',
    category: 'All',
    start_date: null,
    end_date: null,
    file_type: '',
    status: '',
    tags: [],
    page: 1,
    per_page: 10
  });
  
  // State for search results and UI
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [fileTypes, setFileTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  
  // Parse URL query parameters when component mounts or URL changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    
    const params = { ...searchParams };
    if (queryParams.has('q')) params.q = queryParams.get('q');
    if (queryParams.has('category')) params.category = queryParams.get('category');
    if (queryParams.has('start_date')) params.start_date = new Date(queryParams.get('start_date'));
    if (queryParams.has('end_date')) params.end_date = new Date(queryParams.get('end_date'));
    if (queryParams.has('file_type')) params.file_type = queryParams.get('file_type');
    if (queryParams.has('status')) params.status = queryParams.get('status');
    if (queryParams.has('page')) params.page = parseInt(queryParams.get('page'), 10);
    
    // Handle tags (which can be multiple)
    const tags = queryParams.getAll('tags');
    if (tags.length > 0) {
      params.tags = tags;
    }
    
    setSearchParams(params);
    
    // Count active filters for badge display
    let filterCount = 0;
    if (params.category && params.category !== 'All') filterCount++;
    if (params.start_date) filterCount++;
    if (params.end_date) filterCount++;
    if (params.file_type) filterCount++;
    if (params.status) filterCount++;
    if (params.tags && params.tags.length > 0) filterCount += params.tags.length;
    setActiveFilters(filterCount);
    
    // If we have any search parameters, execute the search
    if (queryParams.toString()) {
      executeSearch(params);
    }
  }, [location.search]);
  
  // Load filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Get categories
        const categoriesList = await getCategories();
        setCategories(['All', ...categoriesList]);
        
        // Get more filter options
        const response = await fetch('/api/search/filters', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const filterOptions = await response.json();
          setFileTypes(filterOptions.file_types || []);
          setStatuses(filterOptions.statuses || []);
          setAvailableTags(filterOptions.tags || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    
    fetchFilterOptions();
  }, []);
  
  // Execute search with current parameters
  const executeSearch = useCallback(async (params = searchParams) => {
    setLoading(true);
    setSuggestion(null);
    
    try {
      // Prepare parameters for API
      const apiParams = { ...params };
      
      // Format dates for API
      if (apiParams.start_date instanceof Date && !isNaN(apiParams.start_date)) {
        apiParams.start_date = apiParams.start_date.toISOString().split('T')[0];
      } else {
        delete apiParams.start_date;
      }
      
      if (apiParams.end_date instanceof Date && !isNaN(apiParams.end_date)) {
        apiParams.end_date = apiParams.end_date.toISOString().split('T')[0];
      } else {
        delete apiParams.end_date;
      }
      
      // Remove "All" category to search all categories
      if (apiParams.category === 'All') {
        delete apiParams.category;
      }
      
      const response = await searchDocuments(apiParams);
      
      setResults(response.results || []);
      setTotalResults(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      // Check for search suggestions
      if (response.suggestion) {
        setSuggestion(response.suggestion);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update URL with search parameters (which will trigger the search)
    updateUrlWithSearchParams();
  };
  
  // Update search parameters
  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
      // Reset to page 1 when changing search parameters
      ...(field !== 'page' && { page: 1 })
    }));
  };
  
  // Handle tag selection
  const handleTagToggle = (tag) => {
    setSearchParams(prev => {
      const prevTags = prev.tags || [];
      const newTags = prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag];
        
      return {
        ...prev,
        tags: newTags,
        page: 1 // Reset to page 1 when changing tags
      };
    });
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchParams(prev => ({
      ...prev,
      category: 'All',
      start_date: null,
      end_date: null,
      file_type: '',
      status: '',
      tags: [],
      page: 1
    }));
    
    // Update URL without filters
    const queryParams = new URLSearchParams();
    if (searchParams.q) {
      queryParams.set('q', searchParams.q);
    }
    queryParams.set('page', '1');
    
    navigate(`/search?${queryParams.toString()}`);
  };
  
  // Update URL with current search parameters
  const updateUrlWithSearchParams = () => {
    const queryParams = new URLSearchParams();
    
    // Add query if not empty
    if (searchParams.q) {
      queryParams.set('q', searchParams.q);
    }
    
    // Add category if not 'All'
    if (searchParams.category && searchParams.category !== 'All') {
      queryParams.set('category', searchParams.category);
    }
    
    // Add dates if valid
    if (searchParams.start_date instanceof Date && !isNaN(searchParams.start_date)) {
      queryParams.set('start_date', searchParams.start_date.toISOString().split('T')[0]);
    }
    
    if (searchParams.end_date instanceof Date && !isNaN(searchParams.end_date)) {
      queryParams.set('end_date', searchParams.end_date.toISOString().split('T')[0]);
    }
    
    // Add file type if selected
    if (searchParams.file_type) {
      queryParams.set('file_type', searchParams.file_type);
    }
    
    // Add status if selected
    if (searchParams.status) {
      queryParams.set('status', searchParams.status);
    }
    
    // Add tags (can be multiple)
    if (searchParams.tags && searchParams.tags.length > 0) {
      searchParams.tags.forEach(tag => {
        queryParams.append('tags', tag);
      });
    }
    
    // Add page number
    queryParams.set('page', searchParams.page.toString());
    
    navigate(`/search?${queryParams.toString()}`);
  };
  
  // Handle page change in pagination
  const handlePageChange = (event, newPage) => {
    handleInputChange('page', newPage);
    updateUrlWithSearchParams();
  };
  
  // Use suggested search
  const handleUseSuggestion = () => {
    if (suggestion) {
      handleInputChange('q', suggestion);
      // Update URL and trigger search
      const queryParams = new URLSearchParams(location.search);
      queryParams.set('q', suggestion);
      queryParams.set('page', '1');
      navigate(`/search?${queryParams.toString()}`);
    }
  };
  
  // Handle loading a saved search
  const handleLoadSavedSearch = (savedSearch) => {
    // Parse the saved search query
    const params = savedSearch.query;
    
    // Update state with the saved search parameters
    setSearchParams({
      q: params.q || '',
      category: params.category || 'All',
      start_date: params.start_date ? new Date(params.start_date) : null,
      end_date: params.end_date ? new Date(params.end_date) : null,
      file_type: params.file_type || '',
      status: params.status || '',
      tags: params.tags || [],
      page: 1, // Always start from page 1 when loading a saved search
      per_page: params.per_page || 10
    });
    
    // Update URL to trigger search
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    if (params.category && params.category !== 'All') queryParams.set('category', params.category);
    if (params.start_date) queryParams.set('start_date', params.start_date);
    if (params.end_date) queryParams.set('end_date', params.end_date);
    if (params.file_type) queryParams.set('file_type', params.file_type);
    if (params.status) queryParams.set('status', params.status);
    
    // Add tags (can be multiple)
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tag => {
        queryParams.append('tags', tag);
      });
    }
    
    queryParams.set('page', '1');
    
    navigate(`/search?${queryParams.toString()}`);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" className="search-container">
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Document Search
        </Typography>
        
        <Grid container spacing={3}>
          {/* Saved Searches Panel */}
          <Grid item xs={12} md={3}>
            <SavedSearchesPanel 
              currentSearch={searchParams} 
              onLoadSearch={handleLoadSavedSearch} 
            />
          </Grid>
          
          {/* Main Search Area */}
          <Grid item xs={12} md={9}>
            {/* Search Form */}
            <Paper elevation={3} className="search-form-paper">
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  {/* Search Query */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Search Documents"
                      variant="outlined"
                      value={searchParams.q}
                      onChange={(e) => handleInputChange('q', e.target.value)}
                      placeholder="Enter keywords to search documents..."
                      InputProps={{
                        startAdornment: <SearchIcon color="action" style={{ marginRight: 8 }} />,
                      }}
                    />
                  </Grid>
                  
                  {/* Basic Filters */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel id="category-label">Category</InputLabel>
                      <Select
                        labelId="category-label"
                        value={searchParams.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                      >
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Start Date Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <DatePicker
                      label="From Date"
                      value={searchParams.start_date}
                      onChange={(date) => handleInputChange('start_date', date)}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth variant="outlined" />
                      )}
                    />
                  </Grid>
                  
                  {/* End Date Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <DatePicker
                      label="To Date"
                      value={searchParams.end_date}
                      onChange={(date) => handleInputChange('end_date', date)}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth variant="outlined" />
                      )}
                    />
                  </Grid>
                  
                  {/* Advanced Filters Section */}
                  <Grid item xs={12}>
                    <Accordion 
                      expanded={filtersExpanded} 
                      onChange={() => setFiltersExpanded(!filtersExpanded)}
                      className="advanced-filters-accordion"
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="advanced-filters-content"
                        id="advanced-filters-header"
                      >
                        <Box display="flex" alignItems="center">
                          <FilterListIcon style={{ marginRight: 8 }} />
                          <Typography>Advanced Filters</Typography>
                          {activeFilters > 0 && (
                            <Chip 
                              size="small" 
                              label={activeFilters} 
                              color="primary" 
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {/* File Type Filter */}
                          <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth variant="outlined">
                              <InputLabel id="file-type-label">File Type</InputLabel>
                              <Select
                                labelId="file-type-label"
                                value={searchParams.file_type}
                                onChange={(e) => handleInputChange('file_type', e.target.value)}
                                label="File Type"
                              >
                                <MenuItem value="">Any Type</MenuItem>
                                {fileTypes.map((type) => (
                                  <MenuItem key={type} value={type}>
                                    {type.toUpperCase()}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          {/* Status Filter */}
                          <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth variant="outlined">
                              <InputLabel id="status-label">Status</InputLabel>
                              <Select
                                labelId="status-label"
                                value={searchParams.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                label="Status"
                              >
                                <MenuItem value="">Any Status</MenuItem>
                                {statuses.map((status) => (
                                  <MenuItem key={status} value={status}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          {/* Clear Filters Button */}
                          <Grid item xs={12} sm={6} md={4} display="flex" alignItems="center">
                            <Button
                              variant="outlined"
                              color="secondary"
                              onClick={handleClearFilters}
                              disabled={activeFilters === 0}
                              startIcon={<ClearIcon />}
                              fullWidth
                            >
                              Clear All Filters
                            </Button>
                          </Grid>
                          
                          {/* Tags Section */}
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                              Tags
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {availableTags.map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  onClick={() => handleTagToggle(tag)}
                                  color={searchParams.tags?.includes(tag) ? "primary" : "default"}
                                  clickable
                                  size="small"
                                  className="filter-tag-chip"
                                />
                              ))}
                              {availableTags.length === 0 && (
                                <Typography variant="body2" color="textSecondary">
                                  No tags available for filtering
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                  
                  {/* Search Button */}
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      fullWidth
                      startIcon={<SearchIcon />}
                      disabled={loading}
                    >
                      {loading ? 'Searching...' : 'Search Documents'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
            
            {/* Search Suggestion */}
            {suggestion && (
              <Box mt={2}>
                <Alert 
                  severity="info"
                  action={
                    <Button color="inherit" size="small" onClick={handleUseSuggestion}>
                      Search Instead
                    </Button>
                  }
                >
                  Did you mean: <strong>{suggestion}</strong>?
                </Alert>
              </Box>
            )}
            
            {/* Search Results */}
            <Box mt={3}>
              {loading ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : results.length > 0 ? (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h2">
                      Search Results
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Found {totalResults} document{totalResults !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  <SearchResultList results={results} />
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        count={totalPages}
                        page={searchParams.page}
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </>
              ) : searchParams.q || searchParams.category !== 'All' || searchParams.start_date || searchParams.end_date || searchParams.file_type || searchParams.status || (searchParams.tags && searchParams.tags.length > 0) ? (
                <Card>
                  <CardContent>
                    <Typography align="center" color="textSecondary">
                      No documents found matching your search criteria.
                    </Typography>
                    {activeFilters > 0 && (
                      <Box display="flex" justifyContent="center" mt={2}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleClearFilters}
                          startIcon={<ClearIcon />}
                        >
                          Clear Filters
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </LocalizationProvider>
  );
};

export default SearchPage;