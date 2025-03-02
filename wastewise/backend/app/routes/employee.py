# backend/app/routes/employee.py
from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime

bp = Blueprint('employee', __name__)

# Employee Auth Middleware
def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.headers.get('Authorization'):
            return jsonify({"error": "No authorization header"}), 401
        try:
            if not request.headers.get('User-ID'):
                return jsonify({"error": "No user ID provided"}), 401
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return decorated_function

@bp.route('/leaderboard', methods=['GET'])
@auth_required
def get_leaderboard():
    try:
        from app.utils.db import supabase_client

        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        if not email:
            try:
                user_data = supabase_client.auth.get_user(auth_user_id)
                if user_data and hasattr(user_data, 'user') and user_data.user:
                    email = user_data.user.email
            except Exception as e:
                print(f"[LEADERBOARD] Error retrieving email from auth: {e}")
                pass
        print(f"[LEADERBOARD] Fetching leaderboard for user email: {email}")

        # Retrieve user info to get the business ID
        user_response = supabase_client.table('Users')\
            .select('userID,businessID')\
            .eq('email', email)\
            .execute()
        if not user_response.data or len(user_response.data) == 0:
            print(f"[LEADERBOARD] No user found with email: {email}")
            return jsonify({"error": "User not found"}), 404
        business_id = user_response.data[0]['businessID']
        print(f"[LEADERBOARD] Found business ID: {business_id}")
        
        # Fetch leaderboard data with companyName directly
        # The Leaderboards table now has companyName field
        leaderboard_response = supabase_client.table('Leaderboards')\
            .select('businessID,seasonalWaste,companyName')\
            .order('seasonalWaste', desc=True)\
            .execute()
        leaderboard_data = leaderboard_response.data
        print(f"[LEADERBOARD] Raw leaderboard data: {leaderboard_data}")

        leaderboard_results = []
        if leaderboard_data:
            sorted_leaderboard = sorted(leaderboard_data, key=lambda x: float(x.get('seasonalWaste', 0)), reverse=True)
            for index, entry in enumerate(sorted_leaderboard, 1):
                entry_data = {
                    'businessID': entry.get('businessID'),
                    'seasonalWaste': entry.get('seasonalWaste'),
                    'companyName': entry.get('companyName', 'Unknown'), # Use the directly available companyName
                    'rank': index,
                    'rankChange': 0  # Placeholder
                }
                leaderboard_results.append(entry_data)
        else:
            leaderboard_results = []
        print(f"[LEADERBOARD] Final leaderboard results: {leaderboard_results}")

        return jsonify({
            "status": "success",
            "data": leaderboard_results
        })
    except Exception as e:
        print(f"[LEADERBOARD] Error in get_leaderboard: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/history', methods=['GET'])
@auth_required
def get_history():
    try:
        from app.utils.db import supabase_client

        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        if not email:
            try:
                user_data = supabase_client.auth.get_user(auth_user_id)
                if user_data and hasattr(user_data, 'user') and user_data.user:
                    email = user_data.user.email
            except:
                pass
        
        # Get user info to retrieve userID and businessID
        user_response = supabase_client.table('Users')\
            .select('userID, businessID, username')\
            .eq('email', email)\
            .execute()
        
        if not user_response.data:
            return jsonify({"error": "User not found"}), 404
            
        user_id = user_response.data[0]['userID']
        username = user_response.data[0]['username']
        
        # Query waste logs for this user
        history_response = supabase_client.table('Wastelogs')\
            .select('logID,userID,wasteType,weight,location,created_at')\
            .eq('userID', user_id)\
            .order('created_at', desc=True)\
            .limit(20)\
            .execute()
            
        # Add username to each log entry
        history_results = []
        for log in history_response.data:
            log_data = log.copy()
            log_data['username'] = username
            history_results.append(log_data)
            
        return jsonify({
            "status": "success",
            "data": history_results
        })
    except Exception as e:
        print(f"Error in get_history: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Wastelogs --> logID, created_at, userID, wasteType, weight, location, trashImageLink
# Users --> userID, created_at, username, email, businessID, secret, hashedPassword, admin, owner, temporary plaintext password column
# Leaderboards --> ID, businessID, seasonalWaste, lastSeasonReset
# Businesses --> businessID, created_at, companyName, employeeInviteCode, adminInviteCode