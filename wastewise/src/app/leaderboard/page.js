"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Medal, Award, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  RefreshCw, BarChart2, Globe, Users, Building, 
  FileSpreadsheet, Printer, LogOut, TrendingDown, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";

const LeafletMap = dynamic(() => import('../../components/LeafletMap/LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
    </div>
  )
});

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('season');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('rank-asc');
  const [stats, setStats] = useState({
    totalCompanies: 0,
    averageWaste: 0,
    topPerformer: '',
    mostImproved: ''
  });

  const router = useRouter();
  const leaderboardTopRef = useRef(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leaderboardData]);

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / pageSize)));
    if (currentPage > Math.ceil(filteredData.length / pageSize)) {
      setCurrentPage(1);
    }
  }, [filteredData, pageSize]);

  useEffect(() => {
    if (leaderboardTopRef.current) {
      leaderboardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          setTimeout(() => router.push('/login'), 2000);
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

      setCurrentUser(userData);
      setIsAdmin(userData.admin || userData.owner);

      const { data: businessData } = await supabase
        .from('Businesses')
        .select('companyName')
        .eq('businessID', userData.businessID)
        .single();

      if (businessData) setBusinessName(businessData.companyName);

      await fetchLeaderboardData(userData);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError('An error occurred while loading the page');
    } finally {
      setLoading(false);
    }
  };

  const parseLocation = (locationData) => {
    if (!locationData) return null;
    
    try {
      let locationObj;
      
      // If already a string, try to parse it
      if (typeof locationData === 'string') {
        locationObj = JSON.parse(locationData);
      } else {
        // Already an object
        locationObj = locationData;
      }
      
      // Handle array format [lat, lng]
      if (Array.isArray(locationObj) && locationObj.length === 2) {
        return locationObj;
      }
      
      // Handle object format {lat: x, lng: y}
      if (locationObj.lat !== undefined && locationObj.lng !== undefined) {
        return [locationObj.lat, locationObj.lng];
      }
      
      // Handle object format {latitude: x, longitude: y}
      if (locationObj.latitude !== undefined && locationObj.longitude !== undefined) {
        return [locationObj.latitude, locationObj.longitude];
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing location data:", e);
      return null;
    }
  };

  const fetchLeaderboardData = async (user) => {
    try {
      setLoading(true);
      setError(null);
      
      // Try the full public API endpoint to get all companies
      try {
        console.log('Fetching full leaderboard data from public API...');
        const response = await fetch(`${API_BASE_URL}/api/public/leaderboard-full`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Public API response:', data);
          
          if (data.status === 'success' && data.data && data.data.companies) {
            await processLeaderboardData(data.data, user);
            return;
          }
        }
      } catch (publicApiError) {
        console.error('Error fetching from public API:', publicApiError);
      }
      
      // If public API fails, try the authenticated API endpoint
      try {
        console.log('Trying authenticated leaderboard API...');
        const headers = getAuthHeaders();
        if (headers) {
          const response = await fetch(`${API_BASE_URL}/api/leaderboard/leaderboard?timeframe=${selectedTimeframe}`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Authenticated API response:', data);
            
            if (data.status === 'success' && data.data) {
              await processAuthenticatedLeaderboardData(data.data, user);
              return;
            }
          }
        }
      } catch (apiError) {
        console.error('Error fetching from authenticated API:', apiError);
      }
      
      // If all API endpoints fail, fallback to direct Supabase queries
      console.log('API requests failed. Falling back to direct Supabase queries...');
      await fetchLeaderboardFromSupabase(user);
      
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setError("Failed to fetch leaderboard data");
    } finally {
      setLoading(false);
    }
  };
  
  // Process data from public API endpoint
  const processLeaderboardData = async (data, currentUser) => {
    const { companies, stats } = data;
    
    console.log(`Processing ${companies.length} companies from public API`);
    
    // Sort by waste per employee (ascending - lower is better)
    const sortedCompanies = [...companies].sort((a, b) => 
      parseFloat(a.wastePerEmployee || 0) - parseFloat(b.wastePerEmployee || 0)
    );
    
    // Get all business IDs to fetch their locations
    const businessIds = sortedCompanies.map(company => company.businessID).filter(Boolean);
    
    // Fetch business locations from Supabase
    let businessLocations = {};
    try {
      if (businessIds.length > 0) {
        const { data: locations, error } = await supabase
          .from('Businesses')
          .select('businessID, location')
          .in('businessID', businessIds);
        
        if (!error && locations) {
          businessLocations = locations.reduce((acc, business) => {
            if (business.location) {
              acc[business.businessID] = business.location;
            }
            return acc;
          }, {});
        }
      }
    } catch (error) {
      console.error('Error fetching business locations:', error);
    }
    
    // Process for display with ranks
    const processedData = sortedCompanies.map((company, index) => {
      // Calculate rank change (using the value from the API or default to 0)
      const rankChange = company.rankChange || 0;
      
      // Position (lower waste per employee is better)
      const position = index + 1;
      
      return {
        businessID: company.businessID,
        companyName: company.companyName || 'Unknown Company',
        rank: position,
        wastePerEmployee: parseFloat(company.wastePerEmployee || 0),
        formattedWastePerEmployee: parseFloat(company.wastePerEmployee || 0).toFixed(1),
        rankChange: rankChange,
        rankChangeIcon: rankChange === 0 ? '–' : 
                        rankChange > 0 ? <ArrowUp className="h-4 w-4" /> : 
                        <ArrowDown className="h-4 w-4" />,
        rankChangeClass: rankChange === 0 ? 'text-gray-500' : 
                         rankChange > 0 ? 'text-green-600' : 
                         'text-red-600',
        location: businessLocations[company.businessID] || null
      };
    });
    
    console.log('Processed leaderboard data:', processedData);
    setLeaderboardData(processedData);
    
    // Generate map points with parsed coordinates
    const mapData = processedData.map(business => {
      let position = null;
      let locationSource = 'default';
      
      // Check if business has real coordinates
      if (business.location) {
        const coords = parseLocation(business.location);
        if (coords) {
          position = coords;
          locationSource = 'database';
        }
      }
      
      // If no valid coordinates, use a default UK location based on rank
      if (!position) {
        // Use a default UK location (London)
        position = [51.5074, -0.1278];
      }
      
      return {
        id: business.businessID,
        name: business.companyName,
        rank: business.rank,
        wastePerEmployee: business.formattedWastePerEmployee,
        position: position,
        locationSource: locationSource,
        popupContent: `
          <div class="font-sans">
            <div class="font-bold">${business.companyName}</div>
            <div>Rank: #${business.rank}</div>
            <div>Waste/Employee: ${business.formattedWastePerEmployee} kg</div>
          </div>
        `,
      };
    });
    
    setMapPoints(mapData);
    
    // Update stats
    setStats({
      totalCompanies: processedData.length,
      averageWaste: stats.averageWastePerEmployee || '0.0',
      topPerformer: processedData[0]?.companyName || 'N/A',
      mostImproved: processedData
        .filter(d => d.rankChange > 0)
        .sort((a, b) => b.rankChange - a.rankChange)[0]?.companyName || 'N/A'
    });
  };
  
  // Process data from authenticated API endpoint
  const processAuthenticatedLeaderboardData = async (data, currentUser) => {
    console.log(`Processing ${data.length} companies from authenticated API`);
    
    // Get all business IDs to fetch their locations
    const businessIds = data.map(company => company.businessID).filter(Boolean);
    
    // Fetch business locations from Supabase
    let businessLocations = {};
    try {
      if (businessIds.length > 0) {
        const { data: locations, error } = await supabase
          .from('Businesses')
          .select('businessID, location')
          .in('businessID', businessIds);
        
        if (!error && locations) {
          businessLocations = locations.reduce((acc, business) => {
            if (business.location) {
              acc[business.businessID] = business.location;
            }
            return acc;
          }, {});
        }
      }
    } catch (error) {
      console.error('Error fetching business locations:', error);
    }
    
    // Process the data
    const processedData = data.map(company => {
      // Get rank change
      const rankChange = typeof company.rankChange === 'number' ? company.rankChange : 0;
      
      return {
        businessID: company.businessID,
        companyName: company.username || company.companyName || 'Unknown Company',
        rank: company.rank || 0,
        wastePerEmployee: parseFloat(company.wastePerEmployee || company.formattedWastePerEmployee || 0),
        formattedWastePerEmployee: parseFloat(company.formattedWastePerEmployee || company.wastePerEmployee || 0).toFixed(1),
        rankChange: rankChange,
        rankChangeIcon: rankChange === 0 ? '–' : 
                        rankChange > 0 ? <ArrowUp className="h-4 w-4" /> : 
                        <ArrowDown className="h-4 w-4" />,
        rankChangeClass: rankChange === 0 ? 'text-gray-500' : 
                         rankChange > 0 ? 'text-green-600' : 
                         'text-red-600',
        location: businessLocations[company.businessID] || null
      };
    });
    
    setLeaderboardData(processedData);
    
    // Generate map points with real coordinates where available
    const mapData = processedData.map(business => {
      let position = null;
      let locationSource = 'default';
      
      // Check if business has real coordinates
      if (business.location) {
        const coords = parseLocation(business.location);
        if (coords) {
          position = coords;
          locationSource = 'database';
        }
      }
      
      // If no valid coordinates, use a default UK location based on rank
      if (!position) {
        // Use a default UK location (London)
        position = [51.5074, -0.1278];
      }
      
      return {
        id: business.businessID,
        name: business.companyName,
        rank: business.rank,
        wastePerEmployee: business.formattedWastePerEmployee,
        position: position,
        locationSource: locationSource,
        popupContent: `
          <div class="font-sans">
            <div class="font-bold">${business.companyName}</div>
            <div>Rank: #${business.rank}</div>
            <div>Waste/Employee: ${business.formattedWastePerEmployee} kg</div>
          </div>
        `,
      };
    });
    
    setMapPoints(mapData);
    
    // Calculate stats
    const avgWastePerEmployee = (processedData.reduce((sum, company) => sum + parseFloat(company.wastePerEmployee || 0), 0) / processedData.length).toFixed(1);
    const topPerformer = processedData.sort((a, b) => a.wastePerEmployee - b.wastePerEmployee)[0]?.companyName || 'N/A';
    const mostImproved = processedData
      .filter(d => d.rankChange > 0)
      .sort((a, b) => b.rankChange - a.rankChange)[0]?.companyName || 'N/A';
    
    setStats({
      totalCompanies: processedData.length,
      averageWaste: avgWastePerEmployee,
      topPerformer: topPerformer,
      mostImproved: mostImproved
    });
  };

  // Fallback to fetch leaderboard from Supabase
  const fetchLeaderboardFromSupabase = async (user) => {
    try {
      console.log('Fetching leaderboard directly from Supabase');
      
      // 1. Get all businesses
      const { data: businesses, error: businessError } = await supabase
        .from('Businesses')
        .select('businessID, companyName, location');
      
      if (businessError) {
        throw new Error(`Failed to fetch businesses: ${businessError.message}`);
      }
      
      // 2. Get employee counts per business
      const { data: users, error: userError } = await supabase
        .from('Users')
        .select('businessID');
      
      if (userError) {
        throw new Error(`Failed to fetch users: ${userError.message}`);
      }
      
      // Count employees per business
      const employeeCounts = {};
      users.forEach(user => {
        const businessID = user.businessID;
        employeeCounts[businessID] = (employeeCounts[businessID] || 0) + 1;
      });
      
      // 3. Get waste logs to calculate waste per business
      const { data: wasteLogs, error: wasteError } = await supabase
        .from('Wastelogs')
        .select('businessID, weight');
      
      if (wasteError) {
        throw new Error(`Failed to fetch waste logs: ${wasteError.message}`);
      }
      
      // Calculate total waste per business
      const wastePerBusiness = {};
      wasteLogs.forEach(log => {
        const businessID = log.businessID;
        const weight = parseFloat(log.weight || 0);
        wastePerBusiness[businessID] = (wastePerBusiness[businessID] || 0) + weight;
      });
      
      // Create leaderboard entries
      const leaderboardEntries = [];
      businesses.forEach(business => {
        const businessID = business.businessID;
        const employeeCount = employeeCounts[businessID] || 1; // Default to 1 to avoid division by zero
        const totalWaste = wastePerBusiness[businessID] || 0;
        
        if (totalWaste > 0) { // Only include businesses with waste data
          const wastePerEmployee = totalWaste / employeeCount;
          
          leaderboardEntries.push({
            businessID: businessID,
            companyName: business.companyName || 'Unknown Company',
            employeeCount: employeeCount,
            totalWaste: totalWaste,
            wastePerEmployee: wastePerEmployee,
            location: business.location
          });
        }
      });
      
      // Sort by waste per employee (ascending - lower is better)
      leaderboardEntries.sort((a, b) => a.wastePerEmployee - b.wastePerEmployee);
      
      // Process for display with ranks
      const processedData = leaderboardEntries.map((entry, index) => {
        return {
          businessID: entry.businessID,
          companyName: entry.companyName,
          rank: index + 1,
          wastePerEmployee: entry.wastePerEmployee,
          formattedWastePerEmployee: entry.wastePerEmployee.toFixed(1),
          rankChange: 0, // No historical data for rank change
          rankChangeIcon: <RefreshCw className="h-4 w-4" />,
          rankChangeClass: 'text-gray-500',
          location: entry.location
        };
      });
      
      console.log(`Processed ${processedData.length} entries from Supabase`);
      setLeaderboardData(processedData);
      
      // Generate map points with real coordinates where available
      const mapData = processedData.map(business => {
        let position = null;
        let locationSource = 'default';
        
        // Check if business has real coordinates
        if (business.location) {
          const coords = parseLocation(business.location);
          if (coords) {
            position = coords;
            locationSource = 'database';
          }
        }
        
        // If no valid coordinates, use a default UK location based on rank
        if (!position) {
          // Use a default UK location (London)
          position = [51.5074, -0.1278];
        }
        
        return {
          id: business.businessID,
          name: business.companyName,
          rank: business.rank,
          wastePerEmployee: business.formattedWastePerEmployee,
          position: position,
          locationSource: locationSource,
          popupContent: `
            <div class="font-sans">
              <div class="font-bold">${business.companyName}</div>
              <div>Rank: #${business.rank}</div>
              <div>Waste/Employee: ${business.formattedWastePerEmployee} kg</div>
            </div>
          `,
        };
      });
      
      setMapPoints(mapData);
      
      // Calculate stats
      const avgWastePerEmployee = (processedData.reduce((sum, company) => sum + company.wastePerEmployee, 0) / processedData.length).toFixed(1);
      
      setStats({
        totalCompanies: processedData.length,
        averageWaste: avgWastePerEmployee,
        topPerformer: processedData[0]?.companyName || 'N/A',
        mostImproved: 'N/A' // No historical data for improvement
      });
      
    } catch (error) {
      console.error("Error fetching from Supabase:", error);
      setError("Could not fetch leaderboard data. Please try again later.");
      
      // Set some default empty states
      setLeaderboardData([]);
      setMapPoints([]);
      setStats({
        totalCompanies: 0,
        averageWaste: 0,
        topPerformer: 'N/A',
        mostImproved: 'N/A'
      });
    }
  };

  const applyFilters = () => {
    if (!leaderboardData || leaderboardData.length === 0) {
      setFilteredData([]);
      return;
    }

    let filtered = [...leaderboardData];
    
    // Keep default sort by rank
    filtered.sort((a, b) => a.rank - b.rank);

    setFilteredData(filtered);
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Rank', 'Company', 'Waste/Employee (kg)', 'Change'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(company => [
        company.rank || '',
        company.companyName || '',
        company.formattedWastePerEmployee || '0',
        company.rankChange === '-' ? '-' : company.rankChange || '0'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leaderboard-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printTable = () => window.print();

  const getMedal = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-700" />;
    return null;
  };

  const handleBack = () => router.push("/dashboard");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    router.push("/login");
  };

  const refreshData = async () => {
    setLoading(true);
    await fetchLeaderboardData(currentUser);
    setLoading(false);
  };

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <div className="text-lg text-red-500 mb-4">{error}</div>
          <button onClick={checkAuthAndFetchData} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between mb-6">
            <button onClick={handleBack} className="bg-white/20 text-white p-3 rounded-full shadow-lg hover:bg-white/30 transition-colors flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <button onClick={handleLogout} className="bg-white/20 text-white p-3 rounded-full shadow-lg hover:bg-white/30 transition-colors flex items-center">
              <span className="font-medium mr-2">Logout</span>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Waste Efficiency Leaderboard</h1>
          <p className="text-green-100">Rankings based on waste per employee</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Out of All Companies</div>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Avg Waste/Employee</div>
              <div className="text-2xl font-bold">{stats.averageWaste} kg</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 flex flex-col">
              <div className="text-green-100 text-sm mb-1">Top Performer</div>
              <div className="text-xl font-bold truncate">{stats.topPerformer}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-8 px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
              <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Company Locations
                </h2>
              </div>
              <div className="p-4 flex-grow">
                <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                  <LeafletMap 
                    points={mapPoints} 
                    userBusinessId={currentUser?.businessID}
                    highlightUserBusiness={true}
                  />
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  {mapPoints.some(point => point.locationSource === 'database') ? (
                    "The map shows the locations of participating companies in the leaderboard."
                  ) : (
                    "The map shows approximate locations for visualization purposes."
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2" ref={leaderboardTopRef}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
              <div className="border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center">
                  <Trophy className="h-6 w-6 mr-2" />
                  Waste Efficiency Rankings
                </h2>
                <button 
                  onClick={refreshData}
                  className="bg-white/20 text-white p-2 rounded-full shadow-lg hover:bg-white/30 transition-colors flex items-center"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToCSV} className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                  <button onClick={printTable} className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-1">
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waste/Employee (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageData().length > 0 ? (
                      getCurrentPageData().map((company, index) => (
                        <tr
                          key={company.businessID || index}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors ${currentUser && company.businessID === currentUser.businessID ? 'bg-green-50 hover:bg-green-100' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getMedal(company.rank) || (
                                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-gray-700 font-medium text-sm">{company.rank}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Building className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{company.companyName}</div>
                                {currentUser && company.businessID === currentUser.businessID && (
                                  <span className="px-2 py-0.5 text-xs leading-tight font-semibold rounded-full bg-green-100 text-green-800">Your Company</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">{company.formattedWastePerEmployee} kg</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <Trophy className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-gray-500 mb-2">No companies found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {filteredData.length > pageSize && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{' '}
                    <span className="font-medium">{filteredData.length}</span> companies
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => goToPage(1)} disabled={currentPage === 1} className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'} border border-gray-300`}>First</button>
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className={`p-1 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'} border border-gray-300`}><ArrowLeft className="h-5 w-5" /></button>
                    <div className="px-4 py-1 bg-white border border-gray-300 rounded-md">
                      <span className="text-gray-700">{currentPage}</span>
                      <span className="text-gray-400"> / {totalPages}</span>
                    </div>
                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className={`p-1 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'} border border-gray-300`}><ArrowRight className="h-5 w-5" /></button>
                    <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'} border border-gray-300`}>Last</button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-green-600" />
                Performance Insights
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-600 mb-4">
                  {currentUser && filteredData.some(company => company.businessID === currentUser.businessID) ? (
                    (() => {
                      const yourCompany = filteredData.find(company => company.businessID === currentUser.businessID);
                      if (yourCompany) {
                        const rank = yourCompany.rank;
                        const totalCompanies = filteredData.length;
                        const percentile = Math.round((totalCompanies - rank) / totalCompanies * 100);
                        return (
                          <>
                            <span className="font-semibold">{businessName}</span> is ranked <span className="font-semibold">#{rank}</span> out of {totalCompanies} companies, in the top <span className="font-semibold">{percentile}%</span> for waste efficiency per employee.
                            {yourCompany.rankChange === '-' ? (
                              <> This is your first appearance in this timeframe.</>
                            ) : yourCompany.rankChange > 0 ? (
                              <> Your rank improved by <span className="text-green-600 font-semibold">{yourCompany.rankChange} position{yourCompany.rankChange !== 1 ? 's' : ''}</span>.</>
                            ) : yourCompany.rankChange < 0 ? (
                              <> Your rank dropped by <span className="text-red-600 font-semibold">{Math.abs(yourCompany.rankChange)} position{Math.abs(yourCompany.rankChange) !== 1 ? 's' : ''}</span>.</>
                            ) : (
                              <> Your rank remains unchanged.</>
                            )}
                          </>
                        );
                      }
                      return 'Your company is not in this timeframes leaderboard.';
                    })()
                  ) : (
                    <>Companies are ranked by waste per employee (lower is better), providing a fair comparison across different sizes.</>
                  )}
                </p>
                <div className="flex flex-col md:flex-row md:items-center justify-between mt-4">
                  <div className="flex items-center mb-2 md:mb-0">
                    <div className="bg-green-100 p-2 rounded-full">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="ml-2 text-sm text-gray-600">Lower waste/employee = Higher rank</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .leaflet-container { z-index: 1; }
        @media print {
          body * { visibility: hidden; }
          .container, .container * { visibility: visible; }
          button, .actions, input, select { display: none !important; }
          .container { position: absolute; left: 0; top: 0; width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default LeaderboardPage;