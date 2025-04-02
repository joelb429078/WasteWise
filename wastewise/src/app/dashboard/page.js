"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Clock, Calendar, Award, Trash2, Users, Plus, BarChart, TrendingUp, 
  TrendingDown, ArrowUpRight, ArrowDownRight, Layers, RefreshCw, Clipboard,
  ChevronDown, ChevronUp, ArrowLeft, LogOut, Trophy, ArrowUp, ArrowDown,
  AlertTriangle, Database, FileX, BarChart2, PieChart as PieChartIcon, List, 
  FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const router = useRouter();

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const handleBack = () => router.push("/");
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('userEmail');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // State for all our data
  const [metrics, setMetrics] = useState({
    co2Emissions: 0,
    co2Change: 0,
    totalWaste: 0,
    wasteChange: 0,
    mostRecentLog: { date: formatDate(new Date()), weight: 0 },
    mostRecentChange: 0,
    currentRank: 0,
    rankChange: 0
  });
  
  const [timeframe, setTimeframe] = useState('month');
  
  const [wasteData, setWasteData] = useState([]);
  const [wasteTypeData, setWasteTypeData] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [wasteTypesLoading, setWasteTypesLoading] = useState(false);
  
  const [activeButton, setActiveButton] = useState(null);
  const [error, setError] = useState(null);
  
  const [noWasteData, setNoWasteData] = useState(false);
  const [noWasteTypes, setNoWasteTypes] = useState(false);
  const [noLeaderboard, setNoLeaderboard] = useState(false);
  const [noEntries, setNoEntries] = useState(false);
  const [noMetrics, setNoMetrics] = useState(false);

  // Colors from the theme
  const BRAND_COLORS = {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',  // Primary green
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  };

  const ACCENT_COLORS = {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Primary blue
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  };

  // Colors for the pie chart
  const PIE_COLORS = [
    BRAND_COLORS[500], 
    BRAND_COLORS[300], 
    ACCENT_COLORS[500], 
    BRAND_COLORS[700], 
    ACCENT_COLORS[300]
  ];

  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const toggleActionBar = () => setIsActionBarVisible(!isActionBarVisible);
  
  // Get current timestamp for last updated
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  // Simplified authentication function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!token || !userId || !userEmail) {
      console.error("Missing authentication data");
      return null;
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'User-ID': userId,
      'User-Email': userEmail,
      'Content-Type': 'application/json'
    };
  };

  // Check authentication and set current user
  const checkAuth = async () => {
    try {
      // Try to get auth data from localStorage
      const userEmail = localStorage.getItem('userEmail');
      
      if (userEmail) {
        // Get user data from Supabase to set isAdmin and currentUser
        const { data } = await supabase
          .from('Users')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (data) {
          setIsAdmin(data.admin);
          setCurrentUser(data);
          localStorage.setItem('isAdmin', data.admin);
          return true;
        }
      }
      
      // If no localStorage auth or no user data, redirect to login
      setError("Please log in to view this dashboard");
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return false;
    } catch (error) {
      console.error("Auth check error:", error);
      setError("Authentication error. Please try logging in again.");
      return false;
    }
  };

  // Button hover effect
  const handleButtonHover = (buttonId) => setActiveButton(buttonId);
  const handleButtonLeave = () => setActiveButton(null);
  const handleWasteVisit = () => router.push("/wastelogs");
  const handleLeaderBoardVisit = () => router.push("/leaderboard");

  // 1. FETCH METRICS DATA
  const fetchMetrics = async () => {
    setMetricsLoading(true);
    setNoMetrics(false);
    
    const headers = getAuthHeaders();
    if (!headers) {
      setMetricsLoading(false);
      setNoMetrics(true);
      return false;
    }
    
    try {
      console.log('Fetching metrics from:', `${API_BASE_URL}/api/dashboard/metrics`);
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/metrics`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Error response:', await response.text());
        setMetricsLoading(false);
        setNoMetrics(true);
        return false;
      }
      
      const data = await response.json();
      console.log('Real metrics API response:', data);
      
      if (data.status === 'success' && data.data) {
        // Check if we have any non-zero metrics
        const hasData = data.data.totalWaste > 0 || data.data.co2Emissions > 0 || 
                       (data.data.mostRecentLog && data.data.mostRecentLog.weight > 0);
        
        if (!hasData) {
          setNoMetrics(true);
          setMetricsLoading(false);
          return false;
        }
        
        setMetrics({
          co2Emissions: data.data.co2Emissions || 0,
          co2Change: data.data.co2Change || 0,
          totalWaste: data.data.totalWaste || 0,
          wasteChange: data.data.wasteChange || 0,
          mostRecentLog: {
            date: data.data.mostRecentLog?.date 
              ? formatDate(data.data.mostRecentLog.date) 
              : formatDate(new Date()),
            weight: data.data.mostRecentLog?.weight || 0
          },
          mostRecentChange: data.data.mostRecentChange || 0,
          currentRank: data.data.currentRank || 0,
          rankChange: data.data.rankChange || 0
        });
        setMetricsLoading(false);
        return true;
      }
      
      setNoMetrics(true);
      setMetricsLoading(false);
      return false;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setNoMetrics(true);
      setMetricsLoading(false);
      return false;
    }
  };

  // 2. FETCH WASTE CHART DATA
  const fetchWasteChart = async (chartTimeframe = timeframe) => {
    setChartLoading(true);
    setNoWasteData(false);
    
    const headers = getAuthHeaders();
    if (!headers) {
      setChartLoading(false);
      setNoWasteData(true);
      return false;
    }
    
    try {
      console.log('Fetching waste chart from:', `${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${chartTimeframe}`);
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${chartTimeframe}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Error response:', await response.text());
        setChartLoading(false);
        setNoWasteData(true);
        return false;
      }
      
      const data = await response.json();
      console.log('Waste chart API response:', data);
      
      if (data.status === 'success' && data.data && data.data.length > 0) {
        // Check if we have any non-zero data
        const hasData = data.data.some(item => item.waste > 0);
        
        if (!hasData) {
          setNoWasteData(true);
          setWasteData([]);
          setChartLoading(false);
          return false;
        }
        
        setWasteData(data.data);
        setNoWasteData(false);
        setChartLoading(false);
        return true;
      }
      
      setNoWasteData(true);
      setWasteData([]);
      setChartLoading(false);
      return false;
    } catch (error) {
      console.error('Error fetching waste chart data:', error);
      setNoWasteData(true);
      setChartLoading(false);
      return false;
    }
  };

  // 3. FETCH WASTE TYPES DATA
  const fetchWasteTypes = async () => {
    setWasteTypesLoading(true);
    setNoWasteTypes(false);
    
    const headers = getAuthHeaders();
    if (!headers) {
      setWasteTypesLoading(false);
      setNoWasteTypes(true);
      return false;
    }
    
    try {
      console.log('Fetching waste types from:', `${API_BASE_URL}/api/dashboard/waste-types`);
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-types`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Error response:', await response.text());
        setWasteTypesLoading(false);
        setNoWasteTypes(true);
        return false;
      }
      
      const data = await response.json();
      console.log('Waste types API response:', data);
      
      if (data.status === 'success' && data.data && data.data.length > 0) {
        // Check if we have any non-zero data
        const hasData = data.data.some(item => item.value > 0);
        
        if (!hasData) {
          setNoWasteTypes(true);
          setWasteTypeData([]);
          setWasteTypesLoading(false);
          return false;
        }
        
        setWasteTypeData(data.data);
        setNoWasteTypes(false);
        setWasteTypesLoading(false);
        return true;
      }
      
      setNoWasteTypes(true);
      setWasteTypeData([]);
      setWasteTypesLoading(false);
      return false;
    } catch (error) {
      console.error('Error fetching waste types data:', error);
      setNoWasteTypes(true);
      setWasteTypesLoading(false);
      return false;
    }
  };

  // 4. FETCH LEADERBOARD DATA - Using the reliable pattern from the working leaderboard component
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    setNoLeaderboard(false);
    
    const headers = getAuthHeaders();
    if (!headers) {
      setLeaderboardLoading(false);
      setNoLeaderboard(true);
      return false;
    }
    
    try {
      // First, try the public leaderboard endpoint
      console.log('Fetching leaderboard from:', `${API_BASE_URL}/api/public/leaderboard`);
      
      const response = await fetch(`${API_BASE_URL}/api/public/leaderboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Public leaderboard API response:', data);
        
        if (data.status === 'success' && data.data && data.data.companies) {
          const filteredCompanies = data.data.companies.filter(company => {
            const wastePerEmployee = parseFloat(company.wastePerEmployee || 0);
            return wastePerEmployee > 0;
          });
          
          if (filteredCompanies.length === 0) {
            setNoLeaderboard(true);
            setLeaderboardData([]);
            setLeaderboardLoading(false);
            return false;
          }
          
          // Sort by waste per employee (ascending - lower is better)
          const sortedCompanies = [...filteredCompanies].sort((a, b) => {
            const wasteA = parseFloat(a.wastePerEmployee || 0);
            const wasteB = parseFloat(b.wastePerEmployee || 0);
            return wasteA - wasteB;
          });
          
          // Take top 5 companies
          const top5Companies = sortedCompanies.slice(0, 5);
          
          // Process for display
          const processedData = top5Companies.map((company, index) => ({
            id: company.businessID || `company-${index}`,
            businessID: company.businessID,
            companyName: company.companyName || 'Unknown Company',
            position: index + 1,
            wastePerEmployee: parseFloat(company.wastePerEmployee).toFixed(2),
            change: company.rankChange || 0
          }));
          
          setLeaderboardData(processedData);
          setNoLeaderboard(false);
          setLeaderboardLoading(false);
          return true;
        }
      }
      
      // Fallback to employee leaderboard endpoint
      console.log('Fallback to employee leaderboard from:', `${API_BASE_URL}/api/employee/leaderboard?timeframe=season`);
      
      const empResponse = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=season`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!empResponse.ok) {
        console.error('Error response:', await empResponse.text());
        setLeaderboardLoading(false);
        setNoLeaderboard(true);
        return false;
      }
      
      const empData = await empResponse.json();
      console.log('Employee leaderboard API response:', empData);
      
      if (empData.status === 'success' && empData.data) {
        // Process the data - companies with lower waste per employee are ranked higher
        const processedData = empData.data
          .filter(entry => {
            const wastePerEmployee = parseFloat(entry.wastePerEmployee || entry.formattedWastePerEmployee || 0);
            return wastePerEmployee > 0;
          })
          .sort((a, b) => {
            const wastePerEmployeeA = parseFloat(a.wastePerEmployee || a.formattedWastePerEmployee || 1000);
            const wastePerEmployeeB = parseFloat(b.wastePerEmployee || b.formattedWastePerEmployee || 1000);
            return wastePerEmployeeA - wastePerEmployeeB; // Lower waste is better
          })
          .slice(0, 5) // Just take top 5
          .map((entry, index) => {
            // Extract rank change (if available)
            const previousRank = entry.previousRank || (index + 2); // Fallback if not available
            const currentRank = index + 1; // Since we're sorting ourselves
            const rankChange = previousRank - currentRank;
            
            return {
              id: entry.businessID || index + 1,
              businessID: entry.businessID,
              companyName: entry.companyName || entry.username || `Company ${index + 1}`,
              position: currentRank,
              wastePerEmployee: parseFloat(entry.formattedWastePerEmployee || entry.wastePerEmployee || 0).toFixed(2),
              change: rankChange,
              wasteType: entry.wasteType || "Mixed"
            };
          });
        
        if (processedData.length === 0) {
          setNoLeaderboard(true);
          setLeaderboardData([]);
          setLeaderboardLoading(false);
          return false;
        }
        
        // Update data if we successfully processed it
        setLeaderboardData(processedData);
        setNoLeaderboard(false);
        setLeaderboardLoading(false);
        return true;
      }
      
      setNoLeaderboard(true);
      setLeaderboardData([]);
      setLeaderboardLoading(false);
      return false;
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setNoLeaderboard(true);
      setLeaderboardLoading(false);
      return false;
    }
  };

  // 5. FETCH RECENT ENTRIES DATA - Fixed to handle both admin and regular user endpoints
  const fetchRecentEntries = async () => {
    setEntriesLoading(true);
    setNoEntries(false);
    
    const headers = getAuthHeaders();
    if (!headers) {
      setEntriesLoading(false);
      setNoEntries(true);
      return false;
    }
    
    try {
      // If admin, use employee table endpoint, otherwise use history
      const is_admin = localStorage.getItem('isAdmin') === 'true';
      
      // First try admin endpoint if admin or history endpoint if not
      const endpoint = is_admin ? 
        `${API_BASE_URL}/api/admin/employee-table` : 
        `${API_BASE_URL}/api/employee/history`;
      
      console.log('Fetching recent entries from:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      let data;
      if (response.ok) {
        data = await response.json();
        console.log('Recent entries API response:', data);
      } else {
        console.error('Error with first endpoint, trying alternative...');
        
        // Try the other endpoint as a fallback
        const fallbackEndpoint = is_admin ?
          `${API_BASE_URL}/api/employee/history` :
          `${API_BASE_URL}/api/admin/employee-table`;
          
        console.log('Trying fallback endpoint:', fallbackEndpoint);
        
        const fallbackResponse = await fetch(fallbackEndpoint, {
          method: 'GET',
          headers,
          credentials: 'include'
        });
        
        if (!fallbackResponse.ok) {
          console.error('Error response from fallback:', await fallbackResponse.text());
          setEntriesLoading(false);
          setNoEntries(true);
          return false;
        }
        
        data = await fallbackResponse.json();
        console.log('Fallback recent entries API response:', data);
      }
      
      if (data && data.status === 'success' && data.data && data.data.length > 0) {
        // Format recent entries with guaranteed unique keys
        const entries = data.data.map((entry, index) => ({
          id: `entry-${entry.logID || ''}-${index}`,
          logID: entry.logID,
          username: entry.username || 'Unknown User',
          wasteType: entry.wasteType || 'Mixed',
          weight: parseFloat(entry.weight || 0).toFixed(1),
          date: formatDate(entry.created_at || new Date()),
          created_at: entry.created_at // Keep original date for sorting
        }));
        
        // Sort by date (newest first) and limit to 10
        const sortedEntries = entries
          .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
            return dateB - dateA; // Sort descending (newest first)
          })
          .slice(0, 10);
        
        if (sortedEntries.length === 0) {
          setNoEntries(true);
          setRecentEntries([]);
          setEntriesLoading(false);
          return false;
        }
        
        setRecentEntries(sortedEntries);
        setNoEntries(false);
        setEntriesLoading(false);
        return true;
      }
      
      setNoEntries(true);
      setRecentEntries([]);
      setEntriesLoading(false);
      return false;
    } catch (error) {
      console.error('Error fetching recent entries:', error);
      setNoEntries(true);
      setEntriesLoading(false);
      return false;
    }
  };

  // MAIN FUNCTION TO FETCH ALL DASHBOARD DATA
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      // Fetch all data components in parallel
      const results = await Promise.allSettled([
        fetchMetrics(),
        fetchWasteChart(),
        fetchWasteTypes(),
        fetchLeaderboard(),
        fetchRecentEntries()
      ]);
      
      console.log('Dashboard data fetch results:', results);
      
      // Update last updated time
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };
  
  // HANDLE TIMEFRAME CHANGE FOR WASTE CHART
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    fetchWasteChart(newTimeframe);
  };

  // Function to render trend icon
  const renderTrendIcon = (value, positive = false) => {
    if (positive) {
      return value > 0 ? (
        <div className="flex items-center">
          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-green-500">+{Math.abs(value)}%</span>
        </div>
      ) : value < 0 ? (
        <div className="flex items-center">
          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-500">-{Math.abs(value)}%</span>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="text-gray-500">No change</span>
        </div>
      );
    } else {
      return value < 0 ? (
        <div className="flex items-center">
          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-green-500">{Math.abs(value)}%</span>
        </div>
      ) : value > 0 ? (
        <div className="flex items-center">
          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-500">+{Math.abs(value)}%</span>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="text-gray-500">No change</span>
        </div>
      );
    }
  };

  // Function to render rank change icon
  const renderRankChangeIcon = (value) => {
    // Convert percentage change to position change (rough estimate)
    let positionChange = 0;
    if (value > 0) {
      // Positive percentage means improvement
      if (value < 10) positionChange = 1;
      else if (value < 25) positionChange = 2;
      else if (value < 50) positionChange = 3;
      else positionChange = 4; // Large improvements
    } else if (value < 0) {
      // Negative percentage means decline
      if (value > -10) positionChange = -1;
      else if (value > -25) positionChange = -2;
      else if (value > -50) positionChange = -3;
      else positionChange = -4; // Large declines
    }
  
    if (positionChange > 0) {
      return (
        <div className="flex items-center">
          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-green-500">+{positionChange} positions</span>
        </div>
      );
    } else if (positionChange < 0) {
      return (
        <div className="flex items-center">
          <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-500">{positionChange} positions</span>
        </div>
      );
    } else {
      // No change - use blue color as requested
      return (
        <div className="flex items-center">
          <RefreshCw className="h-4 w-4 text-blue-500 mr-1" />
          <span className="text-blue-500">No change</span>
        </div>
      );
    }
  };
  
  // Empty state component with custom icon and message
  const EmptyState = ({ icon: Icon, message, submessage }) => (
    <div className="flex flex-col items-center justify-center p-6 h-full">
      <div className="bg-gray-100 p-4 rounded-full mb-3">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <p className="text-gray-700 font-medium text-center">{message}</p>
      {submessage && <p className="text-gray-500 text-sm text-center mt-1">{submessage}</p>}
    </div>
  );

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-green-500 animate-spin mb-4" />
          <div className="text-lg text-gray-700">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <div className="text-lg text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              fetchDashboardData();
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-gray-50 min-h-screen">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBack}
            className="bg-gray-200 text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-300 transition-colors flex items-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="bg-red-100 text-red-600 p-3 rounded-full shadow-lg hover:bg-red-200 transition-colors flex items-center"
            aria-label="Logout"
          >
            <span className="font-medium mr-2">Logout</span>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        {/* Animated Action Bar with Pull Tab - same as in Dashboard */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${isActionBarVisible ? 'translate-y-0' : 'translate-y-24'}`}>
        {/* Pull Tab */}
        <div 
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 glass-effect rounded-t-lg px-4 py-2 cursor-pointer flex items-center gap-2 shadow-md z-50 transition-all duration-300 hover:bg-gray-100"
          onClick={toggleActionBar}
        >
          <div className="h-1 w-8 bg-gray-400 rounded-full"></div>
          {isActionBarVisible ? (
            <span className="text-xs text-gray-500 flex items-center">
              Hide <ChevronDown className="h-3 w-3 ml-1" />
            </span>
          ) : (
            <span className="text-xs text-gray-500 flex items-center">
              Show <ChevronUp className="h-3 w-3 ml-1" />
            </span>
          )}
        </div>
        
        {/* Action Bar Background */}
        <div className="bg-gray-50/50 backdrop-blur-sm border-t border-gray-200 h-24 w-full"></div>
        
        {/* Glassmorphic Quick Action Bar */}
        <div className="absolute top-6 left-0 right-0 flex justify-center z-50 px-4">
          <div className="glass-effect rounded-full px-4 py-3 flex items-center gap-3 md:gap-5 mx-auto shadow-xl">
            <a 
              href="/add-waste" 
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
              title="Add Waste Entry"
            >
              <Plus className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden md:inline ml-2">Add Waste</span>
            </a>
            
            <a 
              href="/leaderboard" 
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
              title="Leaderboard"
            >
              <Clipboard className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden md:inline ml-2">Leaderboard</span>
            </a>

            <a 
                href="/wastelogs" 
                className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
                title="Employee Table"
            >
                <Trash2 className="h-5 w-5 md:h-6 md:w-6" />
                <span className="hidden md:inline ml-2">Waste Log</span>
            </a>
            
            <a 
              href="/employeemanagement" 
              className="bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
              title="Dashboard"
            >
              <Users className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden md:inline ml-2">Employees</span>
            </a>
          </div>
        </div>
      </div>

      {/* Add padding to the bottom of your content to avoid overlap with the action bar */}
      <div className={`transition-all duration-500 ease-in-out ${isActionBarVisible ? 'pb-24' : 'pb-0'}`}></div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Main Dashboard <span className="text-brand-500">(Metrics)</span></h1>
        <div className="flex items-center gap-2">
          <RefreshCw 
            className="h-5 w-5 text-gray-500 cursor-pointer hover:text-brand-500 transition-colors" 
            onClick={() => { 
              setLoading(true);
              fetchDashboardData();
            }}
          />
          <span className="text-sm text-gray-500">Last updated: Today at {lastUpdated}</span>
        </div>
      </div>
      
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* CO2 Emissions Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600 transform hover:scale-105 transition-transform duration-300 h-36">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
            </div>
          ) : noMetrics || metrics.co2Emissions <= 0 ? (
            <EmptyState 
              icon={Trash2} 
              message="No CO2 Data" 
              submessage="Add waste logs to see emissions data" 
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">CO2 Emissions</h3>
                <span className="p-2 bg-green-50 rounded-full">
                  <Trash2 className="h-5 w-5 text-green-600" />
                </span>
              </div>
              <p className="text-2xl font-bold mb-2">{metrics.co2Emissions} kg</p>
              {metrics.co2Change > 0 ? (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">+{Math.abs(metrics.co2Change)}%</span>
                </div>
              ) : metrics.co2Change < 0 ? (
                <div className="flex items-center">
                  <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">{Math.abs(metrics.co2Change)}%</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-blue-500">No change</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Total Waste Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 transform hover:scale-105 transition-transform duration-300 h-36">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : noMetrics || metrics.totalWaste <= 0 ? (
            <EmptyState 
              icon={Database} 
              message="No Waste Data" 
              submessage="Add waste logs to see totals" 
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Total Waste</h3>
                <span className="p-2 bg-blue-50 rounded-full">
                  <Trash2 className="h-5 w-5 text-blue-600" />
                </span>
              </div>
              <p className="text-2xl font-bold mb-2">{metrics.totalWaste} kg</p>
              {renderTrendIcon(metrics.wasteChange, true)}
            </>
          )}
        </div>
        
        {/* Most Recent Log Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform duration-300 h-36">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : noMetrics || metrics.mostRecentLog.weight <= 0 ? (
            <EmptyState 
              icon={FileX} 
              message="No Recent Logs" 
              submessage="Add waste logs to see recent activity" 
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Most Recent Log</h3>
                <span className="p-2 bg-purple-50 rounded-full">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </span>
              </div>
              <p className="text-2xl font-bold mb-1">{metrics.mostRecentLog.weight} kg</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">on {metrics.mostRecentLog.date}</p>
                {renderTrendIcon(metrics.mostRecentChange, true)}
              </div>
            </>
          )}
        </div>
        
        {/* Current Rank Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 transform hover:scale-105 transition-transform duration-300 h-36">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin" />
            </div>
          ) : noMetrics || metrics.currentRank <= 0 ? (
            <EmptyState 
              icon={Trophy} 
              message="Ranking Unavailable" 
              submessage="Not enough data to establish ranking" 
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Current Rank</h3>
                <span className="p-2 bg-yellow-50 rounded-full">
                  <Award className="h-5 w-5 text-yellow-600" />
                </span>
              </div>
              <p className="text-2xl font-bold mb-2">#{metrics.currentRank || '-'}</p>
              {renderRankChangeIcon(metrics.rankChange)}
            </>
          )}
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300 min-h-64">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Waste Over Time</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => handleTimeframeChange('day')}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 transform ${timeframe === 'day' 
                  ? 'bg-brand-500 text-white font-medium scale-105' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'}`}
              >
                Day
              </button>
              <button 
                onClick={() => handleTimeframeChange('month')}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 transform ${timeframe === 'month' 
                  ? 'bg-brand-500 text-white font-medium scale-105' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'}`}
              >
                Month
              </button>
              <button 
                onClick={() => handleTimeframeChange('quarter')}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 transform ${timeframe === 'quarter' 
                  ? 'bg-brand-500 text-white font-medium scale-105' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'}`}
              >
                Quarter
              </button>
              <button 
                onClick={() => handleTimeframeChange('year')}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 transform ${timeframe === 'year' 
                  ? 'bg-brand-500 text-white font-medium scale-105' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'}`}
              >
                Year
              </button>
            </div>
          </div>
          <div className="h-64">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
              </div>
            ) : noWasteData || wasteData.length === 0 ? (
              <EmptyState 
                icon={BarChart2} 
                message="No Waste Data Available" 
                submessage="Add waste logs to see trends over time" 
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wasteData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fill: '#6B7280' }} />
                  <YAxis tick={{ fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="waste" 
                    name="Waste (kg)" 
                    stroke={BRAND_COLORS[500]} 
                    strokeWidth={3} 
                    dot={{ r: 6, fill: BRAND_COLORS[500], strokeWidth: 2 }} 
                    activeDot={{ r: 8, fill: BRAND_COLORS[700], stroke: BRAND_COLORS[50], strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300 min-h-64">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">Waste by Type</h3>
          <div className="h-64">
            {wasteTypesLoading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
              </div>
            ) : noWasteTypes || wasteTypeData.length === 0 ? (
              <EmptyState 
                icon={PieChartIcon} 
                message="No Waste Type Data" 
                submessage="Add waste logs to see distribution by type" 
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wasteTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    innerRadius={30}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {wasteTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300 min-h-96">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-green-600" />
              Waste Reduction Leaderboard
            </h3>
            <button onClick={handleLeaderBoardVisit} className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-sm font-medium hover:bg-brand-100 transition-all duration-200 flex items-center gap-1 transform hover:translate-x-1">
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4 transform rotate-45" />
            </button>
          </div>
          <div className="overflow-x-hidden overflow-y-auto max-h-80">
            {leaderboardLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin mb-4" />
                <p className="text-gray-500">Loading leaderboard data...</p>
              </div>
            ) : noLeaderboard || leaderboardData.length === 0 ? (
              <EmptyState 
                icon={Trophy} 
                message="No Leaderboard Data Available" 
                submessage="Add waste logs to see company rankings" 
              />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-green-600">
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Waste/Employee</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {leaderboardData.map((company, index) => (
                    <tr 
                      key={company.id || index} 
                      className={`${index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} 
                        ${currentUser && company.businessID === currentUser.businessID ? 'bg-green-100 hover:bg-green-200' : ''}`} 
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {company.position <= 3 ? (
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 
                              ${company.position === 1 ? 'bg-yellow-100 text-yellow-600' : 
                                company.position === 2 ? 'bg-gray-100 text-gray-600' : 
                                  'bg-orange-100 text-orange-600'}`}>
                              {company.position}
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full flex items-center justify-center mr-2 bg-brand-100 text-brand-600">
                              {company.position}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {currentUser && company.businessID === currentUser.businessID ? (
                          <div className="flex items-center">
                            <span>{company.companyName}</span>
                            <span className="ml-2 px-2 py-0.5 text-xs leading-tight font-semibold rounded-full bg-green-100 text-green-800">
                              You
                            </span>
                          </div>
                        ) : (
                          company.companyName
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">{company.wastePerEmployee} kg</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300 min-h-96">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Recent Entries</h3>
            <button onClick={handleWasteVisit} className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-sm font-medium hover:bg-brand-100 transition-all duration-200 flex items-center gap-1 transform hover:translate-x-1">
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4 transform rotate-45" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
            {entriesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin mb-4" />
                <p className="text-gray-500">Loading recent entries...</p>
              </div>
            ) : noEntries || recentEntries.length === 0 ? (
              <EmptyState 
                icon={List} 
                message="No Recent Entries" 
                submessage="Add waste logs to see recent activity" 
              />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-green-600">
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {recentEntries.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} 
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{entry.date}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{entry.username}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${entry.wasteType === 'Paper' ? 'bg-blue-100 text-blue-800' : 
                            entry.wasteType === 'Plastic' ? 'bg-red-100 text-red-800' : 
                            entry.wasteType === 'Food' ? 'bg-green-100 text-green-800' : 
                            entry.wasteType === 'Glass' ? 'bg-purple-100 text-purple-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {entry.wasteType}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{entry.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;