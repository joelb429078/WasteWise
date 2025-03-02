import json
import requests
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://lawvohentnnnaxadgjfz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd3ZvaGVudG5ubmF4YWRnamZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NDI3MDksImV4cCI6MjA1NTIxODcwOX0.KXnu4bSoHzeTS0OHB3jC0PlrKX3b5PlCHOeOA0H0q8I"  # Use service_role key for admin operations

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get all users from the custom Users table
response = supabase.table("Users").select("*").execute()
users_to_create = response.data

# Function to check if a user already exists in Auth
def user_exists(email):
    try:
        # If your client library supports this method
        existing = supabase.auth.admin.get_user_by_email(email)
        return existing is not None
    except Exception as e:
        # If the error indicates no such user, return False
        return False

# Create each user in Supabase Auth if not already present
for user in users_to_create:
    email = user['email']
    password = "Password123"  # Set a default or generated password
    
    if user_exists(email):
        print(f"User {email} already exists in Auth. Skipping creation.")
        continue

    try:
        # Create user in Supabase Auth
        auth_user = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True  # Mark email as confirmed
        })
        print(f"Created auth user: {email}")
        
    except Exception as e:
        print(f"Error creating user {email}: {str(e)}")

print("User creation process completed!")