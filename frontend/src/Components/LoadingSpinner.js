// src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'primary' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };
  
  const colorMap = {
    primary: 'border-primary',
    secondary: 'border-secondary',
    white: 'border-white'
  };
  
  return (
    <div className={`loading-spinner ${sizeMap[size]} ${colorMap[color]}`}></div>
  );
};

export default LoadingSpinner;