// src/app/auth-test/page.js
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  const addDebugLog = (message) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const tests = {
    async checkConnection() {
      addDebugLog('Testing database connection...');
      const { data, error } = await supabase
        .from('Users')
        .select('count')
        .single();
      
      addDebugLog(`Connection test result: ${error ? 'Failed' : 'Success'}`);
      return {
        name: 'Database Connection',
        success: !error,
        data,
        error
      };
    },

    async testUserFetch() {
      addDebugLog('Testing user fetch...');
      const { data, error } = await supabase
        .from('Users')
        .select('*');
      
      addDebugLog(`User fetch result: Found ${data?.length || 0} users`);
      return {
        name: 'Fetch Users',
        success: !error && data?.length > 0,
        data: data?.length || 0,
        error
      };
    },

    async testSignup() {
        addDebugLog('Testing signup...');
        
        try {
          // Sign out any existing session
          await supabase.auth.signOut();
          addDebugLog('Cleared any existing sessions');
      
          // Remove any existing user first
          const { data: existingUser } = await supabase
            .from('Users')
            .select('*')
            .eq('email', 'joelbiju04@gmail.com')
            .single();
      
          if (existingUser) {
            addDebugLog('Found existing user, attempting to delete...');
            await supabase
              .from('Users')
              .delete()
              .eq('email', 'joelbiju04@gmail.com');
          }
      
          addDebugLog('Attempting basic signup...');
          const { data, error } = await supabase.auth.signUp({
            email: 'joelbiju04@gmail.com',
            password: 'Password123'
          });
      
          if (error) {
            addDebugLog(`Signup error details: ${JSON.stringify(error, null, 2)}`);
            throw error;
          }
      
          addDebugLog(`Signup response: ${JSON.stringify(data, null, 2)}`);
      
          // Wait for trigger
          addDebugLog('Waiting for database trigger...');
          await new Promise(resolve => setTimeout(resolve, 2000));
      
          // Verify Users table
          const { data: userData, error: userError } = await supabase
            .from('Users')
            .select('*')
            .eq('email', 'joelbiju04@gmail.com')
            .single();
      
          if (userError) {
            addDebugLog(`Users table verification error: ${JSON.stringify(userError, null, 2)}`);
          } else {
            addDebugLog(`Users table entry created: ${JSON.stringify(userData, null, 2)}`);
          }
      
          return {
            name: 'Signup Test',
            success: !error && data?.user,
            data: {
              auth: data?.user,
              userData
            }
          };
      
        } catch (error) {
          addDebugLog(`Signup test failed: ${error.message}`);
          addDebugLog(`Full error: ${JSON.stringify(error, null, 2)}`);
          return {
            name: 'Signup Test',
            success: false,
            error: error.message
          };
        }
      },

    async testLogin(email = 'joelbiju04@gmail.com', password = 'Password123') {
      addDebugLog(`Attempting login with email: ${email}`);
      
      try {
        // First try to get session (if any)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        addDebugLog(`Existing session check: ${existingSession ? 'Found' : 'None'}`);

        if (existingSession) {
          await supabase.auth.signOut();
          addDebugLog('Signed out existing session');
        }

        // Attempt login
        addDebugLog('Attempting sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          addDebugLog(`Sign in error: ${error.message}`);
          throw error;
        }

        addDebugLog('Sign in successful');
        addDebugLog(`User ID: ${data?.user?.id}`);
        
        // Try to fetch user data
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError) {
          addDebugLog(`User data fetch error: ${userError.message}`);
        } else {
          addDebugLog('User data fetch successful');
        }

        return {
          name: 'Login Test',
          success: true,
          data: {
            auth: data.user,
            user: userData
          }
        };

      } catch (error) {
        return {
          name: 'Login Test',
          success: false,
          error: error.message || 'Unknown error occurred'
        };
      }
    },

    async testUserData() {
      addDebugLog('Testing user data fetch...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        addDebugLog('No authenticated user found');
        return { 
          name: 'User Data', 
          success: false, 
          error: 'No user logged in' 
        };
      }

      addDebugLog(`Fetching data for user: ${user.email}`);
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        addDebugLog(`User data fetch failed: ${error.message}`);
      } else {
        addDebugLog('User data fetch successful');
      }

      return {
        name: 'Fetch User Data',
        success: !error && data,
        data,
        error
      };
    }
  };

  const runTests = async () => {
    setLoading(true);
    setDebugLog([]);
    const results = [];
    
    // Run signup first
    addDebugLog('Starting signup test...');
    results.push(await tests.testSignup());
    
    // Then run other tests
    for (const [name, test] of Object.entries(tests)) {
      if (name !== 'testSignup') { // Skip signup test in the main loop
        try {
          addDebugLog(`Starting test: ${name}`);
          const result = await test();
          results.push(result);
          addDebugLog(`Completed test: ${name}`);
        } catch (error) {
          addDebugLog(`Test error: ${name} - ${error.message}`);
          results.push({
            name,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const signOut = async () => {
    addDebugLog('Signing out...');
    await supabase.auth.signOut();
    setCurrentUser(null);
    setTestResults([]);
    addDebugLog('Sign out complete');
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        addDebugLog(`Found existing user session: ${user.email}`);
      }
    });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Testing Dashboard</h1>
      
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
          } text-white`}
        >
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>

        <button
          onClick={signOut}
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          {testResults.length > 0 && (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <h3 className="font-semibold">
                    {result.name}: {result.success ? '✅' : '❌'}
                  </h3>
                  {result.data && (
                    <pre className="mt-2 text-sm overflow-auto bg-white p-2 rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                  {result.error && (
                    <p className="mt-2 text-red-600 text-sm">
                      Error: {JSON.stringify(result.error)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
      </div>
    </div>
  );
}