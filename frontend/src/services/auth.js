// // src/utils/auth.js

// // Store token in both localStorage and a global variable for immediate access
// let currentToken = null;

// export const setAuthToken = (token) => {
//   // Store in memory
//   currentToken = token;
  
//   // Store in localStorage
//   if (token) {
//     localStorage.setItem('token', token);
//     console.log('Token saved both in memory and localStorage');
//   } else {
//     localStorage.removeItem('token');
//     console.log('Token removed from memory and localStorage');
//   }
  
//   return token;
// };

// export const getAuthToken = () => {
//   // Try memory first for performance
//   if (currentToken) {
//     return currentToken;
//   }
  
//   // Fall back to localStorage
//   const token = localStorage.getItem('token');
//   if (token) {
//     // Update memory cache
//     currentToken = token;
//     return token;
//   }
  
//   return null;
// };

// export const isAuthenticated = () => {
//   return !!getAuthToken();
// };

// export const setUserData = (userData) => {
//   if (userData) {
//     localStorage.setItem('user', JSON.stringify(userData));
//   } else {
//     localStorage.removeItem('user');
//   }
// };

// export const getUserData = () => {
//   const userJson = localStorage.getItem('user');
//   if (userJson) {
//     try {
//       return JSON.parse(userJson);
//     } catch (e) {
//       console.error('Error parsing user data:', e);
//       return null;
//     }
//   }
//   return null;
// };

// export const logout = () => {
//   setAuthToken(null);
//   setUserData(null);
// };