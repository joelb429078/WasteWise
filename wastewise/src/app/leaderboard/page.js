"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Medal, Award, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  RefreshCw, Filter, Search, Calendar, TrendingUp, TrendingDown, 
  MapPin, BarChart2, Globe, Users, Building, ChevronDown, ChevronUp,
  ArrowUpRight, Download, SlidersHorizontal, FileSpreadsheet, Printer, Plus,
  Trash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet map component to prevent SSR issues
const LeafletMap = dynamic(() => import('../../components/LeafletMap/LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
    </div>
  )
});

const LeaderboardPage = () => {
  // State variables
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('season');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    performanceDirection: 'top', // top, bottom
    rankChange: 'all', // improved, declined, stable, all
    sortBy: 'waste-desc' // waste-desc, waste-asc, rank-asc, rank-desc, change-desc, change-asc
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalCompanies: 0,
    averageWaste: 0,
    topPerformer: '',
    mostImproved: ''
  });
  
  // Ref for scrolling to top on page change
  const leaderboardTopRef = useRef(null);
  
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
    medal: {
      gold: '#FFD700',
      silver: '#C0C0C0',
      bronze: '#CD7F32',
    }
  };
  
  // Check auth and fetch data
  useEffect(() => {
    checkAuthAndFetchData();
  }, []);
  
  // Re-filter data when filters change
  useEffect(() => {
    applyFilters();
  }, [leaderboardData, searchTerm, filterOptions]);
  
  // Recalculate total pages when filtered data or page size changes
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / pageSize)));
    if (currentPage > Math.ceil(filteredData.length / pageSize)) {
      setCurrentPage(1);
    }
  }, [filteredData, pageSize]);
  
  // Scroll to top when changing pages
  useEffect(() => {
    if (leaderboardTopRef.current) {
      leaderboardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);
  
  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to access this page');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      // Get current user
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('email', session.user.email)
        .single();
      
      if (userError || !userData) {
        setError('Could not fetch user data');
        setLoading(false);
        return;
      }
      
      setCurrentUser(userData);
      setIsAdmin(userData.admin || userData.owner);
      
      // Get company info
      const { data: businessData } = await supabase
        .from('Businesses')
        .select('companyName')
        .eq('businessID', userData.businessID)
        .single();
      
      if (businessData) {
        setBusinessName(businessData.companyName);
      }
      
      // Fetch leaderboard data
      await fetchLeaderboardData(userData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError('An error occurred while loading the page');
      setLoading(false);
    }
  };
  
  const fetchLeaderboardData = async (user) => {
    try {
      // Fetch leaderboard from API
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=${selectedTimeframe}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'User-ID': user.userID,
          'User-Email': user.email,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        console.log('Raw leaderboard data:', data.data);
        
        // Extract waste values from the data
        const processedData = data.data.map(entry => ({
          ...entry,
          seasonalWaste: parseFloat(entry.seasonalWaste || 0),
          formattedWaste: parseFloat(entry.seasonalWaste || 0).toFixed(1),
        }));
        
        // Create arrays to calculate current and previous ranks
        const currentEntries = [...processedData];
        
        // Sort by waste amount (higher waste = worse rank)
        // For the current period
        currentEntries.sort((a, b) => b.seasonalWaste - a.seasonalWaste);
        
        // Create mapping of businessID to current rank
        const currentRankMap = {};
        currentEntries.forEach((entry, index) => {
          currentRankMap[entry.businessID] = index + 1;
        });
        
        // For the previous period, we need to simulate previous rankings
        // If we have the previous season's data, we could use that directly
        // Here, we'll use the rankChange info from the API to estimate previous waste values
        const previousEntries = [...processedData].map(entry => {
          const bid = entry.businessID;
          // Use the original rank from backend or fallback to our calculated rank
          const backendRank = parseInt(entry.rank) || currentRankMap[bid] || 0;
          // If no rankChange is provided, assume no change
          const rankChangeFromBackend = parseFloat(entry.rankChange || 0);
          
          // Estimate the previous rank based on the current rank and rankChange
          // This is a simple approach - if backend says improved by 3 positions,
          // then previous rank was current + 3
          const previousRank = rankChangeFromBackend > 0 
            ? backendRank + Math.round(Math.abs(rankChangeFromBackend))
            : backendRank - Math.round(Math.abs(rankChangeFromBackend));
          
          return {
            businessID: bid,
            previousRank: Math.max(1, previousRank) // Ensure rank is at least 1
          };
        });
        
        // Calculate actual position changes
        const updatedData = processedData.map(entry => {
          const bid = entry.businessID;
          // Use the original rank from backend or fallback to our calculated rank
          const currentRank = parseInt(entry.rank) || currentRankMap[bid] || 0;
          
          // Find the previous entry for this business
          const previousEntry = previousEntries.find(prev => prev.businessID === bid);
          const previousRank = previousEntry ? previousEntry.previousRank : currentRank;
          
          // Calculate position change (positive means improvement)
          const positionChange = previousRank - currentRank;
          
          return {
            ...entry,
            // Ensure rank is correctly set
            rank: currentRank,
            // Replace percentage change with position change
            rankChange: positionChange,
            rankChangeIcon: getRankChangeIcon(positionChange),
            rankChangeClass: getRankChangeClass(positionChange)
          };
        });
        
        console.log('Processed leaderboard data with position changes:', updatedData);
        
        // Set the data with the updated rankChange values
        setLeaderboardData(updatedData);
        
        // Create map data points - using random coords for demo
        const mapData = updatedData.map((business, index) => {
          // Generate somewhat realistic random coordinates
          const lat = 40 + (Math.random() - 0.5) * 30;
          const lng = -100 + (Math.random() - 0.5) * 60;
          
          return {
            id: business.businessID,
            position: [lat, lng],
            name: business.username || `Business ${index + 1}`,
            rank: business.rank,
            waste: business.formattedWaste,
            popupContent: `
              <div class="font-sans">
                <div class="font-bold">${business.username || `Business ${index + 1}`}</div>
                <div>Rank: #${business.rank}</div>
                <div>Waste: ${business.formattedWaste} kg</div>
              </div>
            `
          };
        });
        
        setMapPoints(mapData);
        
        // Calculate stats
        calculateStats(updatedData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to fetch leaderboard data');
    }
  };
  
  // Calculate statistics
  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({
        totalCompanies: 0,
        averageWaste: 0,
        topPerformer: 'N/A',
        mostImproved: 'N/A'
      });
      return;
    }
    
    // Total companies
    const totalCompanies = data.length;
    
    // Average waste
    const totalWaste = data.reduce((sum, company) => sum + parseFloat(company.seasonalWaste || 0), 0);
    const averageWaste = totalWaste / totalCompanies;
    
    // Top performer (lowest waste)
    const topPerformer = [...data].sort((a, b) => 
      parseFloat(a.seasonalWaste || 0) - parseFloat(b.seasonalWaste || 0)
    )[0]?.username || 'N/A';
    
    // Most improved
    const mostImproved = [...data].sort((a, b) => 
      (b.rankChange || 0) - (a.rankChange || 0)
    )[0]?.username || 'N/A';
    
    setStats({
      totalCompanies,
      averageWaste: averageWaste.toFixed(1),
      topPerformer,
      mostImproved
    });
  };
  
  // Apply filters to leaderboard data
  const applyFilters = () => {
    if (!leaderboardData) return;
    
    let filtered = [...leaderboardData];
    
    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.username?.toLowerCase().includes(term) ||
        company.companyName?.toLowerCase().includes(term)
      );
    }
    
    // Performance direction filter
    if (filterOptions.performanceDirection === 'top') {
      // Already sorted by waste (high to low)
    } else if (filterOptions.performanceDirection === 'bottom') {
      filtered = filtered.slice().reverse();
    }
    
    // Rank change filter
    if (filterOptions.rankChange !== 'all') {
      if (filterOptions.rankChange === 'improved') {
        filtered = filtered.filter(company => (company.rankChange || 0) > 0);
      } else if (filterOptions.rankChange === 'declined') {
        filtered = filtered.filter(company => (company.rankChange || 0) < 0);
      } else if (filterOptions.rankChange === 'stable') {
        filtered = filtered.filter(company => (company.rankChange || 0) === 0);
      }
    }
    
    // Apply sorting
    switch (filterOptions.sortBy) {
      case 'waste-desc':
        filtered.sort((a, b) => parseFloat(b.seasonalWaste || 0) - parseFloat(a.seasonalWaste || 0));
        break;
      case 'waste-asc':
        filtered.sort((a, b) => parseFloat(a.seasonalWaste || 0) - parseFloat(b.seasonalWaste || 0));
        break;
      case 'rank-asc':
        filtered.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        break;
      case 'rank-desc':
        filtered.sort((a, b) => (b.rank || 0) - (a.rank || 0));
        break;
      case 'change-desc':
        filtered.sort((a, b) => (b.rankChange || 0) - (a.rankChange || 0));
        break;
      case 'change-asc':
        filtered.sort((a, b) => (a.rankChange || 0) - (b.rankChange || 0));
        break;
    }
    
    setFilteredData(filtered);
  };
  
  // Helper functions for rank change styling
  const getRankChangeIcon = (change) => {
    if (!change || change === 0) {
      return "–";
    } else if (change > 0) {
      return "↑";
    } else {
      return "↓";
    }
  };
  
  const getRankChangeClass = (change) => {
    if (!change || change === 0) {
      return "text-gray-500";
    } else if (change > 0) {
      return "text-green-600";
    } else {
      return "text-red-600";
    }
  };
  
  // Get current page's data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
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
  
  // Toggle advanced filters
  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(prev => !prev);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = async (timeframe) => {
    setSelectedTimeframe(timeframe);
    
    // Refetch data with new timeframe
    setLoading(true);
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'User-ID': currentUser.userID,
          'User-Email': currentUser.email,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        // Apply the same position calculation logic as in fetchLeaderboardData
        const processedData = data.data.map(entry => ({
          ...entry,
          seasonalWaste: parseFloat(entry.seasonalWaste || 0),
          formattedWaste: parseFloat(entry.seasonalWaste || 0).toFixed(1),
        }));
        
        // Create arrays to calculate current and previous ranks
        const currentEntries = [...processedData];
        
        // Sort by waste amount (higher waste = worse rank)
        currentEntries.sort((a, b) => b.seasonalWaste - a.seasonalWaste);
        
        // Create mapping of businessID to current rank
        const currentRankMap = {};
        currentEntries.forEach((entry, index) => {
          currentRankMap[entry.businessID] = index + 1;
        });
        
        // Handle previous entries similar to fetchLeaderboardData
        const previousEntries = [...processedData].map(entry => {
          const bid = entry.businessID;
          const backendRank = parseInt(entry.rank) || currentRankMap[bid] || 0;
          const rankChangeFromBackend = parseFloat(entry.rankChange || 0);
          
          const previousRank = rankChangeFromBackend > 0 
            ? backendRank + Math.round(Math.abs(rankChangeFromBackend))
            : backendRank - Math.round(Math.abs(rankChangeFromBackend));
          
          return {
            businessID: bid,
            previousRank: Math.max(1, previousRank)
          };
        });
        
        // Calculate actual position changes
        const updatedData = processedData.map(entry => {
          const bid = entry.businessID;
          const currentRank = parseInt(entry.rank) || currentRankMap[bid] || 0;
          
          const previousEntry = previousEntries.find(prev => prev.businessID === bid);
          const previousRank = previousEntry ? previousEntry.previousRank : currentRank;
          
          const positionChange = previousRank - currentRank;
          
          return {
            ...entry,
            rank: currentRank,
            rankChange: positionChange,
            rankChangeIcon: getRankChangeIcon(positionChange),
            rankChangeClass: getRankChangeClass(positionChange)
          };
        });
        
        setLeaderboardData(updatedData);
        
        // Create map data points with the updated data
        const mapData = updatedData.map((business, index) => {
          const lat = 40 + (Math.random() - 0.5) * 30;
          const lng = -100 + (Math.random() - 0.5) * 60;
          
          return {
            id: business.businessID,
            position: [lat, lng],
            name: business.username || `Business ${index + 1}`,
            rank: business.rank,
            waste: business.formattedWaste,
            popupContent: `
              <div class="font-sans">
                <div class="font-bold">${business.username || `Business ${index + 1}`}</div>
                <div>Rank: #${business.rank}</div>
                <div>Waste: ${business.formattedWaste} kg</div>
              </div>
            `
          };
        });
        
        setMapPoints(mapData);
        
        // Calculate stats with the updated data
        calculateStats(updatedData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      performanceDirection: 'top',
      rankChange: 'all',
      sortBy: 'waste-desc'
    });
    setCurrentPage(1);
  };
  
  // Export to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Rank', 'Company', 'Waste (kg)', 'Change'];
    
    const csvRows = [
      headers.join(','),
      ...filteredData.map(company => [
        company.rank || '',
        company.username || '',
        company.formattedWaste || '0',
        company.rankChange || '0'
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up download
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Print table
  const printTable = () => {
    window.print();
  };
  
  // Get medal for top 3 ranks
  const getMedal = (rank) => {
    if (rank === 1) {
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="h-6 w-6 text-gray-400" />;
    } else if (rank === 3) {
      return <Award className="h-6 w-6 text-amber-700" />;
    } else {
      return null;
    }
  };

    const [isActionBarVisible, setIsActionBarVisible] = useState(true);

    const toggleActionBar = () => {
        setIsActionBarVisible(!isActionBarVisible);
    };
  

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-green-500 animate-spin mb-4" />
          <div className="text-lg text-gray-700">Loading leaderboard data...</div>
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
  
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
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
              <Trash className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden md:inline ml-2">Waste Logs</span>
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



      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold mb-2">Waste Reduction Leaderboard</h1>
          <p className="text-green-100">See how {businessName || 'your company'} stacks up against others</p>
          
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Participating Companies</div>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Average Waste</div>
              <div className="text-2xl font-bold">{stats.averageWaste} kg</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Top Performer</div>
              <div className="text-xl font-bold truncate">{stats.topPerformer}</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Most Improved</div>
              <div className="text-xl font-bold truncate">{stats.mostImproved}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto mt-8 px-4 max-w-7xl">
        {/* Main grid layout - Map + Leaderboard */}



        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Map Section - 2 columns on large screens */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
              <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Company Locations
                </h2>
              </div>
              
              <div className="p-4 flex-grow">
                {/* Map container - needs fixed height */}
                <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                  <LeafletMap points={mapPoints} />
                </div>
                
                <div className="mt-3 text-sm text-gray-500">
                  The map shows the approximate locations of participating companies in the leaderboard.
                </div>
              </div>
            </div>
          </div>
          
          {/* Leaderboard Section - 3 columns on large screens */}
          <div className="lg:col-span-3 order-1 lg:order-2" ref={leaderboardTopRef}>
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
                    {showAdvancedFilters ? 'Hide Filters' : 'Filters'}
                  </button>
                </div>
              </div>
              
              {/* Basic Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search for companies..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              {/* Timeframe Selection */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => handleTimeframeChange('week')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'week'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleTimeframeChange('month')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'month'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleTimeframeChange('quarter')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'quarter'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Quarter
                </button>
                <button
                  onClick={() => handleTimeframeChange('season')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'season'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Season
                </button>
                <button
                  onClick={() => handleTimeframeChange('year')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'year'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Year
                </button>
                <button
                  onClick={() => handleTimeframeChange('all')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedTimeframe === 'all'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Time
                </button>
              </div>
              
              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Performance Direction */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={filterOptions.performanceDirection}
                        onChange={(e) => handleFilterChange('performanceDirection', e.target.value)}
                      >
                        <option value="top">Top Performers</option>
                        <option value="bottom">Bottom Performers</option>
                      </select>
                    </div>
                    
                    {/* Rank Change Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rank Change</label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={filterOptions.rankChange}
                        onChange={(e) => handleFilterChange('rankChange', e.target.value)}
                      >
                        <option value="all">All Changes</option>
                        <option value="improved">Improved</option>
                        <option value="declined">Declined</option>
                        <option value="stable">No Change</option>
                      </select>
                    </div>
                    
                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={filterOptions.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      >
                        <option value="waste-desc">Waste (Highest First)</option>
                        <option value="waste-asc">Waste (Lowest First)</option>
                        <option value="rank-asc">Rank (Top First)</option>
                        <option value="rank-desc">Rank (Bottom First)</option>
                        <option value="change-desc">Most Improved</option>
                        <option value="change-asc">Least Improved</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Results Summary */}
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  Showing {filteredData.length} {filteredData.length === 1 ? 'company' : 'companies'}
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
            
            {/* Leaderboard Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
              {/* Table Header */}
              <div className="border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Trophy className="h-6 w-6 mr-2" />
                  {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)} Leaderboard
                </h2>
              </div>
              
              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waste (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageData().length > 0 ? (
                      getCurrentPageData().map((company, index) => (
                        <tr
                          key={company.businessID || index}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-gray-100 transition-colors ${
                            currentUser && company.businessID === currentUser.businessID ? 'bg-green-50 hover:bg-green-100' : ''
                          }`}
                        >
                          {/* Rank Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getMedal(company.rank) ? (
                                <div className="h-8 w-8 flex items-center justify-center mr-2">
                                  {getMedal(company.rank)}
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-gray-700 font-medium text-sm">
                                  {company.rank}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Company Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Building className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{company.username || company.companyName || `Company ${company.rank}`}</div>
                                {currentUser && company.businessID === currentUser.businessID && (
                                  <span className="px-2 py-0.5 text-xs leading-tight font-semibold rounded-full bg-green-100 text-green-800">
                                    Your Company
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Waste Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">{company.formattedWaste} kg</span>
                          </td>
                          
                          {/* Change Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center ${company.rankChangeClass}`}>
                                {company.rankChange > 0 ? (
                                <ArrowUp className="h-4 w-4 mr-1" />
                                ) : company.rankChange < 0 ? (
                                <ArrowDown className="h-4 w-4 mr-1" />
                                ) : (
                                <span className="inline-block w-4 h-4 mr-1 text-center">–</span>
                                )}
                                <span className="font-medium">
                                {company.rankChange !== 0 ? Math.abs(company.rankChange) : ''}
                                {company.rankChange !== 0 ? (
                                    ` position${Math.abs(company.rankChange) !== 1 ? 's' : ''}`
                                ) : (
                                    'No change'
                                )}
                                </span>
                            </div>
                            </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <Trophy className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-gray-500 mb-2">No companies found</p>
                            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {filteredData.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{' '}
                    <span className="font-medium">{filteredData.length}</span> companies
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
            
            {/* Key Performance Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-green-600" />
                Performance Insights
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-600 mb-4">
                  {currentUser && filteredData.some(company => company.businessID === currentUser.businessID) ? (
                    <>
                      {(() => {
                        const yourCompany = filteredData.find(company => company.businessID === currentUser.businessID);
                        if (yourCompany) {
                          const rank = yourCompany.rank;
                          const totalCompanies = filteredData.length;
                          const percentile = Math.round((totalCompanies - rank) / totalCompanies * 100);
                          
                          return (
                            <>
                              <span className="font-semibold">{businessName || 'Your company'}</span> is currently ranked <span className="font-semibold">#{rank}</span> out of {totalCompanies} companies, putting you in the top <span className="font-semibold">{percentile}%</span> of waste reduction leaders.
                              {yourCompany.rankChange > 0 && (
                                <> Your rank has improved by <span className="text-green-600 font-semibold">{yourCompany.rankChange} position{yourCompany.rankChange !== 1 ? 's' : ''}</span> compared to the previous period.</>
                                )}
                                {yourCompany.rankChange < 0 && (
                                <> Your rank has declined by <span className="text-red-600 font-semibold">{Math.abs(yourCompany.rankChange)} position{Math.abs(yourCompany.rankChange) !== 1 ? 's' : ''}</span> compared to the previous period.</>
                                )}
                                {yourCompany.rankChange === 0 && (
                                <> Your rank remains unchanged from the previous period.</>
                                )}
                            </>
                          );
                        }
                        return 'Your company is not currently in the leaderboard for this timeframe.';
                      })()}
                    </>
                  ) : (
                    <>
                      This leaderboard shows the ranking of all participating companies based on their waste reduction efforts for the selected timeframe.
                      Companies are ranked based on their total reported waste, with lower waste resulting in a higher ranking.
                    </>
                  )}
                </p>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between mt-4">
                  <div className="flex items-center mb-2 md:mb-0">
                    <div className="bg-green-100 p-2 rounded-full">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="ml-2 text-sm text-gray-600">Lower waste = Higher rank</span>
                  </div>
                  
                  <a href="/add-waste" className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center justify-center md:justify-start w-full md:w-auto">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Log Your Waste
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Print Styles - hidden in normal view */}
      <style jsx global>{`
        .toolbar {
            z-index: 1000; /* or any value high enough */
        }
        .leaflet-container {
            z-index: 1;
        }

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

export default LeaderboardPage;