// src/Components/Navigation.js
import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Box,
  Drawer, List, ListItem, ListItemText, ListItemIcon,
  useMediaQuery, useTheme, Divider, Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareIcon from '@mui/icons-material/Compare';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HomeIcon from '@mui/icons-material/Home';
import QuickSearch from './QuickSearch';
import '../styles/Navigation.css';

const Navigation = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // For the dashboard, also check root path
  const isDashboardActive = () => {
    return isActive('/dashboard') || isActive('/');
  };
  
  // Navigation items with icons for authenticated users
  const authenticatedNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, active: isDashboardActive() },
    { label: 'Search', path: '/search', icon: <SearchIcon />, active: isActive('/search') },
    { label: 'Contracts', path: '/contracts', icon: <DescriptionIcon />, active: isActive('/contracts') },
    { label: 'Upload', path: '/upload', icon: <UploadFileIcon />, active: isActive('/upload') },
    { label: 'Compare', path: '/compare', icon: <CompareIcon />, active: isActive('/compare') }
  ];
  
  // Navigation items for unauthenticated users
  const unauthenticatedNavItems = [
    { label: 'Home', path: '/', icon: <HomeIcon />, active: isActive('/') },
    { label: 'Login', path: '/login', icon: <LoginIcon />, active: isActive('/login') },
    { label: 'Register', path: '/register', icon: <PersonAddIcon />, active: isActive('/register') }
  ];
  
  const navItems = isAuthenticated ? authenticatedNavItems : unauthenticatedNavItems;
  
  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Legal Assistant
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.label}
            component={RouterLink}
            to={item.path}
            selected={item.active}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
      <Divider />
      {isAuthenticated && (
        <List>
          <ListItem button onClick={onLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      )}
    </Box>
  );

  return (
    <>
      <AppBar position="static" color="primary" className="app-bar">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" className="app-title">
              Legal Assistant
            </RouterLink>
          </Typography>
          
          {isAuthenticated && !isMobile && (
            <Box sx={{ mx: 2, flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
              <QuickSearch placeholder="Search documents..." />
            </Box>
          )}
          
          {!isMobile && (
            <Box className="desktop-menu">
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  color="inherit"
                  component={RouterLink}
                  to={item.path}
                  startIcon={item.icon}
                  className={item.active ? 'active-nav-button' : ''}
                >
                  {item.label}
                </Button>
              ))}
              
              {isAuthenticated && (
                <Button 
                  color="inherit" 
                  onClick={onLogout}
                  startIcon={<LogoutIcon />}
                >
                  Logout
                </Button>
              )}
            </Box>
          )}
          
          {isAuthenticated && isMobile && (
            <IconButton
              color="inherit"
              component={RouterLink}
              to="/search"
              aria-label="search"
              edge="end"
            >
              <SearchIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;