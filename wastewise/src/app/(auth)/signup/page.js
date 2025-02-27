// src/app/(auth)/signup/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/authCard';
import { AuthInput } from '@/components/auth/authInput';
import { AuthButton } from '@/components/auth/authButton';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    companyName: ''
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // Create business record
      const { data: businessData, error: businessError } = await supabase
        .from('Businesses')
        .insert([
          {
            companyName: formData.companyName,
            employeeInviteCode: Math.random().toString(36).substring(2, 15),
            adminInviteCode: Math.random().toString(36).substring(2, 15)
          }
        ])
        .select()
        .single();

      if (businessError) throw businessError;

      // Create user record
      const { error: userError } = await supabase
        .from('Users')
        .insert([
          {
            email: formData.email,
            username: formData.username,
            businessID: businessData.businessID,
            admin: true,
            owner: true
          }
        ]);

      // if (userError) throw userError;
      if (userError) {
        throw userError;
      }

      router.push('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  return (
    <AuthCard 
      title="Join the WasteWise Community"
      subtitle="Sign your company up for WasteWise"
    

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
          onChange={handleChange}
          required
        />

        <AuthInput
          id="username"
          type="text"
          label="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />

        <AuthInput
          id="companyName"
          type="text"
          label="Company Name"
          value={formData.companyName}
          onChange={handleChange}
          required
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <AuthInput
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <AuthButton type="submit" loading={loading}>
          Create Account
        </AuthButton>

        <div className="text-center mt-4">
          <span className="text-gray-600">Already have an account? </span>
          <Link 
            href="/login"
            className="text-green-600 hover:text-green-500 font-medium transition-colors duration-200"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}