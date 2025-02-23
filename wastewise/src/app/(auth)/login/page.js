'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/authCard';
import { AuthInput } from '@/components/auth/authInput';
import { AuthButton } from '@/components/auth/authButton';
import { supabase } from '@/lib/supabase';
import { debugDb } from '@/lib/debug';
  

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
      
      // Sign in with Supabase Auth
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.toLowerCase(),
        password: formData.password
      });

      if (signInError) throw signInError;

      console.log('Auth successful:', user);

      // Get user details from Users table
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (userError) throw userError;

      console.log('User data:', userData);

      // Redirect based on role
      if (userData.admin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
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
            email: e.target.value.toLowerCase()
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
            href="/signup"
            className="text-green-600 hover:text-green-500 font-medium transition-colors duration-200"
          >
            Sign up
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}