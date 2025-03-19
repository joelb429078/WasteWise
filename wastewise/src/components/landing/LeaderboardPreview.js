'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Trophy, Award, Medal, ArrowUp, ArrowDown, RefreshCw, ExternalLink } from 'lucide-react';
import { getMockLeaderboardData } from '@/components/data/mockData';

export const LeaderboardPreview = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageWastePerEmployee: 4.2, // kg per employee (lower is better)
    totalCompanies: 124
  });

  // Reliable fallback data with correct waste per employee values (lower is better)
  const fallbackData = [
    { id: 1, company: "EcoCare Consulting", position: 1, wastePerEmployee: 1.8, change: 1, wasteType: "Mixed" },
    { id: 2, company: "GreenTech Solutions", position: 2, wastePerEmployee: 3.2, change: -1, wasteType: "Paper" },
    { id: 3, company: "Urban Recyclers Ltd", position: 3, wastePerEmployee: 4.1, change: 2, wasteType: "Plastic" },
    { id: 4, company: "Sustainable Foods Inc", position: 4, wastePerEmployee: 4.8, change: -2, wasteType: "Food" },
    { id: 5, company: "Green Planet Logistics", position: 5, wastePerEmployee: 5.3, change: 0, wasteType: "Mixed" }
  ];

  // Attempt to fetch leaderboard data with proper auth
  useEffect(() => {
    const fetchLeaderboardDataOLD= async () => {
      try {
        setLoading(true);
        
        // Use the same API endpoint as in your LeaderboardPage
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        
        // Try to get auth data from localStorage 
        // (this will only work if the user is logged in)
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        
        // Only attempt API call if we have authentication data
        if (token && userId && userEmail) {
          const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard?timeframe=season`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-ID': userId,
              'User-Email': userEmail,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.length > 0) {
              // Process the data - companies with lower waste per employee are ranked higher
              const processedData = data.data
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
                    company: entry.companyName || entry.username || `Company ${index + 1}`,
                    position: currentRank,
                    wastePerEmployee: parseFloat(entry.formattedWastePerEmployee || entry.wastePerEmployee || 0).toFixed(1),
                    change: rankChange,
                    wasteType: entry.wasteType || "Mixed"
                  };
                });
              
              // Update data if we successfully processed it
              if (processedData.length > 0) {
                setLeaderboardData(processedData);
                
                // Calculate average waste per employee
                const avgWaste = data.data.reduce((sum, item) => {
                  return sum + parseFloat(item.wastePerEmployee || item.formattedWastePerEmployee || 0);
                }, 0) / data.data.length;
                
                // Update the stats with real data
                setStats({
                  totalCompanies: data.data.length || 124,
                  averageWastePerEmployee: avgWaste.toFixed(1) || 4.2
                });
                
                setLoading(false);
                return; // Exit the function if successful
              }
            }
          }
        }
        
        // If we get here, either there's no auth data or the API call failed
        // Use fallback data without showing an error
        console.log("Using fallback data for leaderboard preview");
        setLeaderboardData(fallbackData);
        setLoading(false);
        
      } catch (error) {
        // Silent error handling - just use fallback data
        console.log("Error in leaderboard preview, using fallback data:", error);
        setLeaderboardData(fallbackData);
        setLoading(false);
      }
    };

    fetchLeaderboardDataOLD();
  }, []);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Get mock data directly from localStorage
        const leaderboardData = getMockLeaderboardData().slice(0, 5);
        
        // Calculate average waste per employee
        const avgWaste = leaderboardData.reduce((sum, item) => 
          sum + parseFloat(item.formattedWastePerEmployee || item.wastePerEmployee || 0), 0) / leaderboardData.length;
        
        // Format data for this component
        const processedData = leaderboardData.map(entry => ({
          id: entry.businessID,
          company: entry.companyName,
          position: entry.rank,
          wastePerEmployee: parseFloat(entry.formattedWastePerEmployee || entry.wastePerEmployee || 0),
          change: entry.rankChange,
          wasteType: entry.wasteType || "Mixed"
        }));
        
        setLeaderboardData(processedData);
        
        // Update stats
        setStats({
          totalCompanies: getMockLeaderboardData().length,
          averageWastePerEmployee: avgWaste.toFixed(1)
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error in leaderboard preview:', error);
        setLoading(false);
      }
    };
  
    fetchLeaderboardData();
  }, []);

  // Helper function to render rank change
  const renderRankChange = (change) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <ArrowUp className="h-4 w-4 mr-1" />
          <span>+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <ArrowDown className="h-4 w-4 mr-1" />
          <span>{change}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500 text-sm">
          <span>No change</span>
        </div>
      );
    }
  };

  // Helper function to get medal icon based on position
  const getMedalIcon = (position) => {
    switch(position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return null;
    }
  };

  // Helper function to get waste type chip color
  const getWasteTypeColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'paper':
        return 'bg-blue-100 text-blue-800';
      case 'plastic':
        return 'bg-red-100 text-red-800';
      case 'food':
        return 'bg-green-100 text-green-800';
      case 'glass':
        return 'bg-purple-100 text-purple-800';
      case 'metal':
        return 'bg-yellow-100 text-yellow-800';
      case 'electronics':
      case 'electronic':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div id="leaderboard-section" className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
          <div className="col-span-5">
            <div className="text-left">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Leading in Sustainability
              </h2>
              <p className="mt-4 text-lg text-gray-500 max-w-lg">
                See how businesses are making a difference. Our public leaderboard showcases top performers with the lowest waste per employee.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/public-info" 
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition duration-300 transform hover:scale-105"
                >
                  View Full Leaderboard
                </Link>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="rounded-xl shadow-lg p-6 bg-gradient-to-br from-green-50 to-green-100 transition duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{stats.averageWastePerEmployee}</p>
                  <p className="mt-2 text-sm font-medium text-gray-600">Avg. Waste per Employee (kg)</p>
                </div>
              </div>
              
              <div className="rounded-xl shadow-lg p-6 bg-gradient-to-br from-blue-50 to-blue-100 transition duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-blue-600">{stats.totalCompanies}</p>
                  <p className="mt-2 text-sm font-medium text-gray-600">Participating Companies</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-7 mt-12 lg:mt-0">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transform transition duration-300 hover:shadow-2xl">
              <div className="px-6 py-5 bg-gradient-to-r from-green-600 to-green-700 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Top Performers
                  </h3>
                  <Link 
                    href="/public-info" 
                    className="text-xs font-medium text-white bg-white/20 px-2 py-1 rounded flex items-center hover:bg-white/30 transition-colors"
                  >
                    <span>Full Leaderboard</span>
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              </div>
              
              <div>
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <RefreshCw className="h-8 w-8 text-green-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading leaderboard data...</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {leaderboardData.map((company, index) => (
                      <li 
                        key={company.id || index} 
                        className={`px-6 py-4 hover:bg-gray-50 transition-colors ${company.position <= 3 ? 'bg-green-50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-4">
                              {getMedalIcon(company.position) || (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                                  {company.position}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-base font-medium text-gray-900">{company.company}</h4>
                              <div className="flex items-center mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full mr-2 ${getWasteTypeColor(company.wasteType)}`}>
                                  {company.wasteType || 'Mixed'}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {company.wastePerEmployee} kg per employee
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center">
                            {renderRankChange(company.change)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <Link 
                  href="/public-info" 
                  className="text-sm font-medium text-green-600 hover:text-green-500 flex items-center justify-center"
                >
                  View full sustainability rankings
                  <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};