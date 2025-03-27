// src/Components/Search/SearchResultList.js
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  List, ListItem, ListItemText, Typography, Divider, Chip,
  Paper, Box, Button, Card, CardContent, CardActions,
  CardHeader, Avatar
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderIcon from '@mui/icons-material/Folder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const SearchResultList = ({ results }) => {
  // Format date for display
  const formatDate = (isoDate) => {
    if (!isoDate) return 'Unknown date';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Choose icon based on file type
  const getFileTypeIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <PictureAsPdfIcon style={{ color: '#F40F02' }} />;
      case 'docx':
      case 'doc':
        return <DescriptionIcon style={{ color: '#2B579A' }} />;
      case 'txt':
        return <TextSnippetIcon style={{ color: '#646464' }} />;
      default:
        return <InsertDriveFileIcon />;
    }
  };
  
  // Get file type label
  const getFileTypeLabel = (fileType) => {
    if (!fileType) return 'Unknown';
    return fileType.toUpperCase();
  };

  return (
    <Paper elevation={2}>
      <List disablePadding>
        {results.map((result, index) => (
          <React.Fragment key={result._id}>
            {index > 0 && <Divider />}
            <Card variant="outlined" className="search-result-card">
              <CardHeader
                avatar={
                  <Avatar className="file-type-avatar">
                    {getFileTypeIcon(result.file_type)}
                  </Avatar>
                }
                title={
                  <Typography 
                    variant="h6" 
                    component="h3" 
                    className="result-title"
                    dangerouslySetInnerHTML={{ 
                      __html: result.highlighted_name || result.name || 'Untitled Document'
                    }}
                  />
                }
                subheader={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
                    <Chip 
                      size="small" 
                      label={getFileTypeLabel(result.file_type)} 
                      variant="outlined"
                      className="file-type-chip"
                    />
                    
                    {result.category && (
                      <Chip 
                        size="small"
                        icon={<FolderIcon />}
                        label={result.category} 
                        variant="outlined"
                        className="category-chip"
                      />
                    )}
                    
                    {result.status && (
                      <Chip 
                        size="small"
                        label={result.status} 
                        variant="outlined"
                        className="status-chip"
                      />
                    )}
                    
                    <Box display="flex" alignItems="center">
                      <CalendarTodayIcon fontSize="small" color="action" style={{ marginRight: 4 }} />
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(result.upload_date)}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <CardContent>
                {/* Show highlighted snippet if available, otherwise use extracted_text */}
                {(result.highlighted_snippet || result.extracted_text) && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    paragraph 
                    className="search-result-preview"
                    dangerouslySetInnerHTML={{ 
                      __html: result.highlighted_snippet || result.extracted_text 
                    }}
                  />
                )}
                
                {/* Tags */}
                {result.tags && result.tags.length > 0 && (
                  <Box display="flex" alignItems="center" mt={1} flexWrap="wrap" gap={0.5}>
                    <LocalOfferIcon fontSize="small" color="action" style={{ marginRight: 4 }} />
                    {result.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small"
                        variant="outlined"
                        className="tag-chip"
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
              
              <CardActions>
                <Button 
                  component={Link} 
                  to={`/documents/${result._id}`}
                  startIcon={<VisibilityIcon />}
                  color="primary"
                  size="small"
                >
                  View Document
                </Button>
              </CardActions>
            </Card>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default SearchResultList;