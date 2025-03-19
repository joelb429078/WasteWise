// mockData.js - A utility to manage consistent mock data across pages

// Initialize mock data in localStorage
export const initializeMockData = () => {
  console.log("Initializing mock data...");
  
  // Mock leaderboard data - consistent with your SQL data for businesses 21-25
  if (!localStorage.getItem('mockLeaderboardData')) {
    const mockLeaderboardData = [
      { 
        businessID: 24, 
        companyName: "EcoCare Consulting", 
        rank: 1,
        wastePerEmployee: 1.8, 
        formattedWastePerEmployee: "1.8", 
        seasonalWaste: 4.1,
        formattedWaste: "4.1",
        rankChange: 2, 
        previousRank: 3,
        username: "EcoCare Consulting"
      },
      { 
        businessID: 21, 
        companyName: "EcoTech Solutions", 
        rank: 2, 
        wastePerEmployee: 3.2,
        formattedWastePerEmployee: "3.2",
        seasonalWaste: 16.0,
        formattedWaste: "16.0",
        rankChange: -1, 
        previousRank: 1,
        username: "EcoTech Solutions"
      },
      { 
        businessID: 25, 
        companyName: "Urban Recyclers Ltd", 
        rank: 3, 
        wastePerEmployee: 4.1,
        formattedWastePerEmployee: "4.1",
        seasonalWaste: 20.6,
        formattedWaste: "20.6",
        rankChange: 1, 
        previousRank: 4,
        username: "Urban Recyclers Ltd"
      },
      { 
        businessID: 23, 
        companyName: "Sustainable Foods Inc", 
        rank: 4, 
        wastePerEmployee: 4.8,
        formattedWastePerEmployee: "4.8",
        seasonalWaste: 49.6,
        formattedWaste: "49.6",
        rankChange: -2, 
        previousRank: 2,
        username: "Sustainable Foods Inc"
      },
      { 
        businessID: 22, 
        companyName: "Green Planet Logistics", 
        rank: 5, 
        wastePerEmployee: 5.3,
        formattedWastePerEmployee: "5.3",
        seasonalWaste: 24.6,
        formattedWaste: "24.6",
        rankChange: 0, 
        previousRank: 5,
        username: "Green Planet Logistics"
      },
      {
        businessID: 1,
        companyName: "Shell",
        rank: 6,
        wastePerEmployee: 6.4,
        formattedWastePerEmployee: "6.4",
        seasonalWaste: 5600,
        formattedWaste: "5600.0",
        rankChange: -1,
        previousRank: 5,
        username: "Shell"
      },
      {
        businessID: 2,
        companyName: "BP",
        rank: 7,
        wastePerEmployee: 8.2,
        formattedWastePerEmployee: "8.2",
        seasonalWaste: 13380,
        formattedWaste: "13380.0",
        rankChange: 0,
        previousRank: 7,
        username: "BP"
      },
      {
        businessID: 17,
        companyName: "limited",
        rank: 8,
        wastePerEmployee: 10.0,
        formattedWastePerEmployee: "10.0",
        seasonalWaste: 0.01,
        formattedWaste: "0.0",
        rankChange: 1,
        previousRank: 9,
        username: "limited"
      },
      {
        businessID: 4,
        companyName: "Jones",
        rank: 9,
        wastePerEmployee: 12.5,
        formattedWastePerEmployee: "12.5",
        seasonalWaste: 75.0,
        formattedWaste: "75.0",
        rankChange: -2,
        previousRank: 7,
        username: "Jones"
      },
      {
        businessID: 13,
        companyName: "University of Bristol",
        rank: 10,
        wastePerEmployee: 15.7,
        formattedWastePerEmployee: "15.7",
        seasonalWaste: 94.2,
        formattedWaste: "94.2",
        rankChange: 0,
        previousRank: 10,
        username: "University of Bristol"
      }
    ];
    localStorage.setItem('mockLeaderboardData', JSON.stringify(mockLeaderboardData));
  }
  
  // Mock waste logs data - based on your SQL data
  if (!localStorage.getItem('mockWasteLogs')) {
    const mockWasteLogs = [
      { logID: 9, created_at: '2025-03-19 15:55:24.46+00', userID: 57, wasteType: 'Paper', weight: 0.78, location: 'Main office', businessID: 24, username: 'liam.johnson' },
      { logID: 3, created_at: '2025-03-06 21:01:36.949+00', userID: 57, wasteType: 'Glass', weight: 0.67, location: 'Meeting room', businessID: 24, username: 'liam.johnson' },
      { logID: 2, created_at: '2025-03-04 11:32:18.462+00', userID: 57, wasteType: 'Mixed', weight: 0.69, location: 'Meeting Room', businessID: 24, username: 'liam.johnson' },
      { logID: 1, created_at: '2025-03-04 11:16:21.681+00', userID: 57, wasteType: 'Food', weight: 0.9, location: 'Office Kitchen', businessID: 24, username: 'liam.johnson' },
      { logID: 7, created_at: '2025-03-18 11:10:56.45+00', userID: 73, wasteType: 'Mixed', weight: 1, location: 'Office', businessID: 1, username: 'Admin' },
      { logID: 6, created_at: '2025-03-18 10:59:36.63+00', userID: 5, wasteType: 'Electronics', weight: 2, location: 'bath', businessID: 1, username: 'bob' },
      { logID: 5, created_at: '2025-03-18 10:43:35+00', userID: 5, wasteType: 'Food', weight: 5, location: null, businessID: 1, username: 'bob' },
      { logID: 4, created_at: '2025-03-13 14:31:32.744+00', userID: 72, wasteType: 'Paper', weight: 5, location: 'Entrance', businessID: 1, username: 'Employee' },
      { logID: 8, created_at: '2025-03-18 11:19:28.701+00', userID: 74, wasteType: 'Paper', weight: 0.01, location: null, businessID: 17, username: 'john' },
    ];
    localStorage.setItem('mockWasteLogs', JSON.stringify(mockWasteLogs));
  }
  
  // Mock dashboard metrics
  if (!localStorage.getItem('mockMetrics')) {
    const mockMetrics = {
      co2Emissions: 125.8,
      co2Change: -12.3,
      totalWaste: 35.4,
      wasteChange: -8.5,
      mostRecentLog: {
        date: '2025-03-19',
        weight: 0.78
      },
      mostRecentChange: 2.6,
      currentRank: 2,
      rankChange: 1
    };
    localStorage.setItem('mockMetrics', JSON.stringify(mockMetrics));
  }
  
  // Mock waste chart data
  if (!localStorage.getItem('mockWasteChart')) {
    const mockWasteChart = {
      day: [
        { date: 'Morning', waste: 1.2 },
        { date: 'Afternoon', waste: 2.5 },
        { date: 'Evening', waste: 0.8 }
      ],
      month: [
        { date: 'Week 1', waste: 8.5 },
        { date: 'Week 2', waste: 7.2 },
        { date: 'Week 3', waste: 9.1 },
        { date: 'Week 4', waste: 6.3 }
      ],
      quarter: [
        { date: 'Jan', waste: 32.5 },
        { date: 'Feb', waste: 28.7 },
        { date: 'Mar', waste: 35.4 }
      ],
      year: [
        { date: 'Q1', waste: 95.6 },
        { date: 'Q2', waste: 88.4 },
        { date: 'Q3', waste: 104.2 },
        { date: 'Q4', waste: 92.8 }
      ]
    };
    localStorage.setItem('mockWasteChart', JSON.stringify(mockWasteChart));
  }
  
  // Mock waste types for pie chart
  if (!localStorage.getItem('mockWasteTypes')) {
    const mockWasteTypes = [
      { name: 'Paper', value: 45 },
      { name: 'Plastic', value: 28 },
      { name: 'Food', value: 15 },
      { name: 'Glass', value: 8 },
      { name: 'Metal', value: 4 }
    ];
    localStorage.setItem('mockWasteTypes', JSON.stringify(mockWasteTypes));
  }
  
  // Mock employee data by company
  if (!localStorage.getItem('mockEmployeesByCompany')) {
    const mockEmployeesByCompany = {
      '1': 875, // Shell
      '2': 1625, // BP
      '4': 6, // Jones
      '13': 6, // University of Bristol
      '17': 1, // limited
      '21': 5, // EcoTech Solutions  
      '22': 5, // Green Planet Logistics
      '23': 10, // Sustainable Foods Inc
      '24': 4, // EcoCare Consulting
      '25': 5, // Urban Recyclers Ltd
    };
    localStorage.setItem('mockEmployeesByCompany', JSON.stringify(mockEmployeesByCompany));
  }
};

// Retrieve mock leaderboard data
export const getMockLeaderboardData = () => {
  return JSON.parse(localStorage.getItem('mockLeaderboardData') || '[]');
};

// Retrieve mock waste logs
export const getMockWasteLogs = () => {
  return JSON.parse(localStorage.getItem('mockWasteLogs') || '[]');
};

// Retrieve dashboard metrics
export const getMockMetrics = () => {
  return JSON.parse(localStorage.getItem('mockMetrics') || '{}');
};

// Retrieve waste chart data for a specific timeframe
export const getMockWasteChart = (timeframe) => {
  const allData = JSON.parse(localStorage.getItem('mockWasteChart') || '{}');
  return allData[timeframe] || [];
};

// Retrieve waste types data
export const getMockWasteTypes = () => {
  return JSON.parse(localStorage.getItem('mockWasteTypes') || '[]');
};

// Add a new waste log and update all related data
export const addMockWasteLog = (wasteLog) => {
  // Get existing logs
  const logs = getMockWasteLogs();
  
  // Create new log entry
  const newLog = {
    ...wasteLog,
    logID: logs.length > 0 ? Math.max(...logs.map(log => parseInt(log.logID || 0))) + 1 : 1,
    created_at: new Date().toISOString()
  };
  
  // Add to logs
  logs.unshift(newLog); // Add to beginning for "most recent"
  localStorage.setItem('mockWasteLogs', JSON.stringify(logs));
  
  // Update metrics
  updateMockMetrics(wasteLog);
  
  // Update waste charts
  updateMockWasteCharts(wasteLog);
  
  // Update waste types
  updateMockWasteTypes(wasteLog);
  
  // Update leaderboard
  updateMockLeaderboard(wasteLog);
  
  return newLog;
};

// Update metrics when a new waste log is added
const updateMockMetrics = (wasteLog) => {
  const metrics = getMockMetrics();
  const weight = parseFloat(wasteLog.weight || 0);
  
  // Update total waste
  const oldTotalWaste = metrics.totalWaste || 0;
  metrics.totalWaste = oldTotalWaste + weight;
  
  // Calculate percentage change
  metrics.wasteChange = oldTotalWaste > 0 ? 
    ((metrics.totalWaste - oldTotalWaste) / oldTotalWaste * 100).toFixed(1) : 0;
  
  // Update most recent log
  metrics.mostRecentLog = {
    date: new Date().toISOString().split('T')[0],
    weight: weight
  };
  
  // Update CO2 (simplified calculation - 2.5kg CO2 per kg waste)
  metrics.co2Emissions = (metrics.co2Emissions || 0) + (weight * 2.5);
  
  localStorage.setItem('mockMetrics', JSON.stringify(metrics));
};

// Update waste charts when a new log is added
const updateMockWasteCharts = (wasteLog) => {
  const charts = JSON.parse(localStorage.getItem('mockWasteChart') || '{}');
  const weight = parseFloat(wasteLog.weight || 0);
  
  // Update day chart
  const hour = new Date().getHours();
  let timeOfDay = 'Morning';
  if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon';
  else if (hour >= 18) timeOfDay = 'Evening';
  
  if (charts.day) {
    charts.day = charts.day.map(entry => {
      if (entry.date === timeOfDay) {
        return { ...entry, waste: entry.waste + weight };
      }
      return entry;
    });
  }
  
  // Update month chart (add to current week)
  const today = new Date();
  const weekOfMonth = Math.ceil(today.getDate() / 7);
  const weekLabel = `Week ${weekOfMonth}`;
  
  if (charts.month) {
    charts.month = charts.month.map(entry => {
      if (entry.date === weekLabel) {
        return { ...entry, waste: entry.waste + weight };
      }
      return entry;
    });
  }
  
  // Update quarter chart (add to current month)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = monthNames[today.getMonth()];
  
  if (charts.quarter) {
    charts.quarter = charts.quarter.map(entry => {
      if (entry.date === currentMonth) {
        return { ...entry, waste: entry.waste + weight };
      }
      return entry;
    });
  }
  
  // Update year chart (add to current quarter)
  const currentQuarter = `Q${Math.floor(today.getMonth() / 3) + 1}`;
  
  if (charts.year) {
    charts.year = charts.year.map(entry => {
      if (entry.date === currentQuarter) {
        return { ...entry, waste: entry.waste + weight };
      }
      return entry;
    });
  }
  
  localStorage.setItem('mockWasteChart', JSON.stringify(charts));
};

// Update waste types when a new log is added
const updateMockWasteTypes = (wasteLog) => {
  const types = getMockWasteTypes();
  const weight = parseFloat(wasteLog.weight || 0);
  const wasteType = wasteLog.wasteType || 'Mixed';
  
  // Find the waste type
  const typeIndex = types.findIndex(t => t.name === wasteType);
  
  if (typeIndex >= 0) {
    // Update existing type
    types[typeIndex].value += weight;
  } else {
    // Add new type
    types.push({ name: wasteType, value: weight });
  }
  
  localStorage.setItem('mockWasteTypes', JSON.stringify(types));
};

// Get estimated employee count for a business
const getEstimatedEmployees = (businessID) => {
  const employeesByCompany = JSON.parse(localStorage.getItem('mockEmployeesByCompany') || '{}');
  return employeesByCompany[businessID] || 5; // Default to 5 employees if unknown
};

// Update leaderboard when a new waste log is added
const updateMockLeaderboard = (wasteLog) => {
  const leaderboard = getMockLeaderboardData();
  const businessID = parseInt(wasteLog.businessID);
  const weight = parseFloat(wasteLog.weight || 0);
  
  // Find the business in the leaderboard
  const businessIndex = leaderboard.findIndex(b => parseInt(b.businessID) === businessID);
  
  if (businessIndex >= 0) {
    // Update the business data
    const business = { ...leaderboard[businessIndex] };
    
    // Update seasonal waste
    business.seasonalWaste += weight;
    business.formattedWaste = business.seasonalWaste.toFixed(1);
    
    // Update waste per employee based on estimated employee count
    const estimatedEmployees = getEstimatedEmployees(businessID);
    business.wastePerEmployee = business.seasonalWaste / estimatedEmployees;
    business.formattedWastePerEmployee = business.wastePerEmployee.toFixed(1);
    
    // Update the business in the leaderboard
    leaderboard[businessIndex] = business;
    
    // Re-sort the leaderboard by waste per employee (lower is better)
    const sortedLeaderboard = [...leaderboard].sort((a, b) => 
      parseFloat(a.wastePerEmployee) - parseFloat(b.wastePerEmployee)
    );
    
    // Update ranks and rank changes
    const updatedLeaderboard = sortedLeaderboard.map((company, index) => {
      const newRank = index + 1;
      return {
        ...company,
        previousRank: company.rank,
        rankChange: company.rank ? company.rank - newRank : 0,
        rank: newRank
      };
    });
    
    localStorage.setItem('mockLeaderboardData', JSON.stringify(updatedLeaderboard));
  }
};

// For intercepting API calls and returning mock data
export const setupFetchInterceptor = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // If URL is a string and contains API endpoints we want to mock
    if (typeof url === 'string') {
      console.log('Intercepting fetch to:', url);
      
      // If this is a supabase call to insert waste data, let it through AND update our mock data
      if (options?.method === 'POST' && url.includes('supabase') && url.includes('Wastelogs')) {
        console.log('Detected waste log insert - will also update mock data');
        // Let the real API call proceed - mock data will be updated separately in the AddWasteForm component
        return originalFetch.apply(window, arguments);
      }
      
      // Leaderboard endpoint
      if (url.includes('/api/employee/leaderboard')) {
        console.log('Returning mock leaderboard data');
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: 'success',
                data: getMockLeaderboardData()
              })
            });
          }, 300); // Small delay to simulate network
        });
      }
      
      // Dashboard metrics endpoint
      if (url.includes('/api/dashboard/metrics')) {
        console.log('Returning mock metrics data');
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: 'success',
                data: getMockMetrics()
              })
            });
          }, 300);
        });
      }
      
      // Waste chart endpoint
      if (url.includes('/api/dashboard/waste-chart')) {
        // Extract timeframe from URL
        const urlObj = new URL(url, window.location.origin);
        const timeframe = urlObj.searchParams.get('timeframe') || 'month';
        
        console.log(`Returning mock waste chart data for timeframe: ${timeframe}`);
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: 'success',
                data: getMockWasteChart(timeframe)
              })
            });
          }, 300);
        });
      }
      
      // Waste types endpoint
      if (url.includes('/api/dashboard/waste-types')) {
        console.log('Returning mock waste types data');
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: 'success',
                data: getMockWasteTypes()
              })
            });
          }, 300);
        });
      }
      
      // Recent entries endpoints
      if (url.includes('/api/employee/history') || url.includes('/api/admin/employee-table')) {
        console.log('Returning mock waste logs data');
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: 'success',
                data: getMockWasteLogs()
              })
            });
          }, 300);
        });
      }
    }
    
    // For any non-mocked endpoints, use the original fetch
    return originalFetch.apply(window, arguments);
  };
  
  // Return a function to restore the original fetch
  return () => {
    window.fetch = originalFetch;
  };
};