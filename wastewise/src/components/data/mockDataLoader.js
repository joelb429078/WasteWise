// mockDataLoader.js - Add this to your components/data folder

import { initializeMockData, setupFetchInterceptor } from './mockData';

// Initialize the data in localStorage
const loadMockData = () => {
  // Check if we're running in the browser
  if (typeof window === 'undefined') {
    return () => {}; // Return empty cleanup function for server-side rendering
  }
  
  console.log("Loading mock data for demo...");
  
  // Initialize the mock data in localStorage
  initializeMockData();
  
  // Set up fetch interceptor to return mock data for API calls
  const cleanupInterceptor = setupFetchInterceptor();
  
  // Add a helper function to localStorage to reset the data
  window.resetMockData = () => {
    // Clear specific keys
    localStorage.removeItem('mockLeaderboardData');
    localStorage.removeItem('mockWasteLogs');
    localStorage.removeItem('mockMetrics');
    localStorage.removeItem('mockWasteChart');
    localStorage.removeItem('mockWasteTypes');
    localStorage.removeItem('mockEmployeesByCompany');
    
    // Re-initialize
    initializeMockData();
    console.log("Mock data has been reset!");
  };
  
  // Return cleanup function
  return cleanupInterceptor;
};

export default loadMockData;