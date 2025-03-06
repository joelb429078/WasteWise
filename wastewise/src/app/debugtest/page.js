// src/app/debugtest/page.js
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Play, Database, Plus, Check, X } from 'lucide-react';

export default function DebugTest() {
  const [currentUser, setCurrentUser] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  const addDebugLog = (message) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
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
            .select('admin')
            .eq('email', userEmail)
            .single();
          
          if (data) {
            localStorage.setItem('isAdmin', data.admin);
          }
        } else {
          // No valid session found
          addDebugLog("No valid authentication found. Please login first.");
          return null;
        }
      }
      
      addDebugLog(`Auth check successful: ${userId}, ${userEmail}`);
      return { token, userId, userEmail };
    } catch (error) {
      addDebugLog(`Auth check error: ${error.message}`);
      return null;
    }
  };

  // Fetch table info
  const fetchTableInfo = async () => {
    setLoading(true);
    addDebugLog('Fetching table information...');
    setResults(null);
    
    try {
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
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/debug-info`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} ${text}`);
      }
      
      const data = await response.json();
      addDebugLog('Table information retrieved successfully');
      setResults(data);
    } catch (error) {
      addDebugLog(`Error fetching table info: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test Wastelogs
  const testWastelogs = async () => {
    setLoading(true);
    addDebugLog('Testing Wastelogs queries...');
    setResults(null);
    
    try {
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
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/debug-info`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} ${text}`);
      }
      
      const data = await response.json();
      addDebugLog('Wastelogs test complete');
      setResults(data);
    } catch (error) {
      addDebugLog(`Error testing wastelogs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add test data
  const addTestData = async (count = 5) => {
    setLoading(true);
    addDebugLog(`Adding ${count} test waste log entries...`);
    
    try {
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
      
      const response = await fetch(`${API_BASE_URL}/api/debug/add-test-data?count=${count}`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} ${text}`);
      }
      
      const data = await response.json();
      addDebugLog(`Successfully added ${count} test entries`);
      setResults(data);
      
      // Refresh wastelogs test after adding data
      await testWastelogs();
    } catch (error) {
      addDebugLog(`Error adding test data: ${error.message}`);
    } finally {
      setLoading(false);
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

  // Helper function to format JSON for display
  const formatJson = (json) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return 'Could not format JSON';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Debug Tool</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Status:</h2>
        <p>User: {currentUser ? currentUser.email : 'Not logged in'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={fetchTableInfo}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Database className="h-5 w-5" />}
          Fetch Table Info
        </button>
        
        <button
          onClick={testWastelogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Play className="h-5 w-5" />}
          Test Wastelogs
        </button>
        
        <button
          onClick={() => addTestData(5)}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
          Add 5 Test Entries
        </button>
        
        <button
          onClick={() => addTestData(20)}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-purple-800 hover:bg-purple-900 text-white disabled:bg-gray-400"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
          Add 20 Test Entries
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debug Log Column */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Debug Log</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 h-[600px] overflow-auto">
            {debugLog.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Results Column */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 h-[600px] overflow-auto">
            {results ? (
              <div>
                <div className="mb-2 flex items-center">
                  <span className="font-semibold mr-2">Status:</span> 
                  {results.status === 'success' ? (
                    <span className="text-green-600 flex items-center">
                      <Check className="h-4 w-4 mr-1" /> Success
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <X className="h-4 w-4 mr-1" /> Error
                    </span>
                  )}
                </div>
                <pre className="text-xs">{formatJson(results.data)}</pre>
              </div>
            ) : (
              <p className="text-gray-500">Run a test to see results here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}