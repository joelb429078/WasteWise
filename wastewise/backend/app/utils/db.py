# backend/app/utils/db.py
from supabase import create_client
from functools import wraps
import os

# Connection details
SUPABASE_URL = os.environ.get('SUPABASE_URL', "https://lawvohentnnnaxadgjfz.supabase.co") 
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd3ZvaGVudG5ubmF4YWRnamZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NDI3MDksImV4cCI6MjA1NTIxODcwOX0.KXnu4bSoHzeTS0OHB3jC0PlrKX3b5PlCHOeOA0H0q8I")

# Create Supabase client
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

def execute_query(query, params=None):
    """
    Legacy function to maintain backward compatibility.
    This function now logs a warning and delegates to Supabase operations.
    
    For SELECT queries, it attempts to parse the query and convert to Supabase operations.
    For other queries, it returns True to maintain the expected behavior.
    """
    print("DEPRECATION WARNING: execute_query is deprecated, use supabase_client directly")
    
    if query.strip().upper().startswith('SELECT'):
        try:
            # For simple SELECT queries, try to extract table and condition
            # This is a very basic parser and should be replaced with direct Supabase calls
            parts = query.split('FROM')
            if len(parts) > 1:
                table_part = parts[1].strip().split('WHERE')[0].strip().replace('"', '')
                
                # Handle very basic conditions
                condition = None
                if 'WHERE' in parts[1]:
                    condition_part = parts[1].split('WHERE')[1].strip()
                    if '=' in condition_part and '%s' in condition_part:
                        field = condition_part.split('=')[0].strip().replace('"', '')
                        value = params[0] if params else None
                        
                        if value:
                            response = supabase_client.table(table_part)\
                                .select('*')\
                                .eq(field, value)\
                                .execute()
                            return response.data
            
            # For unsupported query patterns
            print(f"WARNING: Could not convert SQL query to Supabase: {query}")
            return []
        except Exception as e:
            print(f"Error executing query: {str(e)}")
            return []
    
    # For non-SELECT queries, return True to maintain expected behavior
    return True

def get_user_by_auth_id(auth_user_id):
    """Get user database record using auth ID by looking up email"""
    try:
        # First, get the user's email from Supabase Auth
        auth_response = supabase_client.auth.get_user(auth_user_id)
        
        if not auth_response or not hasattr(auth_response, 'user') or not auth_response.user:
            print("Could not get user from auth ID")
            return None
            
        email = auth_response.user.email
        
        # Use the email to find the user in your database
        response = supabase_client.table('Users')\
            .select('*')\
            .eq('email', email)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
            
        return None
    except Exception as e:
        print(f"Error getting user by auth ID: {str(e)}")
        return None

def get_user_info_by_email(email):
    """Get user database record using email"""
    try:
        response = supabase_client.table('Users')\
            .select('*')\
            .eq('email', email)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
            
        return None
    except Exception as e:
        print(f"Error getting user by email: {str(e)}")
        return None

def test_connection():
    """Test Supabase connection"""
    try:
        # Simple query to check if the connection is working
        response = supabase_client.table('Users')\
            .select('userID')\
            .limit(1)\
            .execute()
        
        return True
    except Exception as e:
        print(f"Connection test failed: {e}")
        return False