# backend/app/routes/employee.py
from flask import Blueprint, request, jsonify
from app.utils.db import supabase_client
from datetime import datetime

bp = Blueprint('employee', __name__)

@bp.route('/submit-waste', methods=['POST'])
def submit_waste():
    data = request.json
    user_id = request.headers.get('User-ID')
    
    required_fields = ['wasteType', 'weight', 'location']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select("businessID")\
            .eq('userID', user_id)\
            .execute()
            
        business_id = user_response.data[0]['businessID']
        
        # Create waste log entry
        waste_log = {
            'userID': user_id,
            'businessID': business_id,
            'wasteType': data['wasteType'],
            'weight': data['weight'],
            'location': data['location'],
            'trashImageLink': data.get('trashImageLink', ''),
            'created_at': datetime.utcnow().isoformat()
        }
        
        response = supabase_client.table('Wastelogs')\
            .insert(waste_log)\
            .execute()
            
        return jsonify({
            "status": "success",
            "data": response.data[0]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/history', methods=['GET'])
def get_history():
    user_id = request.headers.get('User-ID')
    
    try:
        # Get user's waste logs
        waste_logs = supabase_client.table('Wastelogs')\
            .select("*")\
            .eq('userID', user_id)\
            .order('created_at', desc=True)\
            .execute()
            
        return jsonify({
            "status": "success",
            "data": waste_logs.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    user_id = request.headers.get('User-ID')
    
    try:
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select("businessID")\
            .eq('userID', user_id)\
            .execute()
            
        business_id = user_response.data[0]['businessID']
        
        # Get leaderboard data
        leaderboard = supabase_client.table('Leaderboards')\
            .select("*")\
            .eq('businessID', business_id)\
            .execute()
            
        return jsonify({
            "status": "success",
            "data": leaderboard.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500