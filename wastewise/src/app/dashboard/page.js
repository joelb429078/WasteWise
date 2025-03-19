"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Clock, Calendar, Award, Trash2, Users, Plus, BarChart, TrendingUp, 
  TrendingDown, ArrowUpRight, ArrowDownRight, Layers, RefreshCw, Clipboard,
  ChevronDown, ChevronUp, ArrowLeft, LogOut, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  getMockMetrics, 
  getMockWasteChart, 
  getMockWasteTypes, 
  getMockLeaderboardData, 
  getMockWasteLogs 
} from '../../components/data/mockData';


const Dashboard = () => {
  const router = useRouter();

  // Format date for display - moved before useState usage
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleBack = () => {
    router.push("/");
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear local storage items
      localStorage.removeItem('userEmail');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
      // Redirect to login
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
  const [wasteData, setWasteData] = useState([
    { date: 'Week 1', waste: 0 },
    { date: 'Week 2', waste: 0 },
    { date: 'Week 3', waste: 0 },
    { date: 'Week 4', waste: 0 }
  ]);
  const [wasteTypeData, setWasteTypeData] = useState([
    { name: 'Paper', value: 0 },
    { name: 'Plastic', value: 0 },
    { name: 'Food', value: 0 }
  ]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Added currentUser state
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false); // New state for chart-specific loading
  const [activeButton, setActiveButton] = useState(null);
  const [error, setError] = useState(null);

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

  const toggleActionBar = () => {
    setIsActionBarVisible(!isActionBarVisible);
  };

  // Authentication check function
  const checkAuth = async () => {
    try {
      // Try to get the email first from local storage, then from Supabase
      let userEmail = localStorage.getItem('userEmail');
      let token = localStorage.getItem('authToken');
      let userId = localStorage.getItem('userId');
      
      if (!userEmail || !token || !userId) {
        // Try to get from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          token = session.access_token;
          userId = session.user.id;
          userEmail = session.user.email;
          
          // Store values
          localStorage.setItem('authToken', token);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userEmail', userEmail);
          
          // Check if user is admin (if you have a way to determine this)
          const { data } = await supabase
            .from('Users')
            .select('*') // Select all columns to get the full user data
            .eq('email', userEmail)
            .single();
          
          if (data) {
            localStorage.setItem('isAdmin', data.admin);
            setIsAdmin(data.admin);
            setCurrentUser(data); // Store current user data
          }
        } else {
          // No valid session found
          setError("Please log in to view this dashboard");
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return null;
        }
      } else {
        // Session values exist in localStorage, fetch user data
        const { data } = await supabase
          .from('Users')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (data) {
          setIsAdmin(data.admin);
          setCurrentUser(data); // Store current user data
        }
      }
      
      console.log(`Auth check successful: ${userId}, ${userEmail}`);
      return { token, userId, userEmail };
    } catch (error) {
      console.error("Auth check error:", error);
      setError("Authentication error. Please try logging in again.");
      return null;
    }
  };

  // Button hover effect
  const handleButtonHover = (buttonId) => {
    setActiveButton(buttonId);
  };

  const handleButtonLeave = () => {
    setActiveButton(null);
  };

  const handleWasteVisit = () => {
    router.push("/wastelogs");
  }

  const handleLeaderBoardVisit = () => {
    router.push("/leaderboard");
  }

  // Get current timestamp for last updated
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  // Then update the fetchDashboardData function:
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check auth to make sure we have user data
      const authData = await checkAuth();
      if (!authData) {
        setLoading(false);
        return;
      }
      
      // Get metrics from mock data
      const metricsData = getMockMetrics();
      setMetrics({
        co2Emissions: metricsData.co2Emissions || 0,
        co2Change: metricsData.co2Change || 0,
        totalWaste: metricsData.totalWaste || 0,
        wasteChange: metricsData.wasteChange || 0,
        mostRecentLog: {
          date: metricsData.mostRecentLog?.date 
            ? formatDate(metricsData.mostRecentLog.date) 
            : formatDate(new Date()),
          weight: metricsData.mostRecentLog?.weight || 0
        },
        mostRecentChange: metricsData.mostRecentChange || 0,
        currentRank: metricsData.currentRank || 0,
        rankChange: metricsData.rankChange || 0
      });
      
      // Get waste chart data
      const chartData = getMockWasteChart(timeframe);
      setWasteData(chartData);
      
      // Get waste types data
      const typesData = getMockWasteTypes();
      setWasteTypeData(typesData);
      
      // Get leaderboard data
      const leaderboardData = getMockLeaderboardData();
      setLeaderboardData(leaderboardData.slice(0, 5)); // Top 5 for dashboard
      
      // Get recent entries
      const entries = getMockWasteLogs();
      const formattedEntries = entries
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map((entry, index) => ({
          id: `entry-${entry.logID || ''}-${index}`,
          logID: entry.logID,
          username: entry.username || 'Unknown User',
          wasteType: entry.wasteType || 'Mixed',
          weight: parseFloat(entry.weight || 0).toFixed(1),
          date: formatDate(entry.created_at || new Date()),
          created_at: entry.created_at
        }));
      
      setRecentEntries(formattedEntries);
      
      // Update last updated time
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  // Also update the fetchWasteChartDataOnly function:
  const fetchWasteChartDataOnly = async (newTimeframe) => {
    try {
      setChartLoading(true);
      const chartData = getMockWasteChart(newTimeframe);
      setWasteData(chartData);
      setChartLoading(false);
    } catch (error) {
      console.error('Error fetching waste chart data:', error);
      setChartLoading(false);
    }
  };

  // Function to fetch all dashboard data
  const fetchDashboardDataold= async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const authData = await checkAuth();
      if (!authData) {
        setLoading(false);
        return;
      }
      
      const { token, userId, userEmail } = authData;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'User-ID': userId,
        'User-Email': userEmail,
        'Content-Type': 'application/json'
      };
      
      // Fetch metrics data from dedicated endpoint
      const fetchMetrics = async () => {
        try {
          console.log('Fetching metrics from:', `${API_BASE_URL}/api/dashboard/metrics`);
          console.log('With auth headers:', { userId, userEmail });
          
          const response = await fetch(`${API_BASE_URL}/api/dashboard/metrics`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`Failed to fetch metrics: ${response.status} ${text}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.data) {
            // Handle successful response
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
            
            console.log('Metrics data loaded successfully:', data.data);
          } else {
            console.log('No metrics data available or unexpected format');
          }
        } catch (error) {
          console.error('Error fetching metrics:', error);
          // Don't set error state here, just log it
        }
      };

      // Fetch waste chart data with timeframe parameter
      const fetchWasteChartData = async () => {
        try {
          console.log('Fetching waste chart from:', `${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${timeframe}`);
          const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${timeframe}`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`Failed to fetch waste chart data: ${response.status} ${text}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success') {
            if (!data.data || data.data.length === 0) {
              console.log('No waste chart data available');
              // Set default data for empty response
              setWasteData([
                { date: 'Week 1', waste: 0 },
                { date: 'Week 2', waste: 0 },
                { date: 'Week 3', waste: 0 },
                { date: 'Week 4', waste: 0 }
              ]);
            } else {
              setWasteData(data.data);
            }
          }
        } catch (error) {
          console.error('Error in waste chart:', error);
          // Set fallback data instead of error
          setWasteData([
            { date: 'Week 1', waste: 0 },
            { date: 'Week 2', waste: 0 },
            { date: 'Week 3', waste: 0 },
            { date: 'Week 4', waste: 0 }
          ]);
        }
      };
      
      // Fetch waste types data for pie chart
      const fetchWasteTypesData = async () => {
        try {
          console.log('Fetching waste types from:', `${API_BASE_URL}/api/dashboard/waste-types`);
          const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-types`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`Failed to fetch waste types data: ${response.status} ${text}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success') {
            if (!data.data || data.data.length === 0) {
              console.log('No waste types data available');
              // Set default data for empty response
              setWasteTypeData([
                { name: 'Paper', value: 0 },
                { name: 'Plastic', value: 0 },
                { name: 'Food', value: 0 }
              ]);
            } else {
              setWasteTypeData(data.data);
            }
          }
        } catch (error) {
          console.error('Error in waste types:', error);
          // Set fallback data instead of error
          setWasteTypeData([
            { name: 'Paper', value: 0 },
            { name: 'Plastic', value: 0 },
            { name: 'Food', value: 0 }
          ]);
        }
      };
      
      // Fetch leaderboard data
      const fetchLeaderboardData = async () => {
        try {
          console.log('Fetching leaderboard from:', `${API_BASE_URL}/api/employee/leaderboard`);
          
          const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=season`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`Failed to fetch leaderboard data: ${response.status} ${text}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.data) {
            // Process companies with proper waste per employee sorting (lower is better)
            const processedCompanies = data.data
              .sort((a, b) => {
                // Sort by waste per employee (lower is better)
                const wastePerEmployeeA = parseFloat(a.wastePerEmployee || a.formattedWastePerEmployee || 1000);
                const wastePerEmployeeB = parseFloat(b.wastePerEmployee || b.formattedWastePerEmployee || 1000);
                return wastePerEmployeeA - wastePerEmployeeB;
              })
              .map((entry, index) => {
                // Get rank change value and determine the appropriate icon and class
                const rankChange = entry.rankChange || 0;
                let rankChangeIcon = null;
                let rankChangeClass = '';

                if (rankChange > 0) {
                  rankChangeIcon = <ArrowUp className="h-4 w-4 mr-1" />;
                  rankChangeClass = 'text-green-500';
                } else if (rankChange < 0) {
                  rankChangeIcon = <ArrowDown className="h-4 w-4 mr-1" />;
                  rankChangeClass = 'text-red-500';
                } else {
                  rankChangeIcon = <RefreshCw className="h-4 w-4 mr-1" />;
                  rankChangeClass = 'text-blue-500';
                }

                // Ensure we have all necessary fields with appropriate fallbacks
                return {
                  id: `leaderboard-${entry.businessID}-${index}`,
                  businessID: entry.businessID,
                  companyName: entry.companyName || entry.username || `Company ${index + 1}`,
                  rank: index + 1, // Rank based on our sort (1-based)
                  wastePerEmployee: parseFloat(entry.wastePerEmployee || 0),
                  formattedWastePerEmployee: entry.formattedWastePerEmployee || 
                                           (entry.wastePerEmployee ? parseFloat(entry.wastePerEmployee).toFixed(1) : "0.0"),
                  rankChange: rankChange,
                  rankChangeIcon: rankChangeIcon,
                  rankChangeClass: rankChangeClass,
                  seasonalWaste: entry.seasonalWaste || 0,
                  username: entry.username || entry.companyName || `Company ${index + 1}`
                };
              });
            
            setLeaderboardData(processedCompanies.slice(0, 10)); // Top 10 only
            console.log('Processed leaderboard data:', processedCompanies.slice(0, 5));
          } else {
            console.log('No leaderboard data available');
            // Fallback data if no data is returned
            setLeaderboardData([
              { id: 1, businessID: 24, companyName: "EcoCare Consulting", rank: 1, formattedWastePerEmployee: "1.8", rankChange: 2, rankChangeIcon: <ArrowUp className="h-4 w-4 mr-1" />, rankChangeClass: "text-green-500" },
              { id: 2, businessID: 21, companyName: "EcoTech Solutions", rank: 2, formattedWastePerEmployee: "3.2", rankChange: -1, rankChangeIcon: <ArrowDown className="h-4 w-4 mr-1" />, rankChangeClass: "text-red-500" },
              { id: 3, businessID: 25, companyName: "Urban Recyclers Ltd", rank: 3, formattedWastePerEmployee: "4.1", rankChange: 1, rankChangeIcon: <ArrowUp className="h-4 w-4 mr-1" />, rankChangeClass: "text-green-500" },
              { id: 4, businessID: 23, companyName: "Sustainable Foods Inc", rank: 4, formattedWastePerEmployee: "4.8", rankChange: -2, rankChangeIcon: <ArrowDown className="h-4 w-4 mr-1" />, rankChangeClass: "text-red-500" },
              { id: 5, businessID: 22, companyName: "Green Planet Logistics", rank: 5, formattedWastePerEmployee: "5.3", rankChange: 0, rankChangeIcon: <RefreshCw className="h-4 w-4 mr-1" />, rankChangeClass: "text-blue-500" }
            ]);
          }
        } catch (error) {
          console.error('Error in leaderboard:', error);
          // Fallback data in case of error
          setLeaderboardData([
            { id: 1, businessID: 24, companyName: "EcoCare Consulting", rank: 1, formattedWastePerEmployee: "1.8", rankChange: 2, rankChangeIcon: <ArrowUp className="h-4 w-4 mr-1" />, rankChangeClass: "text-green-500" },
            { id: 2, businessID: 21, companyName: "EcoTech Solutions", rank: 2, formattedWastePerEmployee: "3.2", rankChange: -1, rankChangeIcon: <ArrowDown className="h-4 w-4 mr-1" />, rankChangeClass: "text-red-500" },
            { id: 3, businessID: 25, companyName: "Urban Recyclers Ltd", rank: 3, formattedWastePerEmployee: "4.1", rankChange: 1, rankChangeIcon: <ArrowUp className="h-4 w-4 mr-1" />, rankChangeClass: "text-green-500" },
            { id: 4, businessID: 23, companyName: "Sustainable Foods Inc", rank: 4, formattedWastePerEmployee: "4.8", rankChange: -2, rankChangeIcon: <ArrowDown className="h-4 w-4 mr-1" />, rankChangeClass: "text-red-500" },
            { id: 5, businessID: 22, companyName: "Green Planet Logistics", rank: 5, formattedWastePerEmployee: "5.3", rankChange: 0, rankChangeIcon: <RefreshCw className="h-4 w-4 mr-1" />, rankChangeClass: "text-blue-500" }
          ]);
        }
      };
      
      // Fetch recent entries
      const fetchRecentEntries = async () => {
        try {
          // If admin, use employee table endpoint, otherwise use history
          const isAdmin = localStorage.getItem('isAdmin') === 'true';
          const endpoint = isAdmin ? 
            `${API_BASE_URL}/api/admin/employee-table` : 
            `${API_BASE_URL}/api/employee/history`;
          
          console.log('Fetching recent entries from:', endpoint);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`Failed to fetch recent entries: ${response.status} ${text}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.data) {
            // Format recent entries with guaranteed unique keys
            const entries = data.data.map((entry, index) => ({
              id: `entry-${entry.logID || ''}-${index}`, // Create a guaranteed unique ID
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
                // Convert to Date objects for comparison, fallback to 0 if invalid
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA; // Sort descending (newest first)
              })
              .slice(0, 10);
            
            setRecentEntries(sortedEntries);
            console.log('Processed recent entries:', sortedEntries);
          } else {
            console.log('No recent entries available');
            setRecentEntries([]);
          }
        } catch (error) {
          console.error('Error in recent entries:', error);
          // Keep recent entries empty instead of showing error
          setRecentEntries([]);
        }
      };
      
      // Run all fetch functions - even if some fail, others will continue
      try {
        await fetchMetrics();
      } catch (e) {
        console.error('Metrics fetch failed:', e);
      }
      
      try {
        await fetchWasteChartData();
      } catch (e) {
        console.error('Waste chart fetch failed:', e);
      }
      
      try {
        await fetchWasteTypesData();
      } catch (e) {
        console.error('Waste types fetch failed:', e);
      }
      
      try {
        await fetchLeaderboardData();
      } catch (e) {
        console.error('Leaderboard fetch failed:', e);
      }
      
      try {
        await fetchRecentEntries();
      } catch (e) {
        console.error('Recent entries fetch failed:', e);
      }
      
      // Update last updated time
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };
  
  // NEW FUNCTION: Fetch only waste chart data when timeframe changes
  const fetchWasteChartDataOnlyOLD = async (newTimeframe) => {
    try {
      setChartLoading(true);
      
      // Get auth data without refreshing everything
      const authData = await checkAuth();
      if (!authData) {
        setChartLoading(false);
        return;
      }
      
      const { token, userId, userEmail } = authData;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'User-ID': userId,
        'User-Email': userEmail,
        'Content-Type': 'application/json'
      };
      
      console.log('Fetching waste chart from:', `${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${newTimeframe}`);
      const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${newTimeframe}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        throw new Error(`Failed to fetch waste chart data: ${response.status} ${text}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        if (!data.data || data.data.length === 0) {
          console.log('No waste chart data available');
          // Set default data for empty response
          setWasteData([
            { date: 'Week 1', waste: 0 },
            { date: 'Week 2', waste: 0 },
            { date: 'Week 3', waste: 0 },
            { date: 'Week 4', waste: 0 }
          ]);
        } else {
          setWasteData(data.data);
        }
      }
      setChartLoading(false);
    } catch (error) {
      console.error('Error in waste chart:', error);
      // Set fallback data instead of error
      setWasteData([
        { date: 'Week 1', waste: 0 },
        { date: 'Week 2', waste: 0 },
        { date: 'Week 3', waste: 0 },
        { date: 'Week 4', waste: 0 }
      ]);
      setChartLoading(false);
    }
  };

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

  // Improved error handling function
  const handleApiError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    
    // More detailed error logging
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    fetchWasteChartDataOnly(newTimeframe);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-green-500 animate-spin mb-4" />
          <div className="text-lg text-gray-700">Loading  employee management data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
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
              // Refresh all data
              fetchDashboardData();
            }}
          />
          <span className="text-sm text-gray-500">Last updated: Today at {lastUpdated}</span>
        </div>
      </div>
      
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600 transform hover:scale-105 transition-transform duration-300">
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
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Waste</h3>
            <span className="p-2 bg-blue-50 rounded-full">
              <Trash2 className="h-5 w-5 text-blue-600" />
            </span>
          </div>
          <p className="text-2xl font-bold mb-2">{metrics.totalWaste} kg</p>
          {renderTrendIcon(metrics.wasteChange, true)}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform duration-300">
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
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Current Rank</h3>
            <span className="p-2 bg-yellow-50 rounded-full">
              <Award className="h-5 w-5 text-yellow-600" />
            </span>
          </div>
          <p className="text-2xl font-bold mb-2">#{metrics.currentRank || '-'}</p>
          {renderRankChangeIcon(metrics.rankChange)}
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
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
          </div>
        </div>
        
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">Waste by Type</h3>
          <div className="h-64">
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
          </div>
        </div>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
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
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin mb-4" />
                <p className="text-gray-500">Loading leaderboard data...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-green-600">
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Waste/Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {leaderboardData.slice(0, 5).map((company, index) => (
                    <tr 
                      key={company.id || index} 
                      className={`${index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} 
                        ${currentUser && company.businessID === currentUser.businessID ? 'bg-green-100 hover:bg-green-200' : ''}`} 
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {company.rank <= 3 ? (
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 
                              ${company.rank === 1 ? 'bg-yellow-100 text-yellow-600' : 
                                company.rank === 2 ? 'bg-gray-100 text-gray-600' : 
                                  'bg-orange-100 text-orange-600'}`}>
                              {company.rank}
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full flex items-center justify-center mr-2 bg-brand-100 text-brand-600">
                              {company.rank}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {currentUser && company.businessID === currentUser.businessID ? (
                          <div className="flex items-center">
                            <span>{company.companyName || company.username}</span>
                            <span className="ml-2 px-2 py-0.5 text-xs leading-tight font-semibold rounded-full bg-green-100 text-green-800">
                              You
                            </span>
                          </div>
                        ) : (
                          company.companyName || company.username
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">{company.formattedWastePerEmployee || company.wastePerEmployee} kg</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {company.rankChange === '-' || company.rankChange === 0 ? (
                          <div className="flex items-center text-blue-500">
                            <RefreshCw className="h-4 w-4 mr-1" />
                            <span>No change</span>
                          </div>
                        ) : company.rankChange > 0 ? (
                          <div className="flex items-center text-green-500">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>+{company.rankChange} position{company.rankChange !== 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-500">
                            <ArrowDown className="h-4 w-4 mr-1" />
                            <span>{company.rankChange} position{Math.abs(company.rankChange) !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Recent Entries</h3>
            <button onClick={handleWasteVisit} className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-sm font-medium hover:bg-brand-100 transition-all duration-200 flex items-center gap-1 transform hover:translate-x-1">
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4 transform rotate-45" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
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
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default Dashboard;