"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Filter, Edit, Save, X, Trash2, ArrowLeft, ArrowRight, 
  RefreshCw, Clock, Calendar, User, Package, FileText, MapPin, 
  Image, ChevronDown, ChevronUp, Download, Eye, Check, AlertCircle,
  Info, Plus, BarChart2, SlidersHorizontal, FileSpreadsheet, Printer, BarChart, Users, Clipboard, LogOut
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRouter } from "next/navigation";

const WasteLogPage = () => {
  // State variables
  const [wastelogs, setWastelogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Editing state
  const [editingLogId, setEditingLogId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    wasteType: '',
    weight: '',
    location: '',
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    dateRange: 'all', // all, today, week, month, custom
    wasteType: 'all',
    user: 'all',
    sortBy: 'date-desc' // date-desc, date-asc, weight-desc, weight-asc
  });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Advanced filter toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // View details modal
  const [viewLogDetails, setViewLogDetails] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    totalWaste: 0,
    averageWeight: 0,
    mostCommonType: '',
    recentActivity: ''
  });
  
  // Operation states
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const router = useRouter();

  // Define API base URL once
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  const handleBack = () => {
    router.push("/dashboard");
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

  // Ref for scrolling to top on page change
  const tableTopRef = useRef(null);
  
  // Colors
  const COLORS = {
    primary: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50', // Primary green
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20',
    },
    accent: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3', // Primary blue
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1',
    },
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    }
  };
  
  // Waste type mapping for colors and icons
  const wasteTypeConfig = {
    'Paper': { color: '#90CAF9', icon: <FileText className="h-4 w-4" /> },
    'Plastic': { color: '#F48FB1', icon: <Package className="h-4 w-4" /> },
    'Food': { color: '#A5D6A7', icon: <Package className="h-4 w-4" /> },
    'Glass': { color: '#81D4FA', icon: <Package className="h-4 w-4" /> },
    'Metal': { color: '#B0BEC5', icon: <Package className="h-4 w-4" /> },
    'Electronics': { color: '#FFB74D', icon: <Package className="h-4 w-4" /> },
    'Other': { color: '#CE93D8', icon: <Package className="h-4 w-4" /> }
  };
  
  // Check auth and fetch data on component mount
  useEffect(() => {
    checkAuthAndFetchData();
  }, []);
  
  // Re-filter logs when filters change
  useEffect(() => {
    applyFilters();
  }, [wastelogs, searchTerm, filterOptions, customDateRange]);
  
  // Recalculate total pages when filtered logs or page size changes
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredLogs.length / pageSize)));
    if (currentPage > Math.ceil(filteredLogs.length / pageSize)) {
      setCurrentPage(1);
    }
  }, [filteredLogs, pageSize]);
  
  // Scroll to top when changing pages
  useEffect(() => {
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  // Helper function to get auth headers from localStorage
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
  
  // Check authentication and get current user
  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const tokenFromLocalStorage = localStorage.getItem('authToken');
        
        // If we have a token in localStorage but no Supabase session, try using that
        if (tokenFromLocalStorage) {
          console.log('No Supabase session, but token found in localStorage. Proceeding with caution.');
        } else {
          setError('You must be logged in to access this page');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          setLoading(false);
          return;
        }
      }
      
      // Try to get user data from Supabase first
      let userData = null;
      const userEmail = session?.user?.email || localStorage.getItem('userEmail');
      
      if (userEmail) {
        const { data: userDataFromSupabase, error: userError } = await supabase
          .from('Users')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (userDataFromSupabase && !userError) {
          userData = userDataFromSupabase;
        } else {
          console.error('Error fetching user data from Supabase:', userError);
        }
      }
      
      // If Supabase doesn't work, try the API
      if (!userData) {
        try {
          const headers = getAuthHeaders();
          if (headers) {
            const response = await fetch(`${API_BASE_URL}/api/employee/profile`, {
              method: 'GET',
              headers,
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'success' && data.data) {
                userData = data.data;
              }
            }
          }
        } catch (apiError) {
          console.error('Error fetching user data from API:', apiError);
        }
      }
      
      // If we still don't have user data, show error
      if (!userData) {
        setError('Could not fetch user data');
        setLoading(false);
        return;
      }
      
      // Set current user data
      setCurrentUser(userData);
      setIsAdmin(userData.admin || userData.owner);
      
      // Get company info
      let companyName = '';
      
      // Try API first for business info
      try {
        const headers = getAuthHeaders();
        if (headers) {
          const response = await fetch(`${API_BASE_URL}/api/employee/business-info`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.companyName) {
              companyName = data.data.companyName;
            }
          }
        }
      } catch (apiError) {
        console.error('Error fetching business info from API:', apiError);
      }
      
      // If API didn't work, try Supabase
      if (!companyName) {
        const { data: businessData } = await supabase
          .from('Businesses')
          .select('companyName')
          .eq('businessID', userData.businessID)
          .single();
        
        if (businessData) {
          companyName = businessData.companyName;
        }
      }
      
      setBusinessName(companyName || 'Your Company');
      
      // If admin, fetch all users for this business for filtering
      if (userData.admin || userData.owner) {
        // Try API first
        try {
          const headers = getAuthHeaders();
          if (headers) {
            const response = await fetch(`${API_BASE_URL}/api/admin/employees`, {
              method: 'GET',
              headers,
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'success' && data.data) {
                setUsers(data.data);
              } else {
                // Fallback to Supabase
                await fetchUsersFromSupabase(userData.businessID);
              }
            } else {
              // Fallback to Supabase
              await fetchUsersFromSupabase(userData.businessID);
            }
          } else {
            // Fallback to Supabase
            await fetchUsersFromSupabase(userData.businessID);
          }
        } catch (apiError) {
          console.error('Error fetching employees from API:', apiError);
          // Fallback to Supabase
          await fetchUsersFromSupabase(userData.businessID);
        }
      }
      
      // Fetch waste logs
      await fetchWasteLogs(userData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError('An error occurred while loading the page');
      setLoading(false);
    }
  };
  
  // Helper function to fetch users from Supabase
  const fetchUsersFromSupabase = async (businessID) => {
    try {
      const { data: usersData } = await supabase
        .from('Users')
        .select('userID, username')
        .eq('businessID', businessID);
      
      if (usersData) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users from Supabase:', error);
    }
  };
  
  // Fetch waste logs with API first, fallback to Supabase
  const fetchWasteLogs = async (user) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get API headers from localStorage tokens
      const headers = getAuthHeaders();
      let logsData = [];
      
      // Try API first if we have headers
      if (headers) {
        try {
          // Determine which endpoint to use based on user role
          const endpoint = user.admin || user.owner
            ? `${API_BASE_URL}/api/admin/waste-logs`
            : `${API_BASE_URL}/api/employee/waste-logs`;
          
          console.log('Fetching waste logs from API:', endpoint);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.length > 0) {
              logsData = data.data;
              console.log('Successfully retrieved logs from API:', logsData.length);
            } else {
              console.log('API returned success but no data, trying Supabase');
              const supabaseData = await fetchWasteLogsFromSupabase(user);
              logsData = supabaseData || [];
            }
          } else {
            console.log('API request failed, trying Supabase');
            const supabaseData = await fetchWasteLogsFromSupabase(user);
            logsData = supabaseData || [];
          }
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
          const supabaseData = await fetchWasteLogsFromSupabase(user);
          logsData = supabaseData || [];
        }
      } else {
        // No API headers, go straight to Supabase
        console.log('No API headers available, using Supabase directly');
        const supabaseData = await fetchWasteLogsFromSupabase(user);
        logsData = supabaseData || [];
      }
      
      // Process data to add formatted dates
      const enhancedData = logsData.map(log => {
        // Format date for display
        const formattedDate = log.created_at 
          ? format(parseISO(log.created_at), 'MMM d, yyyy h:mm a')
          : 'Unknown date';
        
        return {
          ...log,
          formattedDate,
          username: log.username || 'Unknown User'
        };
      });
      
      console.log(`Setting ${enhancedData.length} logs to state`);
      setWastelogs(enhancedData);
      
      // Calculate stats
      calculateStats(enhancedData);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchWasteLogs:', error);
      setError('Failed to fetch waste logs');
      setLoading(false);
    }
  };
  
  // Direct Supabase query as fallback
  const fetchWasteLogsFromSupabase = async (user) => {
    try {
      console.log('Fetching waste logs from Supabase directly');
      let query = supabase.from('Wastelogs').select('*');
      
      if (user.admin || user.owner) {
        // Admin sees all logs for the business
        query = query.eq('businessID', user.businessID);
      } else {
        // Regular user only sees their own logs
        query = query.eq('userID', user.userID);
      }
      
      // Order by created_at descending (newest first)
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Process data to add formatted dates and fetch usernames
        const enhancedData = await Promise.all(data.map(async log => {
          // Format date for display
          const formattedDate = log.created_at 
            ? format(parseISO(log.created_at), 'MMM d, yyyy h:mm a')
            : 'Unknown date';
          
          // Get username if admin
          let username = 'Unknown User';
          if (user.admin || user.owner) {
            const { data: userData } = await supabase
              .from('Users')
              .select('username')
              .eq('userID', log.userID)
              .single();
            
            if (userData) {
              username = userData.username;
            }
          } else {
            username = user.username;
          }
          
          return {
            ...log,
            formattedDate,
            username
          };
        }));
        
        console.log(`Retrieved ${enhancedData.length} logs from Supabase`);
        return enhancedData;
      }
      
      console.log('No logs found in Supabase');
      return [];
    } catch (error) {
      console.error('Error fetching waste logs from Supabase:', error);
      return [];
    }
  };
  
  // Calculate statistics based on waste logs
  const calculateStats = (logs) => {
    if (!logs || logs.length === 0) {
      setStats({
        totalWaste: 0,
        averageWeight: 0,
        mostCommonType: 'N/A',
        recentActivity: 'No activity'
      });
      return;
    }
    
    // Total waste
    const totalWaste = logs.reduce((sum, log) => sum + parseFloat(log.weight || 0), 0);
    
    // Average weight
    const averageWeight = totalWaste / logs.length;
    
    // Most common waste type
    const typeCounts = {};
    logs.forEach(log => {
      const type = log.wasteType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    let mostCommonType = 'Unknown';
    let maxCount = 0;
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        mostCommonType = type;
        maxCount = count;
      }
    });
    
    // Recent activity calculation (last 7 days)
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const recentLogs = logs.filter(log => {
      if (!log.created_at) return false;
      const logDate = new Date(log.created_at);
      return logDate >= oneWeekAgo;
    });
    
    const recentActivity = `${recentLogs.length} entries in the last 7 days`;
    
    setStats({
      totalWaste: totalWaste.toFixed(2),
      averageWeight: averageWeight.toFixed(2),
      mostCommonType,
      recentActivity
    });
  };
  
  // Apply filters to waste logs
  const applyFilters = () => {
    if (!wastelogs || wastelogs.length === 0) {
      setFilteredLogs([]);
      return;
    }
    
    let filtered = [...wastelogs];
    
    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        (log.username && log.username.toLowerCase().includes(term)) ||
        (log.wasteType && log.wasteType.toLowerCase().includes(term)) ||
        (log.location && log.location.toLowerCase().includes(term))
      );
    }
    
    // Date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      if (filterOptions.dateRange === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (filterOptions.dateRange === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (filterOptions.dateRange === 'month') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
      } else if (filterOptions.dateRange === 'custom' && customDateRange.startDate) {
        startDate = new Date(customDateRange.startDate);
        
        // Set to start of day
        startDate.setHours(0, 0, 0, 0);
      }
      
      let endDate;
      if (filterOptions.dateRange === 'custom' && customDateRange.endDate) {
        endDate = new Date(customDateRange.endDate);
        
        // Set to end of day
        endDate.setHours(23, 59, 59, 999);
      }
      
      filtered = filtered.filter(log => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at);
        
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        
        return true;
      });
    }
    
    // Waste type filter
    if (filterOptions.wasteType !== 'all') {
      filtered = filtered.filter(log =>
        log.wasteType === filterOptions.wasteType
      );
    }
    
    // User filter
    if (filterOptions.user !== 'all') {
      filtered = filtered.filter(log =>
        String(log.userID) === String(filterOptions.user)
      );
    }
    
    // Apply sorting
    switch (filterOptions.sortBy) {
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'weight-asc':
        filtered.sort((a, b) => parseFloat(a.weight || 0) - parseFloat(b.weight || 0));
        break;
      case 'weight-desc':
        filtered.sort((a, b) => parseFloat(b.weight || 0) - parseFloat(a.weight || 0));
        break;
    }
    
    setFilteredLogs(filtered);
  };
  
  // Get current page's logs
  const getCurrentPageLogs = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  };
  
  // Handle page changes
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilterOptions(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    // Reset to first page when filter changes
    setCurrentPage(1);
  };
  
  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  // Handle custom date range input
  const handleDateRangeChange = (field, value) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };
  
  // Toggle advanced filters
  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(prev => !prev);
  };
  
  // Start editing a log
  const startEditing = (log) => {
    setEditingLogId(log.logID);
    setEditFormData({
      wasteType: log.wasteType || '',
      weight: log.weight || '',
      location: log.location || '',
    });
  };
  
  // Handle editing form changes
  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingLogId(null);
    setEditFormData({
      wasteType: '',
      weight: '',
      location: '',
    });
  };
  
  // Save edited log - with API first, fallback to Supabase
  const saveEdit = async (logID) => {
    try {
      // Validate form data
      if (!editFormData.wasteType || !editFormData.weight) {
        alert('Waste type and weight are required fields');
        return;
      }
      
      // Set saving state
      setSavingId(logID);
      
      const logData = {
        wasteType: editFormData.wasteType,
        weight: parseFloat(editFormData.weight),
        location: editFormData.location || null,
      };
      
      // Try API first
      const headers = getAuthHeaders();
      let success = false;
      let message = '';
      
      if (headers) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/employee/update-waste/${logID}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(logData),
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (data.status === 'success') {
            success = true;
            message = 'Waste log updated successfully via API';
          }
        } catch (apiError) {
          console.error('Error updating via API:', apiError);
          // Will fall back to Supabase
        }
      }
      
      // If API failed, try Supabase
      if (!success) {
        const { error } = await supabase
          .from('Wastelogs')
          .update(logData)
          .eq('logID', logID);
        
        if (error) throw error;
        
        success = true;
        message = 'Waste log updated successfully via Supabase';
      }
      
      // Update local state
      setWastelogs(wastelogs.map(log => {
        if (log.logID === logID) {
          return {
            ...log,
            ...logData,
          };
        }
        return log;
      }));
      
      // Reset editing state
      cancelEditing();
      
      // Remove saving state
      setSavingId(null);
      
      // Show success message
      alert(message);
      
      // Refresh data to ensure everything is in sync
      await fetchWasteLogs(currentUser);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to update waste log. Please try again.');
      
      // Remove saving state
      setSavingId(null);
    }
  };
  
  // Delete log - with API first, fallback to Supabase
  const deleteLog = async (logID) => {
    try {
      // Set deleting state
      setDeletingId(logID);
      
      // Try API first
      const headers = getAuthHeaders();
      let success = false;
      let message = '';
      
      if (headers) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/employee/delete-waste/${logID}`, {
            method: 'DELETE',
            headers,
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (data.status === 'success') {
            success = true;
            message = 'Waste log deleted successfully via API';
          }
        } catch (apiError) {
          console.error('Error deleting via API:', apiError);
          // Will fall back to Supabase
        }
      }
      
      // If API failed, try Supabase
      if (!success) {
        const { error } = await supabase
          .from('Wastelogs')
          .delete()
          .eq('logID', logID);
        
        if (error) throw error;
        
        success = true;
        message = 'Waste log deleted successfully via Supabase';
      }
      
      // Update local state
      setWastelogs(wastelogs.filter(log => log.logID !== logID));
      
      // Reset delete confirmation
      setDeleteConfirmId(null);
      
      // Remove deleting state
      setDeletingId(null);
      
      // Show success message
      alert(message);
      
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Failed to delete waste log. Please try again.');
      
      // Remove deleting state
      setDeletingId(null);
    }
  };
  
  // Open view details modal
  const viewDetails = (log) => {
    setViewLogDetails(log);
  };
  
  // Close view details modal
  const closeDetails = () => {
    setViewLogDetails(null);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      dateRange: 'all',
      wasteType: 'all',
      user: 'all',
      sortBy: 'date-desc'
    });
    setCustomDateRange({
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };
  
  // Export to CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No data to export');
      return;
    }
    
    try {
      // Create CSV content
      const headers = ['Date', 'User', 'Waste Type', 'Weight (kg)', 'Location', 'Business ID', 'Log ID'];
      
      const csvRows = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.formattedDate || '',
          log.username || '',
          log.wasteType || '',
          log.weight || '0',
          log.location || '',
          log.businessID || '',
          log.logID || ''
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set up download
      const fileName = `waste-logs-${businessName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      // Append to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSV file has been downloaded');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV file. Please try again.');
    }
  };

  // Action bar visibility
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);

  const toggleActionBar = () => {
    setIsActionBarVisible(!isActionBarVisible);
  };
  
  // Print table
  const printTable = () => {
    window.print();
  };
  
  // Refresh data
  const refreshData = async () => {
    try {
      setLoading(true);
      await fetchWasteLogs(currentUser);
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-green-500 animate-spin mb-4" />
          <div className="text-lg text-gray-700">Loading waste logs...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="text-lg text-red-500 mb-4">{error}</div>
          <button 
            onClick={checkAuthAndFetchData}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Get unique waste types for filter
  const uniqueWasteTypes = Array.from(new Set(wastelogs.map(log => log.wasteType).filter(Boolean)));
  
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white">
        <div className="container mx-auto max-w-7xl">

          <div className="flex justify-between mb-6">
            <button
              onClick={handleBack}
              className="bg-white/20 text-white p-3 rounded-full shadow-lg hover:bg-white/30 transition-colors flex items-center"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white p-3 rounded-full shadow-lg hover:bg-white/30 transition-colors flex items-center"
              aria-label="Logout"
            >
              <span className="font-medium mr-2">Logout</span>
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <h1 className="text-3xl font-bold mb-2">Waste Log Records</h1>
          <p className="text-green-100">{isAdmin ? `${businessName || 'Company'} — All Records` : 'Your Waste Log Records'}</p>
          
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Total Waste</div>
              <div className="text-2xl font-bold">{stats.totalWaste} kg</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Average Entry</div>
              <div className="text-2xl font-bold">{stats.averageWeight} kg</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Most Common Type</div>
              <div className="text-2xl font-bold">{stats.mostCommonType}</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Activity</div>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto mt-8 px-4 max-w-7xl">
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
                href="/dashboard" 
                className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-md"
                title="Employee Table"
              >
                <BarChart2 className="h-5 w-5 md:h-6 md:w-6" />
                <span className="hidden md:inline ml-2">Dashboard</span>
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

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Filters & Controls</h2>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={resetFilters}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
              
              <button 
                onClick={refreshData}
                className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              
              <button 
                onClick={exportToCSV}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </button>
              
              <button 
                onClick={printTable}
                className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-1"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              
              <button 
                onClick={toggleAdvancedFilters}
                className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
              </button>
            </div>
          </div>
          
          {/* Basic Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search waste logs by type, location, notes..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={filterOptions.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {filterOptions.dateRange === 'custom' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Start Date</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          value={customDateRange.startDate}
                          onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">End Date</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          value={customDateRange.endDate}
                          onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Waste Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={filterOptions.wasteType}
                    onChange={(e) => handleFilterChange('wasteType', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    {uniqueWasteTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                {/* User Filter (for admins only) */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={filterOptions.user}
                      onChange={(e) => handleFilterChange('user', e.target.value)}
                    >
                      <option value="all">All Users</option>
                      {users.map(user => (
                        <option key={user.userID} value={user.userID}>{user.username}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={filterOptions.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="date-desc">Date (Newest First)</option>
                    <option value="date-asc">Date (Oldest First)</option>
                    <option value="weight-desc">Weight (Highest First)</option>
                    <option value="weight-asc">Weight (Lowest First)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Results Summary */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Waste Logs Table */}
        <div ref={tableTopRef} className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          {/* Table Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6">
            <h2 className="text-xl font-semibold">Waste Log Entries</h2>
          </div>
          
          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageLogs().length > 0 ? (
                  getCurrentPageLogs().map((log, index) => (
                    <tr 
                      key={log.logID} 
                      id={`log-${log.logID}`}
                      className={`${index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} 
                        ${savingId === log.logID || deletingId === log.logID ? 'opacity-50' : ''}
                      `}
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      {/* Date Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">{log.formattedDate}</span>
                        </div>
                      </td>
                      
                      {/* User Column (admin only) */}
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">{log.username}</span>
                          </div>
                        </td>
                      )}
                      
                      {/* Waste Type Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingLogId === log.logID ? (
                          <select
                            className="border border-gray-300 rounded-md px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={editFormData.wasteType}
                            onChange={(e) => handleEditChange('wasteType', e.target.value)}
                          >
                            <option value="">Select Type</option>
                            {uniqueWasteTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            <option value="Paper">Paper</option>
                            <option value="Plastic">Plastic</option>
                            <option value="Food">Food</option>
                            <option value="Glass">Glass</option>
                            <option value="Metal">Metal</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                            style={{
                              backgroundColor: wasteTypeConfig[log.wasteType]?.color + '30' || '#9E9E9E30',
                              color: wasteTypeConfig[log.wasteType]?.color || '#757575',
                              border: `1px solid ${wasteTypeConfig[log.wasteType]?.color || '#9E9E9E'}`
                            }}
                          >
                            {wasteTypeConfig[log.wasteType]?.icon || <Package className="h-3 w-3 mr-1" />}
                            <span className="ml-1">{log.wasteType || 'Unknown'}</span>
                          </span>
                        )}
                      </td>
                      
                      {/* Weight Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingLogId === log.logID ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border border-gray-300 rounded-md px-2 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={editFormData.weight}
                            onChange={(e) => handleEditChange('weight', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900">{log.weight || '0'} kg</span>
                        )}
                      </td>
                      
                      {/* Location Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingLogId === log.logID ? (
                          <input
                            type="text"
                            className="border border-gray-300 rounded-md px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={editFormData.location}
                            onChange={(e) => handleEditChange('location', e.target.value)}
                            placeholder="Location"
                          />
                        ) : (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-500">{log.location || 'Not specified'}</span>
                          </div>
                        )}
                      </td>
                      
                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingLogId === log.logID ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveEdit(log.logID)}
                              disabled={savingId === log.logID}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              {savingId === log.logID ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              <span>{savingId === log.logID ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={savingId === log.logID}
                              className="text-gray-600 hover:text-gray-900 flex items-center"
                            >
                              <X className="h-4 w-4 mr-1" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => viewDetails(log)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                              disabled={savingId === log.logID || deletingId === log.logID}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => startEditing(log)}
                              className="text-green-600 hover:text-green-900 flex items-center"
                              disabled={savingId === log.logID || deletingId === log.logID}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(log.logID)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                              disabled={savingId === log.logID || deletingId === log.logID}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span>{deletingId === log.logID ? 'Deleting...' : 'Delete'}</span>
                            </button>
                            
                            {/* Delete Confirmation Popup */}
                            {deleteConfirmId === log.logID && (
                              <div className="absolute right-0 mt-8 w-64 bg-white rounded-md shadow-lg overflow-hidden z-10 border border-gray-200">
                                <div className="p-4">
                                  <p className="text-sm text-gray-700">Are you sure you want to delete this log?</p>
                                  <div className="mt-4 flex justify-end space-x-2">
                                    <button
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
                                      disabled={deletingId === log.logID}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => deleteLog(log.logID)}
                                      className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded flex items-center"
                                      disabled={deletingId === log.logID}
                                    >
                                      {deletingId === log.logID ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <Info className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="text-gray-500 mb-2">No waste logs found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters or adding new logs</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredLogs.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, filteredLogs.length)}</span> of{' '}
                <span className="font-medium">{filteredLogs.length}</span> entries
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  First
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-1 rounded-md ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                
                <div className="px-4 py-1 bg-white border border-gray-300 rounded-md">
                  <span className="text-gray-700">{currentPage}</span>
                  <span className="text-gray-400"> / {totalPages}</span>
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-1 rounded-md ${
                    currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* View Details Modal */}
      {viewLogDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white">
              <h3 className="text-lg font-medium">Waste Log Details</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Date & Time</div>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="text-gray-800">{viewLogDetails.formattedDate}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Submitted By</div>
                  <div className="flex items-center mt-1">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="text-gray-800">{viewLogDetails.username}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Waste Type</div>
                  <div className="flex items-center mt-1">
                    <Package className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="text-gray-800">{viewLogDetails.wasteType || 'Not specified'}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Weight</div>
                  <div className="flex items-center mt-1">
                    <div className="text-xl font-bold text-gray-800">{viewLogDetails.weight || '0'} kg</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="text-gray-800">{viewLogDetails.location || 'Not specified'}</div>
                  </div>
                </div>
                
                {/* Only show image if it exists */}
                {viewLogDetails.trashImageLink && (
                  <div>
                    <div className="text-sm text-gray-500">Image</div>
                    <div className="mt-1">
                      <img 
                        src={viewLogDetails.trashImageLink} 
                        alt="Waste log" 
                        className="rounded-md w-full h-auto max-h-48 object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {/* Add business info if admin */}
                {isAdmin && (
                  <div>
                    <div className="text-sm text-gray-500">Business Info</div>
                    <div className="mt-1">
                      <div className="text-gray-800">Business ID: {viewLogDetails.businessID || 'N/A'}</div>
                      <div className="text-gray-800">Log ID: {viewLogDetails.logID || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeDetails}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    startEditing(viewLogDetails);
                    closeDetails();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Styles - hidden in normal view */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .container, .container * {
            visibility: visible;
          }
          button, .actions, input, select {
            display: none !important;
          }
          .container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
};

export default WasteLogPage;