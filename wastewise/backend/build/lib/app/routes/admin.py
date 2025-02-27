# backend/app/routes/admin.py
from flask import Blueprint, request, jsonify
from app.utils.db import supabase_client
from functools import wraps

bp = Blueprint('admin', __name__)  

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "No authorization header"}), 401
        
        try:
            # Verify admin status in Users table
            user_id = request.headers.get('User-ID')  # You'll need to send this from frontend
            response = supabase_client.table('Users')\
                .select("*")\
                .eq('userID', user_id)\
                .eq('admin', True)\
                .execute()
            
            if not response.data:
                return jsonify({"error": "Admin access required"}), 403
                
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    return decorated_function

@bp.route('/employee-table', methods=['GET'])
@admin_required
def get_employee_table():
    try:
        # Get business ID from admin's user record
        user_id = request.headers.get('User-ID')
        admin_response = supabase_client.table('Users')\
            .select("businessID")\
            .eq('userID', user_id)\
            .execute()
        
        business_id = admin_response.data[0]['businessID']
        
        # Get all waste logs for the business
        waste_logs = supabase_client.table('Wastelogs')\
            .select("*, Users(username)")\
            .eq('businessID', business_id)\
            .execute()
            
        return jsonify({
            "status": "success",
            "data": waste_logs.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/employee-management', methods=['GET'])
@admin_required
def get_employee_management():
    try:
        user_id = request.headers.get('User-ID')
        admin_response = supabase_client.table('Users')\
            .select("businessID")\
            .eq('userID', user_id)\
            .execute()
        
        business_id = admin_response.data[0]['businessID']
        
        # Get all employees for the business
        employees = supabase_client.table('Users')\
            .select("userID, username, email, created_at")\
            .eq('businessID', business_id)\
            .execute()
            
        return jsonify({
            "status": "success",
            "data": employees.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500