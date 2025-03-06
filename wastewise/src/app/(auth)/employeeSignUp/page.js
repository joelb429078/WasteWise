'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/authCard';
import { AuthInput } from '@/components/auth/authInput';
import { AuthButton } from '@/components/auth/authButton';
import { supabase } from '@/lib/supabase';

export default function EmployeeSignUp() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        joinCode: ''
    });
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }
        
        try {
            console.log('Checking join code:', formData.joinCode);
            
            // 1. Find business by join code (check both employee and admin invite codes)
            let businessData;
            let isAdmin = false;
            
            // Try to find a business with matching employee invite code
            let { data: businessByEmployeeCode } = await supabase
                .from('Businesses')
                .select('businessID, companyName')
                .eq('employeeInviteCode', formData.joinCode.trim())
                .maybeSingle();
                
            // Try to find a business with matching admin invite code
            let { data: businessByAdminCode } = await supabase
                .from('Businesses')
                .select('businessID, companyName')
                .eq('adminInviteCode', formData.joinCode.trim())
                .maybeSingle();
                
            console.log('Business by employee code:', businessByEmployeeCode);
            console.log('Business by admin code:', businessByAdminCode);
            
            // Determine which code matched
            if (businessByEmployeeCode) {
                businessData = businessByEmployeeCode;
                isAdmin = false;
                console.log('Using employee code for business:', businessData.businessID);
            } else if (businessByAdminCode) {
                businessData = businessByAdminCode;
                isAdmin = true;
                console.log('Using admin code for business:', businessData.businessID);
            } else {
                throw new Error('Invalid join code. Please check and try again.');
            }
            
            // Ensure we have a valid business ID
            if (!businessData || !businessData.businessID) {
                throw new Error('Could not determine business ID. Please contact support.');
            }
            
            // 2. Create auth user
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email.toLowerCase().trim(),
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        business_id: businessData.businessID,
                        is_admin: isAdmin
                    }
                }
            });
            
            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    throw new Error('An account with this email already exists. Please sign in instead.');
                }
                throw signUpError;
            }
            
            console.log('Auth signup successful:', data);
            
            // 3. After successful signup, instead of trying to insert directly, 
            // sign in immediately to get an authenticated session
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email.toLowerCase().trim(),
                password: formData.password
            });
            
            if (signInError) {
                throw signInError;
            }
            
            console.log('Sign in successful');
            
            // 4. Now that we're authenticated, set up the user record
            // The RLS policy should allow this since we're authenticated
            try {
                console.log('Attempting to set businessID:', businessData.businessID, 'and admin status:', isAdmin);
                
                // Make sure the businessID is in the right format (number)
                let businessID = businessData.businessID;
                if (typeof businessID === 'string') {
                    businessID = parseInt(businessID, 10);
                    console.log('Converted businessID to number:', businessID);
                }
                
                // First check if the user already exists
                const { data: existingUser, error: checkError } = await supabase
                    .from('Users')
                    .select('*')
                    .eq('email', formData.email.toLowerCase().trim())
                    .single();
                    
                console.log('Existing user check:', existingUser, checkError);
                
                if (existingUser) {
                    // User exists, update their record using RPC to bypass RLS
                    console.log('Updating existing user record with ID:', existingUser.userID);
                    
                    // Try using a direct SQL query (RPC) to bypass RLS issues
                    const { data: updatedRPC, error: rpcError } = await supabase.rpc('update_user_business', {
                        user_id: existingUser.userID,
                        business_id: businessID,
                        is_admin: isAdmin,
                        username_val: formData.username.trim()
                    });
                    
                    console.log('RPC update result:', updatedRPC, rpcError);
                    
                    if (rpcError) {
                        console.error('Error with RPC update:', rpcError);
                        
                        // Fall back to direct update if RPC fails
                        console.log('Falling back to direct update');
                        
                        // Try a more direct update as a fallback
                        const { data: updatedUser, error: updateError } = await supabase
                            .from('Users')
                            .update({
                                username: formData.username.trim(),
                                businessID: businessID,
                                admin: isAdmin,
                                owner: false
                            })
                            .eq('userID', existingUser.userID)
                            .select();
                            
                        console.log('Direct update result:', updatedUser, updateError);
                        
                        if (updateError) {
                            console.error('Error with direct update:', updateError);
                            throw updateError;
                        }
                    }
                } else {
                    // User doesn't exist, insert a new record
                    console.log('Creating new user record with businessID:', businessID, 'and admin:', isAdmin);
                    
                    const { data: newUser, error: insertError } = await supabase
                        .from('Users')
                        .insert({
                            email: formData.email.toLowerCase().trim(),
                            username: formData.username.trim(),
                            businessID: businessID,
                            admin: isAdmin,
                            owner: false
                        })
                        .select();
                        
                    console.log('Insert result:', newUser, insertError);
                    
                    if (insertError) {
                        console.error('Error inserting user:', insertError);
                        
                        // If it's not a duplicate key error, throw it
                        if (!insertError.message?.includes('duplicate key')) {
                            throw insertError;
                        }
                    }
                }
                
                console.log('User record created or updated successfully');
        
                localStorage.setItem('authToken', data.session.access_token);
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('isAdmin', isAdmin);

                // 5. Redirect to dashboard
                router.push('/dashboard');
                
            } catch (dbError) {
                console.error('Error setting up user record:', dbError);
                // Continue to dashboard anyway since auth was successful
                router.push('/dashboard');
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            setError(error.message);
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
            title="Sign Up"
            subtitle="Join your company's WasteWise team"
        >
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}
                
                <AuthInput
                    id="email"
                    label="Email" 
                    type="email" 
                    onChange={handleChange}
                    value={formData.email}
                    required
                />

                <AuthInput
                    id="username"
                    label="Username" 
                    type="text" 
                    onChange={handleChange}
                    value={formData.username}
                    required
                />

                <AuthInput
                    id="password"
                    label="Password" 
                    type="password" 
                    onChange={handleChange}
                    value={formData.password}
                    required
                />

                <AuthInput
                    id="confirmPassword"
                    label="Confirm Password" 
                    type="password" 
                    onChange={handleChange}
                    value={formData.confirmPassword}
                    required
                />

                <AuthInput
                    id="joinCode"
                    label="Join Code" 
                    type="text" 
                    onChange={handleChange}
                    value={formData.joinCode}
                    placeholder="Enter the code provided by your company admin"
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