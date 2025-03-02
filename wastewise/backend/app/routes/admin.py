# backend/app/routes/admin.py
from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime

bp = Blueprint('admin', __name__)

# Admin Auth Middleware
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "No authorization header"}), 401

        try:
            user_id = request.headers.get('User-ID')
            email = request.headers.get('User-Email')
            if not user_id:
                return jsonify({"error": "No user ID provided"}), 401

            if not email:
                try:
                    from app.utils.db import supabase_client
                    user_data = supabase_client.auth.get_user(user_id)
                    if user_data and hasattr(user_data, 'user') and user_data.user:
                        email = user_data.user.email
                except Exception as e:
                    return jsonify({"error": "Could not verify user email"}), 401

            # Check if user is admin or owner
            from app.utils.db import supabase_client
            admin_response = supabase_client.table('Users')\
                .select('admin,owner')\
                .eq('email', email)\
                .execute()

            if not admin_response.data or len(admin_response.data) == 0:
                return jsonify({"error": "User not found"}), 404

            user_data = admin_response.data[0]
            is_admin = user_data.get('admin', False)
            is_owner = user_data.get('owner', False)

            if not (is_admin or is_owner):
                return jsonify({"error": "Admin access required"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return decorated_function

@bp.route('/employee-table', methods=['GET'])
@admin_required
def get_employee_table():
    try:
        from app.utils.db import supabase_client

        email = request.headers.get('User-Email')

        # Get user info to retrieve the business ID
        user_response = supabase_client.table('Users')\
            .select('userID,businessID')\
            .eq('email', email)\
            .execute()

        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404

        business_id = user_response.data[0]['businessID']

        # Directly query waste logs for this business using the businessID field
        logs_response = supabase_client.table('Wastelogs')\
            .select('logID,userID,wasteType,weight,location,created_at,businessID')\
            .eq('businessID', business_id)\
            .order('created_at', desc=True)\
            .limit(50)\
            .execute()

        # Get all usernames for this business
        users_response = supabase_client.table('Users')\
            .select('userID,username')\
            .eq('businessID', business_id)\
            .execute()
            
        # Create a mapping of userIDs to usernames
        user_map = {}
        if users_response.data:
            for user in users_response.data:
                user_map[user['userID']] = user['username']

        # Add username to each log entry
        logs_results = []
        for log in logs_response.data:
            log_data = log.copy()
            log_data['username'] = user_map.get(log['userID'], 'Unknown User')
            logs_results.append(log_data)

        return jsonify({
            "status": "success",
            "data": logs_results
        })
    except Exception as e:
        print(f"Error in get_employee_table: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/analytics', methods=['GET'])
@admin_required
def get_analytics():
    try:
        from app.utils.db import supabase_client

        email = request.headers.get('User-Email')

        # Get business ID from user info
        user_response = supabase_client.table('Users')\
            .select('userID,businessID')\
            .eq('email', email)\
            .execute()

        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404

        business_id = user_response.data[0]['businessID']

        # Get waste by type directly using businessID
        logs_response = supabase_client.table('Wastelogs')\
            .select('wasteType,weight')\
            .eq('businessID', business_id)\
            .execute()
            
        waste_by_type_dict = {}
        for item in logs_response.data:
            waste_type = item.get('wasteType', 'Unknown')
            weight = float(item.get('weight', 0))
            waste_by_type_dict[waste_type] = waste_by_type_dict.get(waste_type, 0) + weight
            
        waste_by_type = [{"wasteType": k, "total_weight": v} for k, v in waste_by_type_dict.items()]
        waste_by_type.sort(key=lambda x: x["total_weight"], reverse=True)

        # Get top users by waste
        # Get all users for this business
        users_response = supabase_client.table('Users')\
            .select('userID,username')\
            .eq('businessID', business_id)\
            .execute()

        top_users = []
        if users_response.data:
            for user in users_response.data:
                user_id = user['userID']
                username = user['username']
                
                # Get total waste for this user
                logs_response = supabase_client.table('Wastelogs')\
                    .select('weight')\
                    .eq('userID', user_id)\
                    .execute()
                    
                total_waste = sum([float(item.get('weight', 0)) for item in logs_response.data])
                top_users.append({"username": username, "total_waste": total_waste})
                
            # Sort by waste (ascending for waste reduction leaders)
            top_users.sort(key=lambda x: x["total_waste"])
            top_users = top_users[:5]  # Get top 5

        return jsonify({
            "status": "success",
            "data": {
                "wasteByType": waste_by_type,
                "topUsers": top_users
            }
        })
    except Exception as e:
        print(f"Error in get_analytics: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500