    // src/app/dashtest/page.js
    'use client';
    import { useState, useEffect } from 'react';
    import { supabase } from '@/lib/supabase';
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
    import { PieChart, Pie, Cell } from 'recharts';
    import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

    export default function DashTest() {
      const [testResults, setTestResults] = useState([]);
      const [loading, setLoading] = useState(false);
      const [currentUser, setCurrentUser] = useState(null);
      const [debugLog, setDebugLog] = useState([]);
      const [visualData, setVisualData] = useState({
        metrics: null,
        wasteChart: null,
        wasteTypes: null,
        recentEntries: null,
        leaderboard: null
      });

      // Colors for charts
      const COLORS = ['#4CAF50', '#81C784', '#2196F3', '#388E3C', '#64B5F6'];

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

      const addDebugLog = (message) => {
        setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
      };

      // Helper to format API response for display
      const formatResponse = (response) => {
        try {
          return typeof response === 'string' 
            ? response 
            : JSON.stringify(response, null, 2);
        } catch (e) {
          return 'Could not format response';
        }
      };

      // Helper to check if data is just default values
      const isDefaultData = (data, type) => {
        if (!data) return true;
        
        switch(type) {
          case 'metrics':
            return data.totalWaste === 0 && data.co2Emissions === 0;
          case 'wasteChart':
            // Check if all waste values are 0
            return !data.some(item => item.waste > 0);
          case 'wasteTypes':
            // Check if any real waste type values
            return data.every(item => item.value === 0);
          case 'leaderboard':
            // Check if company names are all "Unknown"
            return data.every(item => item.companyName === 'Unknown');
          case 'recentEntries':
            // Check if there are any entries
            return data.length === 0;
          default:
            return false;
        }
      };

      const tests = {
        async checkAuth() {
          addDebugLog('Checking current authentication status...');
          
          // Try to get the email first from local storage, then from Supabase
          let userEmail = localStorage.getItem('userEmail');
          let token = localStorage.getItem('authToken');
          let userId = localStorage.getItem('userId');
          
          if (!userEmail || !token || !userId) {
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
              addDebugLog('No valid authentication found. Please login first.');
              return {
                name: 'Authentication Check',
                success: false,
                error: 'Not authenticated'
              };
            }
          }
          
          // Get the user info to determine if admin
          const { data: userData } = await supabase
            .from('Users')
            .select('*')
            .eq('email', userEmail)
            .single();
            
          if (userData) {
            localStorage.setItem('isAdmin', userData.admin);
            addDebugLog(`User authenticated as: ${userEmail} (${userData.admin ? 'Admin' : 'Employee'})`);
          }
          
          return {
            name: 'Authentication Check',
            success: true,
            data: {
              userId,
              userEmail,
              isAdmin: userData?.admin || false
            }
          };
        },

        async fetchMetricsData() {
          addDebugLog('Testing metrics data fetch...');
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            const response = await fetch(`${API_BASE_URL}/api/dashboard/metrics`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-ID': userId,
                'User-Email': userEmail,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`API error: ${response.status} ${text}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success' && data.data) {
              addDebugLog(`Metrics data retrieved successfully`);
              setVisualData(prev => ({ ...prev, metrics: data.data }));
              
              // Check if this is just default data
              const isDefault = isDefaultData(data.data, 'metrics');
              if (isDefault) {
                addDebugLog('⚠️ Warning: Metrics data contains only default values');
                return {
                  name: 'Metrics Data Fetch',
                  success: true,
                  warning: 'Data contains only default/zero values',
                  data: data.data
                };
              }
              
              return {
                name: 'Metrics Data Fetch',
                success: true,
                data: data.data
              };
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            addDebugLog(`Metrics data fetch failed: ${error.message}`);
            return {
              name: 'Metrics Data Fetch',
              success: false,
              error: error.message
            };
          }
        },

        async fetchWasteChartData() {
          addDebugLog('Testing waste chart data fetch...');
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            // Test all timeframes
            const timeframes = ['day', 'month', 'quarter', 'year'];
            const results = {};
            let allDefault = true;
            
            for (const timeframe of timeframes) {
              addDebugLog(`Fetching waste chart data for timeframe: ${timeframe}`);
              
              const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-chart?timeframe=${timeframe}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'User-ID': userId,
                  'User-Email': userEmail,
                  'Content-Type': 'application/json'
                },
                credentials: 'include'
              });
              
              if (!response.ok) {
                const text = await response.text();
                throw new Error(`API error for ${timeframe}: ${response.status} ${text}`);
              }
              
              const data = await response.json();
              
              if (data.status === 'success') {
                results[timeframe] = data.data;
                addDebugLog(`Chart data for ${timeframe} retrieved (${data.data.length} data points)`);
                
                // Check if any real data is present
                if (!isDefaultData(data.data, 'wasteChart')) {
                  allDefault = false;
                }
              } else {
                addDebugLog(`Invalid response format for ${timeframe}`);
              }
            }
            
            // Set month timeframe data for visualization
            setVisualData(prev => ({ ...prev, wasteChart: results.month }));
            
            if (allDefault) {
              addDebugLog('⚠️ Warning: All waste chart data contains only zero values');
              return {
                name: 'Waste Chart Data Fetch',
                success: true,
                warning: 'Data contains only default/zero values',
                data: results
              };
            }
            
            return {
              name: 'Waste Chart Data Fetch',
              success: true,
              data: results
            };
          } catch (error) {
            addDebugLog(`Waste chart data fetch failed: ${error.message}`);
            return {
              name: 'Waste Chart Data Fetch',
              success: false,
              error: error.message
            };
          }
        },

        async fetchWasteTypesData() {
          addDebugLog('Testing waste types data fetch...');
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            const response = await fetch(`${API_BASE_URL}/api/dashboard/waste-types`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-ID': userId,
                'User-Email': userEmail,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`API error: ${response.status} ${text}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              addDebugLog(`Waste types data retrieved (${data.data.length} waste types)`);
              setVisualData(prev => ({ ...prev, wasteTypes: data.data }));
              
              if (isDefaultData(data.data, 'wasteTypes')) {
                addDebugLog('⚠️ Warning: Waste types data contains only default values');
                return {
                  name: 'Waste Types Data Fetch',
                  success: true,
                  warning: 'Data contains only default/zero values or predefined fallback types',
                  data: data.data
                };
              }
              
              return {
                name: 'Waste Types Data Fetch',
                success: true,
                data: data.data
              };
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            addDebugLog(`Waste types data fetch failed: ${error.message}`);
            return {
              name: 'Waste Types Data Fetch',
              success: false,
              error: error.message
            };
          }
        },

        async fetchLeaderboardData() {
          addDebugLog('Testing leaderboard data fetch...');
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            const response = await fetch(`${API_BASE_URL}/api/employee/leaderboard`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-ID': userId,
                'User-Email': userEmail,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`API error: ${response.status} ${text}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              addDebugLog(`Leaderboard data retrieved (${data.data.length} entries)`);
              setVisualData(prev => ({ ...prev, leaderboard: data.data }));
              
              if (isDefaultData(data.data, 'leaderboard')) {
                addDebugLog('⚠️ Warning: Leaderboard data has "Unknown" company names');
                return {
                  name: 'Leaderboard Data Fetch',
                  success: true,
                  warning: 'Company names are showing as "Unknown"',
                  data: data.data
                };
              }
              
              return {
                name: 'Leaderboard Data Fetch',
                success: true,
                data: data.data
              };
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            addDebugLog(`Leaderboard data fetch failed: ${error.message}`);
            return {
              name: 'Leaderboard Data Fetch',
              success: false,
              error: error.message
            };
          }
        },

        async fetchRecentEntriesAdmin() {
          addDebugLog('Testing recent entries (admin view) data fetch...');
          
          // Check if user is admin
          const isAdmin = localStorage.getItem('isAdmin') === 'true';
          
          if (!isAdmin) {
            addDebugLog('Current user is not an admin, skipping admin-only test');
            return {
              name: 'Recent Entries (Admin View)',
              success: false,
              error: 'Current user is not an admin'
            };
          }
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            const response = await fetch(`${API_BASE_URL}/api/admin/employee-table`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-ID': userId,
                'User-Email': userEmail,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`API error: ${response.status} ${text}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              addDebugLog(`Admin entries data retrieved (${data.data.length} entries)`);
              setVisualData(prev => ({ ...prev, recentEntries: data.data }));
              
              if (isDefaultData(data.data, 'recentEntries')) {
                addDebugLog('⚠️ Warning: No recent entries found for admin view');
                return {
                  name: 'Recent Entries (Admin View)',
                  success: true,
                  warning: 'No entries found for this business',
                  data: data.data
                };
              }
              
              return {
                name: 'Recent Entries (Admin View)',
                success: true,
                data: data.data
              };
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            addDebugLog(`Admin entries data fetch failed: ${error.message}`);
            return {
              name: 'Recent Entries (Admin View)',
              success: false,
              error: error.message
            };
          }
        },

        async fetchRecentEntriesEmployee() {
          addDebugLog('Testing recent entries (employee view) data fetch...');
          
          try {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            
            const response = await fetch(`${API_BASE_URL}/api/employee/history`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-ID': userId,
                'User-Email': userEmail,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`API error: ${response.status} ${text}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              addDebugLog(`Employee entries data retrieved (${data.data.length} entries)`);
              // Don't override the admin view if that's what we're using
              if (!visualData.recentEntries) {
                setVisualData(prev => ({ ...prev, recentEntries: data.data }));
              }
              
              if (isDefaultData(data.data, 'recentEntries')) {
                addDebugLog('⚠️ Warning: No recent entries found for employee view');
                return {
                  name: 'Recent Entries (Employee View)',
                  success: true,
                  warning: 'No entries found for this user',
                  data: data.data
                };
              }
              
              return {
                name: 'Recent Entries (Employee View)',
                success: true,
                data: data.data
              };
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            addDebugLog(`Employee entries data fetch failed: ${error.message}`);
            return {
              name: 'Recent Entries (Employee View)',
              success: false,
              error: error.message
            };
          }
        }
      };

      const runTests = async () => {
        setLoading(true);
        setDebugLog([]);
        setVisualData({
          metrics: null,
          wasteChart: null,
          wasteTypes: null,
          recentEntries: null,
          leaderboard: null
        });
        
        const results = [];
        
        addDebugLog('Starting dashboard API tests...');
        
        // Always check auth first
        const authResult = await tests.checkAuth();
        results.push(authResult);
        
        if (authResult.success) {
          // Run other tests in parallel for efficiency
          const testPromises = [
            tests.fetchMetricsData(),
            tests.fetchWasteChartData(),
            tests.fetchWasteTypesData(),
            tests.fetchLeaderboardData(),
            tests.fetchRecentEntriesAdmin(),
            tests.fetchRecentEntriesEmployee()
          ];
          
          const testResults = await Promise.all(testPromises);
          results.push(...testResults);
        }
        
        setTestResults(results);
        setLoading(false);
      };

      const formatDate = (dateString) => {
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
          return dateString;
        }
      };

      // Get current user on mount
      useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          setCurrentUser(user);
          if (user) {
            addDebugLog(`Found existing user session: ${user.email}`);
          } else {
            addDebugLog('No authenticated user found');
          }
        });
      }, []);

      return (
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard API Testing Panel</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Current Status:</h2>
            <p>User: {currentUser ? currentUser.email : 'Not logged in'}</p>
          </div>

          <div className="space-x-4 mb-8">
            <button
              onClick={runTests}
              disabled={loading}
              className={`px-4 py-2 rounded ${
                loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } text-white flex items-center gap-2`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4" />
                  Running Tests...
                </>
              ) : 'Run Dashboard Tests'}
            </button>

            <button
              onClick={() => window.location.href = '/auth-test'}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Go to Auth Test
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Test Results Column */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>
              {testResults.length > 0 && (
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded ${
                        result.success && !result.warning ? 'bg-green-50' : 
                        result.warning ? 'bg-yellow-50' : 'bg-red-50'
                      }`}
                    >
                      <h3 className="font-semibold flex items-center gap-2">
                        {result.success && !result.warning ? (
                          <span className="text-green-500">✓</span>
                        ) : result.warning ? (
                          <span className="text-yellow-500">⚠️</span>
                        ) : (
                          <span className="text-red-500">✗</span>
                        )}
                        {result.name}
                      </h3>
                      
                      {result.error && (
                        <p className="mt-2 text-red-600 text-sm flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Error: {result.error}
                        </p>
                      )}
                      
                      {result.warning && (
                        <p className="mt-2 text-yellow-600 text-sm flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Warning: {result.warning}
                        </p>
                      )}
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                            View Response Data
                          </summary>
                          <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded h-40">
                            {formatResponse(result.data)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Debug Log Column */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Debug Log</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 h-[600px] overflow-auto">
                {debugLog.map((log, index) => (
                  <div key={index} className={`text-sm font-mono mb-1 ${log.includes('Warning') ? 'text-yellow-600 font-bold' : ''}`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Visualizations */}
          <h2 className="text-lg font-semibold mb-4">Data Visualizations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Cards */}
            {visualData.metrics && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Dashboard Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-sm text-gray-600">CO2 Emissions</div>
                    <div className="text-xl font-bold">{visualData.metrics.co2Emissions} kg</div>
                    <div className="text-xs text-gray-500">
                      Change: {visualData.metrics.co2Change}%
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Total Waste</div>
                    <div className="text-xl font-bold">{visualData.metrics.totalWaste} kg</div>
                    <div className="text-xs text-gray-500">
                      Change: {visualData.metrics.wasteChange}%
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Most Recent</div>
                    <div className="text-xl font-bold">{visualData.metrics.mostRecentLog.weight} kg</div>
                    <div className="text-xs text-gray-500">
                      on {formatDate(visualData.metrics.mostRecentLog.date)}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Current Rank</div>
                    <div className="text-xl font-bold">#{visualData.metrics.currentRank || '-'}</div>
                    <div className="text-xs text-gray-500">
                      Change: {visualData.metrics.rankChange || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waste Chart */}
            {visualData.wasteChart && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Waste Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visualData.wasteChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="waste" 
                        name="Waste (kg)" 
                        stroke="#4CAF50" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Waste Types Pie Chart */}
            {visualData.wasteTypes && visualData.wasteTypes.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Waste by Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visualData.wasteTypes}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {visualData.wasteTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Entries Table */}
            {visualData.recentEntries && visualData.recentEntries.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Recent Entries</h3>
                <div className="overflow-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visualData.recentEntries.map((entry, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(entry.created_at)}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.username || 'Unknown'}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                            {entry.wasteType || 'Mixed'}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                            {entry.weight ? `${parseFloat(entry.weight).toFixed(1)} kg` : '0 kg'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }