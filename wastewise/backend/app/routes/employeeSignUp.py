# backend/app/routes/employeeSignUp.py
import os
from flask import Blueprint, request, jsonify
import sys
from app.utils.db import supabase_client
import hashlib
import hmac
import base64

bp = Blueprint('employeeSignUp', __name__)

@bp.route('/employeeSignUp', methods=["POST"])
def employee_sign_up():
    data = request.json
    
    if not all(key in data for key in ['email', 'username', 'password', 'joinCode']):
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        # 1. Verify join code is valid
        business_response = supabase_client.table('Businesses')\
            .select('businessID')\
            .eq('employeeInviteCode', data['joinCode'])\
            .execute()
            
        if not business_response.data:
            return jsonify({"error": "Invalid join code"}), 400
            
        business_id = business_response.data[0]['businessID']
        
        # 2. Create auth user with Supabase
        auth_response = supabase_client.auth.sign_up({
            "email": data['email'],
            "password": data['password']
        })
        
        if auth_response.error:
            return jsonify({"error": auth_response.error.message}), 400
            
        user_id = auth_response.user.id
        
        # 3. Create user record in Users table
        user_data = {
            "userID": user_id,
            "email": data['email'],
            "username": data['username'],
            "businessID": business_id,
            "admin": False,
            "owner": False
        }
        
        user_response = supabase_client.table('Users')\
            .insert(user_data)\
            .execute()
            
        if user_response.error:
            # Rollback auth user if user record creation fails
            # Note: You'll need to implement this properly in production
            return jsonify({"error": user_response.error.message}), 500
            
        return jsonify({
            "status": "success",
            "message": "Employee account created successfully",
            "user": {
                "email": data['email'],
                "username": data['username'],
                "businessID": business_id
            }
        })
        
    except Exception as e:
        print(f"Employee signup error: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500