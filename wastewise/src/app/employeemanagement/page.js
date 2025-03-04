"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { 
  Users, Shield, Copy, Calendar, Award, Trash2, RefreshCw, 
  ChevronDown, ChevronUp, Search, Edit, Save, X, UserPlus, 
  Trash, Filter, TrendingUp, TrendingDown, CheckCircle, Clock, Clipboard, 
  ArrowUpRight, User, Mail, Key, BarChart2, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const EmployeeManagement = () => {
  // State variables
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    totalManagers: 0,
    joinCodes: {
      employee: '',
      admin: ''
    },
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  });
  
  const [timeframe, setTimeframe] = useState('month');
  const [topEmployees, setTopEmployees] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [tempEmployee, setTempEmployee] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'admin', 'employee'
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  
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

  // Bar chart colors
  const BAR_COLORS = [
    BRAND_COLORS[500], 
    BRAND_COLORS[600], 
    BRAND_COLORS[700], 
    BRAND_COLORS[800], 
    BRAND_COLORS[900]
  ];

  // Activity chart colors
  const ACTIVITY_COLORS = [
    ACCENT_COLORS[500], 
    BRAND_COLORS[500], 
    '#9C27B0', 
    '#FF9800', 
    '#F44336'
  ];

  // Toggle action bar visibility
  const toggleActionBar = () => {
    setIsActionBarVisible(!isActionBarVisible);
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`Copied to clipboard: ${text}`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
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
        } else {
          // No valid session found
          setError("Please log in to view this page");
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return null;
        }
      }
      
      // Check if user is admin
      const { data } = await supabase
        .from('Users')
        .select('admin, owner')
        .eq('email', userEmail)
        .single();
      
      if (!data || (!data.admin && !data.owner)) {
        setError("You don't have permission to access this page");
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
        return null;
      }
      
      return { token, userId, userEmail };
    } catch (error) {
      console.error("Auth check error:", error);
      setError("Authentication error. Please try logging in again.");
      return null;
    }
  };

  // Function to fetch all data for admin page
  const fetchAdminData = async () => {
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
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'User-ID': userId,
        'User-Email': userEmail,
        'Content-Type': 'application/json'
      };
      
      // Fetch metrics from our own API
      await fetchMetricsData(headers, API_BASE_URL, userEmail);
      
      // Fetch employee performance data with timeframe
      await fetchEmployeePerformance(headers, API_BASE_URL, timeframe);
      
      // Fetch employee activity data
      await fetchActivityData(headers, API_BASE_URL);
      
      // Fetch all employees
      await fetchEmployees(headers, API_BASE_URL, userEmail);
      
      // Update last updated time
      setMetrics(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data. Please try again.');
      setLoading(false);
    }
  };
  
  // Fetch metrics (employee count, admin count, join codes)
  const fetchMetricsData = async (headers, API_BASE_URL, userEmail) => {
    try {
      // First: directly query Users table for employee counts
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('admin, owner')
        .eq('businessID', await getBusinessId(userEmail));
      
      if (userError) throw userError;
      
      const totalEmployees = userData.length;
      const totalManagers = userData.filter(user => user.admin || user.owner).length;
      
      // Second: get join codes from Businesses table
      const { data: businessData, error: businessError } = await supabase
        .from('Businesses')
        .select('employeeInviteCode, adminInviteCode')
        .eq('businessID', await getBusinessId(userEmail))
        .single();
      
      if (businessError) throw businessError;
      
      setMetrics(prev => ({
        ...prev,
        totalEmployees,
        totalManagers,
        joinCodes: {
          employee: businessData.employeeInviteCode || 'Not available',
          admin: businessData.adminInviteCode || 'Not available'
        }
      }));
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      // Set default values instead of showing error
      setMetrics(prev => ({
        ...prev,
        totalEmployees: 0,
        totalManagers: 0,
        joinCodes: {
          employee: 'Error',
          admin: 'Error'
        }
      }));
    }
  };
  
  // Helper function to get business ID
  const getBusinessId = async (userEmail) => {
    const { data } = await supabase
      .from('Users')
      .select('businessID')
      .eq('email', userEmail)
      .single();
    
    return data?.businessID;
  };
  
  // Fetch top performing employees based on waste reported
  const fetchEmployeePerformance = async (headers, API_BASE_URL, timeframe) => {
    try {
      const businessId = await getBusinessId(headers['User-Email']);
      
      // Get all users for this business
      const { data: users, error: usersError } = await supabase
        .from('Users')
        .select('userID, username')
        .eq('businessID', businessId);
      
      if (usersError) throw usersError;
      
      // For each user, calculate total waste based on timeframe
      const performanceData = [];
      
      for (const user of users) {
        let query = supabase
          .from('Wastelogs')
          .select('weight, created_at')
          .eq('userID', user.userID);
        
        // Add timeframe filter
        const now = new Date();
        let fromDate;
        
        if (timeframe === 'day') {
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 1);
        } else if (timeframe === 'week') {
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 7);
        } else if (timeframe === 'month') {
          fromDate = new Date(now);
          fromDate.setMonth(now.getMonth() - 1);
        } else if (timeframe === 'quarter') {
          fromDate = new Date(now);
          fromDate.setMonth(now.getMonth() - 3);
        } else if (timeframe === 'year') {
          fromDate = new Date(now);
          fromDate.setFullYear(now.getFullYear() - 1);
        }
        
        if (fromDate) {
          query = query.gte('created_at', fromDate.toISOString());
        }
        
        const { data: logs, error: logsError } = await query;
        
        if (logsError) throw logsError;
        
        const totalWaste = logs.reduce((sum, log) => sum + parseFloat(log.weight || 0), 0);
        
        performanceData.push({
          name: user.username,
          waste: parseFloat(totalWaste.toFixed(1))
        });
      }
      
      // Sort by waste (descending) and take top 5
      const sortedData = performanceData
        .sort((a, b) => b.waste - a.waste)
        .slice(0, 5);
      
      setTopEmployees(sortedData);
    } catch (error) {
      console.error('Error fetching employee performance:', error);
      setTopEmployees([]);
    }
  };
  
  // Fetch activity data (waste logs by day of week)
  const fetchActivityData = async (headers, API_BASE_URL) => {
    try {
      const businessId = await getBusinessId(headers['User-Email']);
      
      // Get all waste logs for this business
      const { data: logs, error: logsError } = await supabase
        .from('Wastelogs')
        .select('created_at, weight')
        .eq('businessID', businessId);
      
      if (logsError) throw logsError;
      
      // Group by day of week
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const activityByDay = {
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0,
        'Sunday': 0
      };
      
      logs.forEach(log => {
        try {
          const date = new Date(log.created_at);
          const day = daysOfWeek[date.getDay()];
          activityByDay[day] += parseFloat(log.weight || 0);
        } catch (error) {
          console.error('Error processing log date:', error);
        }
      });
      
      // Format for chart
      const formattedActivity = Object.entries(activityByDay).map(([day, value]) => ({
        day,
        activity: parseFloat(value.toFixed(1))
      }));
      
      // Order by day of week (starting with Monday)
      const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const orderedActivity = orderedDays.map(day => {
        const data = formattedActivity.find(item => item.day === day);
        return data || { day, activity: 0 };
      });
      
      setActivityData(orderedActivity);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setActivityData([]);
    }
  };
  
  // Fetch all employees
  const fetchEmployees = async (headers, API_BASE_URL, userEmail) => {
    try {
      const businessId = await getBusinessId(userEmail);
      
      // Get all users for this business
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('businessID', businessId);
      
      if (error) throw error;
      
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };
  
  // Handle timeframe change for performance chart
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    
    // Refetch only the performance data with new timeframe
    // We'll need auth headers again
    (async () => {
      try {
        const authData = await checkAuth();
        if (!authData) return;
        
        const { token, userId, userEmail } = authData;
        
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'User-ID': userId,
          'User-Email': userEmail,
          'Content-Type': 'application/json'
        };
        
        await fetchEmployeePerformance(headers, API_BASE_URL, newTimeframe);
      } catch (error) {
        console.error('Error updating timeframe data:', error);
      }
    })();
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  // Handle filter change
  const handleFilterChange = (filter) => {
    setFilterStatus(filter);
  };
  
  // Start editing employee
  const startEditing = (employee) => {
    setEditingEmployee(employee.userID);
    setTempEmployee({...employee});
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingEmployee(null);
    setTempEmployee(null);
  };
  
  // Save employee changes
  const saveEmployee = async () => {
    try {
      const { error } = await supabase
        .from('Users')
        .update({
          username: tempEmployee.username,
          email: tempEmployee.email,
          admin: tempEmployee.admin
        })
        .eq('userID', tempEmployee.userID);
      
      if (error) throw error;
      
      // Update local state
      setEmployees(employees.map(emp => 
        emp.userID === tempEmployee.userID ? tempEmployee : emp
      ));
      
      // Reset editing state
      setEditingEmployee(null);
      setTempEmployee(null);
      
      // Refresh employee count metrics
      const authData = await checkAuth();
      if (authData) {
        const { token, userId, userEmail } = authData;
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        const headers = {
          'Authorization': `Bearer ${token}`,
          'User-ID': userId,
          'User-Email': userEmail,
          'Content-Type': 'application/json'
        };
        await fetchMetricsData(headers, API_BASE_URL, userEmail);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save changes. Please try again.');
    }
  };
  
  // Delete employee
  const deleteEmployee = async (userID) => {
    try {
      const { error } = await supabase
        .from('Users')
        .delete()
        .eq('userID', userID);
      
      if (error) throw error;
      
      // Update local state
      setEmployees(employees.filter(emp => emp.userID !== userID));
      setShowConfirmDelete(null);
      
      // Refresh employee count metrics
      const authData = await checkAuth();
      if (authData) {
        const { token, userId, userEmail } = authData;
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        const headers = {
          'Authorization': `Bearer ${token}`,
          'User-ID': userId,
          'User-Email': userEmail,
          'Content-Type': 'application/json'
        };
        await fetchMetricsData(headers, API_BASE_URL, userEmail);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  // Invite new employee (placeholder function)
  const inviteEmployee = () => {
    alert('This would open a modal to invite a new employee');
  };

  // Filter employees based on search term and filter status
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.username?.toLowerCase().includes(searchTerm) || 
      employee.email?.toLowerCase().includes(searchTerm);
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'admin' && (employee.admin || employee.owner)) || 
      (filterStatus === 'employee' && !(employee.admin || employee.owner));
    
    return matchesSearch && matchesFilter;
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-green-500 animate-spin mb-4" />
          <div className="text-lg text-gray-700">Loading admin dashboard data...</div>
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
              fetchAdminData();
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
              href="/dashboard" 
              className="bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
              title="Dashboard"
            >
              <BarChart2 className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden md:inline ml-2">Dashboard</span>
            </a>
          </div>
        </div>
      </div>

      {/* Add padding to the bottom of your content to avoid overlap with the action bar */}
      <div className={`transition-all duration-500 ease-in-out ${isActionBarVisible ? 'pb-24' : 'pb-0'}`}></div>
      
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Employee Management <span className="text-brand-500">(Admin)</span></h1>
        <div className="flex items-center gap-2">
          <RefreshCw 
            className="h-5 w-5 text-gray-500 cursor-pointer hover:text-brand-500 transition-colors" 
            onClick={fetchAdminData}
          />
          <span className="text-sm text-gray-500">Last updated: Today at {metrics.lastUpdated}</span>
        </div>
      </div>
      
      {/* Top Row: Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Employee Count Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600 transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
            <span className="p-2 bg-green-50 rounded-full">
              <Users className="h-5 w-5 text-green-600" />
            </span>
          </div>
          <p className="text-2xl font-bold mb-2">{metrics.totalEmployees}</p>
          <div className="flex items-center">
            <span className="text-sm text-gray-500">Active team members</span>
          </div>
        </div>
        
        {/* Managers Count Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Managers</h3>
            <span className="p-2 bg-blue-50 rounded-full">
              <Shield className="h-5 w-5 text-blue-600" />
            </span>
          </div>
          <p className="text-2xl font-bold mb-2">{metrics.totalManagers}</p>
          <div className="flex items-center">
            <span className="text-sm text-gray-500">Admin access users</span>
          </div>
        </div>
        
        {/* Invite Codes Card (Double width) */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 md:col-span-1 transform hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Invite Codes</h3>
            <span className="p-2 bg-purple-50 rounded-full">
              <Key className="h-5 w-5 text-purple-600" />
            </span>
          </div>
          
          {/* Employee Invite Code */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Employee Join Code</label>
            <div className="flex items-center">
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono flex-grow">
                {metrics.joinCodes.employee}
              </div>
              <button 
                onClick={() => copyToClipboard(metrics.joinCodes.employee)}
                className="ml-2 p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Admin Invite Code */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Manager Join Code</label>
            <div className="flex items-center">
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono flex-grow">
                {metrics.joinCodes.admin}
              </div>
              <button 
                onClick={() => copyToClipboard(metrics.joinCodes.admin)}
                className="ml-2 p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Top Employees Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Top Performing Employees</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => handleTimeframeChange('week')}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 transform ${timeframe === 'week' 
                  ? 'bg-brand-500 text-white font-medium scale-105' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'}`}
              >
                Week
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
              <BarChart
                data={topEmployees}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6B7280' }}
                  tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                />
                <YAxis tick={{ fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }} 
                  formatter={(value) => [`${value} kg`, 'Waste Reported']}
                />
                <Legend />
                <Bar 
                  dataKey="waste" 
                  name="Waste (kg)" 
                  radius={[4, 4, 0, 0]}
                >
                  {topEmployees.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Activity Pattern Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 transform hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">Weekly Activity Pattern</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activityData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fill: '#6B7280' }} />
                <YAxis tick={{ fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }} 
                  formatter={(value) => [`${value} kg`, 'Activity Level']}
                />
                <Legend />
                <Bar 
                  dataKey="activity" 
                  name="Activity (kg)" 
                  fill={ACCENT_COLORS[500]} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>This chart shows when employees are most active logging waste throughout the week.</p>
          </div>
        </div>
      </div>
      
      {/* Bottom Section: Employee Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700">Employee Management</h3>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={searchTerm}
                onChange={handleSearch}
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Filter Dropdown */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-2 text-sm ${filterStatus === 'all' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('admin')}
                className={`px-3 py-2 text-sm ${filterStatus === 'admin' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Managers
              </button>
              <button
                onClick={() => handleFilterChange('employee')}
                className={`px-3 py-2 text-sm ${filterStatus === 'employee' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Employees
              </button>
            </div>
          </div>
        </div>
        
        {/* Employee Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-green-600">
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredEmployees.map((employee, index) => (
                <tr 
                  key={employee.userID} 
                  className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'} 
                  style={{ transition: 'background-color 0.2s' }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEmployee === employee.userID ? (
                      <input
                        type="text"
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={tempEmployee.username || ''}
                        onChange={(e) => setTempEmployee({...tempEmployee, username: e.target.value})}
                      />
                    ) : (
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.username}</div>
                          {employee.owner && <span className="px-2 py-1 text-xs leading-tight font-semibold rounded-full bg-purple-100 text-purple-800">Owner</span>}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEmployee === employee.userID ? (
                      <input
                        type="email"
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={tempEmployee.email || ''}
                        onChange={(e) => setTempEmployee({...tempEmployee, email: e.target.value})}
                      />
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">{employee.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEmployee === employee.userID ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={tempEmployee.admin ? 'admin' : 'employee'}
                        onChange={(e) => setTempEmployee({...tempEmployee, admin: e.target.value === 'admin'})}
                        disabled={employee.owner}
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Manager</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.owner 
                          ? 'bg-purple-100 text-purple-800' 
                          : employee.admin 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {employee.owner ? 'Owner' : employee.admin ? 'Manager' : 'Employee'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(employee.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingEmployee === employee.userID ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEmployee}
                          className="text-green-600 hover:text-green-900 flex items-center"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900 flex items-center"
                        >
                          <X className="h-4 w-4 mr-1" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-3 justify-end">
                        <button
                          onClick={() => startEditing(employee)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          disabled={employee.owner}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          <span>Edit</span>
                        </button>
                        {!employee.owner && (
                          <button
                            onClick={() => setShowConfirmDelete(employee.userID)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Confirmation Dialog */}
                    {showConfirmDelete === employee.userID && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg overflow-hidden z-10 border border-gray-200">
                        <div className="p-4">
                          <p className="text-sm text-gray-700">Are you sure you want to delete this employee?</p>
                          <div className="mt-4 flex justify-end space-x-2">
                            <button
                              onClick={() => setShowConfirmDelete(null)}
                              className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteEmployee(employee.userID)}
                              className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No employees found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Custom CSS for glassmorphic effect */}
      <style jsx global>{`
        .glass-effect {
          backdrop-filter: blur(10px);
          background-color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default EmployeeManagement;