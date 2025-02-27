'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/authCard';
import { AuthInput } from '@/components/auth/authInput';
import { AuthButton } from '@/components/auth/authButton';
import { supabase } from '@/lib/supabase';
import { debugDb } from '@/lib/debug';

export default function employeeSignUp() {
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

        // const response = await fetch("http://localhost:3000/employeeSignUp", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(formData),
        // });
        
        // const data = await response.json();
        console.log(formData);
    //     if (formData.password !== formData.confirmPassword) {
    //         setError("Passwords don't match");
    //         setLoading(false);
    //         return;
    //     }
    
    //     try {
    //       // Create auth user
    //         const { data: authData, error: authError } = await supabase.auth.signUp({
    //             email: formData.email,
    //             password: formData.password,
    //         });
    
    //         if (authError) throw authError;
    
    };
    
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };



    return (
        <AuthCard 
            title = "Sign Up"
            subtitle = "Join your company's WasteWise team"
        >
            <form onSubmit = {handleSubmit} className="mt-8 space-y-6" action = "/employeeSignUp" method = "POST">
            {/* <form onSubmit = {handleSubmit} className="mt-8 space-y-6"> */}
            {error && (
                <div className = "bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}
                <AuthInput
                    id = "email"
                    label = "Email" 
                    type = "email" 
                    onChange = {handleChange}
                    value = {formData.email}
                    required>
                </AuthInput>

                <AuthInput
                    id = "username"
                    label = "Username" 
                    type = "text" 
                    onChange = {handleChange}
                    value = {formData.username}
                    required>
                </AuthInput>

                <AuthInput
                    id = "password"
                    label = "Password" 
                    type = "password" 
                    onChange = {handleChange}
                    value = {formData.password}
                    required>
                </AuthInput>

                <AuthInput
                    id = "confirmPassword"
                    label = "Confirm Password" 
                    type = "password" 
                    onChange = {handleChange}
                    value = {formData.confirmPassword}
                    required>   
                </AuthInput>

                <AuthInput
                    id = "joinCode"
                    label = "Join Code" 
                    type = "text" 
                    onChange = {handleChange}
                    value = {formData.joinCode}
                    required>            
                </AuthInput>



                <AuthButton type = "submit" loading = {loading}>Create Account</AuthButton>
            </form>
        </AuthCard>


    );

}