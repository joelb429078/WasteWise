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
            # Attempt to retrieve email from Supabase Auth if not provided
            try:
                user_data = supabase_client.auth.get_user(auth_user_id)
                if user_data and hasattr(user_data, 'user') and user_data.user:
                    email = user_data.user.email
            except Exception as e:
                print(f"[LEADERBOARD] Error retrieving email from auth: {e}")
                pass

        print(f"[LEADERBOARD] Fetching leaderboard for user email: {email}")

        # Retrieve user info (if needed for the current business)
        user_response = supabase_client.table('Users') \
            .select('userID,businessID') \
            .eq('email', email) \
            .execute()
        if not user_response.data or len(user_response.data) == 0:
            print(f"[LEADERBOARD] No user found with email: {email}")
            return jsonify({"error": "User not found"}), 404

        current_business_id = user_response.data[0]['businessID']
        print(f"[LEADERBOARD] Current user's business ID: {current_business_id}")

        # Fetch all Leaderboards rows, ordered by lastSeasonReset descending
        leaderboard_response = supabase_client.table('Leaderboards') \
            .select('businessID, seasonalWaste, companyName, lastSeasonReset') \
            .order('lastSeasonReset', desc=True) \
            .execute()
        leaderboard_data = leaderboard_response.data or []
        print(f"[LEADERBOARD] Raw leaderboard data: {leaderboard_data}")

        # Group rows by businessID, then pick the two most recent entries
        business_groups = {}
        for entry in leaderboard_data:
            bid = entry.get('businessID')
            if bid is None:
                continue
            business_groups.setdefault(bid, []).append(entry)

        leaderboard_results = []
        for bid, entries in business_groups.items():
            # Sort each business's entries so index 0 is the most recent
            entries.sort(key=lambda x: x.get('lastSeasonReset'), reverse=True)
            current_entry = entries[0]
            previous_entry = entries[1] if len(entries) > 1 else None

            # Calculate percentage change in seasonalWaste from previous to current
            rank_change = 0
            try:
                current_waste = float(current_entry.get('seasonalWaste', 0))
                if previous_entry:
                    previous_waste = float(previous_entry.get('seasonalWaste', 0))
                    if previous_waste > 0:
                        change_raw = ((current_waste - previous_waste) / previous_waste) * 100
                        rank_change = round(change_raw, 2)  # Round to 2 decimals
            except Exception as e:
                print(f"[LEADERBOARD] Error computing rank change for businessID {bid}: {e}")

            # Use the companyName field from the Leaderboards row
            entry_data = {
                'businessID': bid,
                'seasonalWaste': current_entry.get('seasonalWaste'),
                'username': current_entry.get('companyName') or 'Unknown',  # Changed from 'companyName' to 'username'
                'lastSeasonReset': current_entry.get('lastSeasonReset'),
                'rankChange': rank_change,
            }
            leaderboard_results.append(entry_data)

        # Sort final results by current seasonalWaste (descending)
        sorted_leaderboard = sorted(
            leaderboard_results,
            key=lambda x: float(x.get('seasonalWaste', 0)),
            reverse=True
        )

        # Assign rank numbers
        for index, entry in enumerate(sorted_leaderboard, 1):
            entry['rank'] = index

        print(f"[LEADERBOARD] Final leaderboard results: {sorted_leaderboard}")
        return jsonify({
            "status": "success",
            "data": sorted_leaderboard
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