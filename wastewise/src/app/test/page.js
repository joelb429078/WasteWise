'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      // Log the Supabase URL and key being used
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      const { data, error } = await supabase
        .from('Users')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        setError(error);
        return;
      }

      console.log('Found users:', data);
      setUsers(data);
    }

    fetchUsers();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Test Users</h1>
      
      {error && (
        <div className="bg-red-100 p-4 mb-4 rounded">
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {users && (
        <div className="bg-gray-100 p-4 rounded">
          <pre>{JSON.stringify(users, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}