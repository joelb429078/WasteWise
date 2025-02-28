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

  // Generate a more secure random code
  const generateSecureCode = () => {
    // Create a code with letters and numbers that's 10 characters long
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

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
      console.log('Starting business signup process');
      
      // Normalize the email
      const normalizedEmail = formData.email.toLowerCase().trim();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            company_name: formData.companyName,
            is_admin: true,
            is_owner: true
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      console.log('Auth user created successfully:', authData?.user?.id);

      // Create business record with secure invite codes
      const employeeCode = generateSecureCode();
      const adminCode = generateSecureCode();
      
      console.log('Creating business with codes:', { employeeCode, adminCode });

      const { data: businessData, error: businessError } = await supabase
        .from('Businesses')
        .insert([
          {
            companyName: formData.companyName.trim(),
            employeeInviteCode: employeeCode,
            adminInviteCode: adminCode
          }
        ])
        .select()
        .single();

      if (businessError) {
        console.error('Business creation error:', businessError);
        throw businessError;
      }

      console.log('Business created successfully:', businessData);
      console.log('Business ID to be used:', businessData.businessID);

      // Sign in immediately to get authenticated session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }

      console.log('Signed in successfully');

      // Create user record with explicit business ID and admin flags
      const userData = {
        email: normalizedEmail,
        username: formData.username.trim(),
        businessID: businessData.businessID, // Explicitly use the ID from business creation
        admin: true,                         // Explicitly set to true
        owner: true                          // Explicitly set to true
      };
      
      console.log('Attempting to create user record with data:', userData);

      // Try using a stored procedure if available (as in the employee signup)
      let userRecordSuccess = false;
      
      try {
        // Try the RPC method first
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_owner_user', {
          user_email: userData.email,
          user_name: userData.username,
          business_id: userData.businessID,
          is_admin: true,
          is_owner: true
        });
        
        if (!rpcError) {
          console.log('User created via RPC:', rpcResult);
          userRecordSuccess = true;
        } else {
          console.warn('RPC method failed, falling back to direct insert:', rpcError);
        }
      } catch (rpcAttemptError) {
        console.warn('RPC method not available, using direct insert');
      }
      
      // Fall back to direct insert if RPC failed or isn't available
      if (!userRecordSuccess) {
        const { data: insertedUser, error: userError } = await supabase
          .from('Users')
          .insert([userData])
          .select();

        if (userError) {
          console.error('User creation error:', userError);
          // Try one more approach - upsert instead of insert
          console.log('Attempting upsert as final approach');
          
          const { data: upsertedUser, error: upsertError } = await supabase
            .from('Users')
            .upsert([userData], { onConflict: 'email' })
            .select();
            
          if (upsertError) {
            console.error('Even upsert failed:', upsertError);
            throw upsertError;
          } else {
            console.log('User created via upsert:', upsertedUser);
            userRecordSuccess = true;
          }
        } else {
          console.log('User created via direct insert:', insertedUser);
          userRecordSuccess = true;
        }
      }

      // Store business codes in local storage for easy access
      if (typeof window !== 'undefined') {
        localStorage.setItem('employeeInviteCode', employeeCode);
        localStorage.setItem('adminInviteCode', adminCode);
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Provide user-friendly error messages
      if (error.message.includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(error.message || 'An error occurred during signup. Please try again.');
      }
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