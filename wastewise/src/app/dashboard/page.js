"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Clock, Calendar, Award, Trash2, Users, Plus, BarChart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  // Format date for display - moved before useState usage
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [loading, setLoading] = useState(true);
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
            .select('admin')
            .eq('email', userEmail)
            .single();
          
          if (data) {
            localStorage.setItem('isAdmin', data.admin);
            setIsAdmin(data.admin);
          }
        } else {
          // No valid session found
          setError("Please log in to view this dashboard");
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return null;
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

  // Get current timestamp for last updated
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  // Function to fetch all dashboard data
  const fetchDashboardData = async () => {
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
                date: data.data.mostRecentLog?.date || formatDate(new Date()),
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
      
      // Fetch waste chart data from dedicated endpoint
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
          const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard`, {
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
            // Format leaderboard data
            const leaderboard = data.data.map((entry, index) => ({
              id: entry.ID || index + 1,
              username: entry.username || `User ${index + 1}`,
              totalWaste: Math.round(entry.seasonalWaste || 0),
              rank: index + 1,
              change: entry.rankChange || 0
            }));
            
            setLeaderboardData(leaderboard.slice(0, 10)); // Top 10 only
          } else {
            console.log('No leaderboard data available');
            // Set empty array for no data
            setLeaderboardData([]);
          }
        } catch (error) {
          console.error('Error in leaderboard:', error);
          // Keep the leaderboard empty instead of showing error
          setLeaderboardData([]);
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
            // Format recent entries
            const entries = data.data.map(entry => ({
              id: entry.logID || Math.random().toString(36).substr(2, 9),
              username: entry.username || 'Unknown User',
              wasteType: entry.wasteType || 'Mixed',
              weight: parseFloat(entry.weight || 0).toFixed(1),
              date: formatDate(entry.created_at || new Date())
            }));
            
            // Sort by date (newest first) and limit to 10
            setRecentEntries(
              entries
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 10)
            );
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

  // Improved error handling function
  const handleApiError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    
    // More detailed error logging
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  };

  // Fetch data on component mount and when timeframe changes
  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
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
    if (value > 0) {
      return (
        <div className="flex items-center">
          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-green-500">+{value}</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center">
          <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-500">{value}</span>
        </div>
      );
    } else {
      return (
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
          <div className="text-lg text-gray-700">Loading dashboard data...</div>
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
          {renderTrendIcon(metrics.co2Change)}
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
      
      {/* Quick Actions Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <a href="/add-waste" className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-md">
            <Plus className="h-5 w-5" /> 
            <span>Add Waste Entry</span>
          </a>
          
          <a href="/leaderboard" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-md">
            <BarChart className="h-5 w-5" /> 
            <span>Leaderboard</span>
          </a>
          
          <a href="/employees" className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-md">
            <Users className="h-5 w-5" /> 
            <span>Employee Table</span>
          </a>
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
            <h3 className="text-lg font-semibold text-gray-700">Leaderboard (Top 10)</h3>
            <button className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-sm font-medium hover:bg-brand-100 transition-all duration-200 flex items-center gap-1 transform hover:translate-x-1">
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4 transform rotate-45" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-green-600">
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Total Waste (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Change</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {leaderboardData.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} style={{ transition: 'background-color 0.2s' }}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {user.rank <= 3 ? (
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 
                            ${user.rank === 1 ? 'bg-yellow-100 text-yellow-600' : 
                              user.rank === 2 ? 'bg-blue-100 text-blue-600' : 
                                'bg-orange-100 text-orange-600'}`}>
                            {user.rank}
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full flex items-center justify-center mr-2 bg-brand-100 text-brand-600">
                            {user.rank}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{user.totalWaste}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                      {renderRankChangeIcon(user.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Recent Entries</h3>
            <button className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-sm font-medium hover:bg-brand-100 transition-all duration-200 flex items-center gap-1 transform hover:translate-x-1">
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
                  <tr key={entry.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} style={{ transition: 'background-color 0.2s' }}>
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