'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/authCard';
import { AuthInput } from '@/components/auth/authInput';
import { AuthButton } from '@/components/auth/authButton';
import { supabase } from '@/lib/supabase';
  
export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', formData.email);
      
      // Normalize email to lowercase and trim
      const normalizedEmail = formData.email.toLowerCase().trim();
      
      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password
      });

      if (signInError) throw signInError;

      const user = data.user;
      console.log('Auth successful:', user);

      // Get user details from Users table
      // First try exact match
      let userData;
      let userError;
      
      const { data: exactMatchUser, error: exactMatchError } = await supabase
        .from('Users')
        .select('*')
        .eq('email', user.email)
        .single();
        
      if (exactMatchUser) {
        userData = exactMatchUser;
        console.log('Found user with exact email match:', userData);
      } else {
        console.log('No exact match found, trying case-insensitive search');
        // If no exact match, try case-insensitive search
        const { data: allUsers, error: fetchError } = await supabase
          .from('Users')
          .select('*');
          
        if (fetchError) {
          console.error('Error fetching users:', fetchError);
          throw fetchError;
        }
        
        // Find a case-insensitive match
        const matchingUser = allUsers.find(u => 
          u.email && u.email.toLowerCase().trim() === user.email.toLowerCase().trim()
        );
        
        if (matchingUser) {
          userData = matchingUser;
          console.log('Found user with case-insensitive match:', userData);
        } else {
          console.error('No matching user found in database');
          throw new Error('User account not found. Please contact support.');
        }
      }

      console.log('User data:', userData);

      // Handle case where user exists in Auth but not in Users table
      if (!userData && user) {
        console.log('User exists in Auth but not in Users table. Creating record.');
        // You can add code here to create a user record if necessary
      }

      // Redirect based on role
      if (userData.admin) {
        console.log('Redirecting to admin dashboard');
        
        // Add these lines to store auth data in localStorage
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('isAdmin', userData.admin);
        localStorage.setItem('userEmail', user.email);
        
        router.push('/dashboard');
      } else {
        console.log('Redirecting to user dashboard');
        
        // Add these lines to store auth data in localStorage
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('isAdmin', userData.admin || false);
        localStorage.setItem('userEmail', user.email);
        
        router.push('/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);
      // Provide more user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email address before signing in.');
      } else {
        setError(error.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Welcome Back" 
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        
        <AuthInput
          id="email"
          type="email"
          label="Email address"
          value={formData.email}
          onChange={(e) => setFormData({
            ...formData,
            email: e.target.value
          })}
          required
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={(e) => setFormData({
            ...formData,
            password: e.target.value
          })}
          required
        />

        <AuthButton type="submit" loading={loading}>
          Sign in
        </AuthButton>

        <div className="text-center mt-4">
          <span className="text-gray-600">Don&apos;t have an account? </span>
          <Link 
            href="/employeeSignUp"
            className="text-green-600 hover:text-green-500 font-medium transition-colors duration-200"
          >
            Sign up
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}