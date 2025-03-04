# backend/app/routes/wastelogs.py
from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, timedelta

bp = Blueprint('wastelogs', __name__)

# Auth middleware
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

# Function to check if user is admin
def is_user_admin(email):
    try:
        from app.utils.db import supabase_client
        
        user_response = supabase_client.table('Users')\
            .select('admin, owner')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return False
            
        user_data = user_response.data[0]
        return user_data.get('admin', False) or user_data.get('owner', False)
    except Exception as e:
        print(f"Error checking admin status: {e}")
        return False

@bp.route('/list', methods=['GET'])
@auth_required
def list_wastelogs():
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get page and limit from query params
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get user info to determine if admin
        admin_status = is_user_admin(email)
        
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Construct query based on admin status
        if admin_status:
            # Admins see all logs for their business
            query = supabase_client.table('Wastelogs')\
                .select('*')\
                .eq('businessID', business_id)
        else:
            # Regular users only see their own logs
            query = supabase_client.table('Wastelogs')\
                .select('*')\
                .eq('userID', user_id)
        
        # Apply filters from request params
        if request.args.get('wasteType'):
            query = query.eq('wasteType', request.args.get('wasteType'))
            
        # Date range filter
        if request.args.get('startDate'):
            try:
                start_date = datetime.fromisoformat(request.args.get('startDate').replace('Z', '+00:00'))
                query = query.gte('created_at', start_date.isoformat())
            except (ValueError, TypeError):
                pass
                
        if request.args.get('endDate'):
            try:
                end_date = datetime.fromisoformat(request.args.get('endDate').replace('Z', '+00:00'))
                # Add one day to include the entire end date
                end_date = end_date + timedelta(days=1)
                query = query.lt('created_at', end_date.isoformat())
            except (ValueError, TypeError):
                pass
                
        # Get total count first (without pagination)
        count_query = query
        count_response = count_query.execute()
        
        if count_response.error:
            raise Exception(f"Error fetching count: {count_response.error}")
            
        total_count = len(count_response.data)
            
        # Apply sorting and pagination
        sort_field = request.args.get('sortField', 'created_at')
        sort_direction = request.args.get('sortDirection', 'desc')
        
        # Validate sort field
        valid_sort_fields = ['created_at', 'weight', 'wasteType', 'location']
        if sort_field not in valid_sort_fields:
            sort_field = 'created_at'
        
        # Apply sorting and pagination
        query = query.order(sort_field, ascending=(sort_direction == 'asc'))\
            .range(offset, offset + limit - 1)
            
        # Execute query
        response = query.execute()
        
        if response.error:
            raise Exception(f"Error fetching logs: {response.error}")
            
        logs = response.data or []
        
        # If admin, fetch usernames for the logs
        if admin_status and logs:
            # Get unique user IDs
            user_ids = list(set([log.get('userID') for log in logs if log.get('userID')]))
            
            # Fetch usernames in bulk
            usernames = {}
            if user_ids:
                users_response = supabase_client.table('Users')\
                    .select('userID, username')\
                    .in_('userID', user_ids)\
                    .execute()
                    
                if not users_response.error and users_response.data:
                    usernames = {user['userID']: user['username'] for user in users_response.data}
            
            # Add username to each log
            for log in logs:
                log['username'] = usernames.get(log.get('userID'), 'Unknown User')
        
        return jsonify({
            "status": "success",
            "data": logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            },
            "admin": admin_status
        })
    except Exception as e:
        print(f"Error in list_wastelogs: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/detail/<log_id>', methods=['GET'])
@auth_required
def get_wastelog_detail(log_id):
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get user info to determine if admin
        admin_status = is_user_admin(email)
        
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Get the waste log
        log_response = supabase_client.table('Wastelogs')\
            .select('*')\
            .eq('logID', log_id)\
            .execute()
            
        if not log_response.data or len(log_response.data) == 0:
            return jsonify({"error": "Waste log not found"}), 404
            
        log = log_response.data[0]
        
        # Security check: Ensure user has access to this log
        if not admin_status and log.get('userID') != user_id:
            return jsonify({"error": "You don't have permission to access this log"}), 403
            
        if log.get('businessID') != business_id:
            return jsonify({"error": "You don't have permission to access this log"}), 403
            
        # Get username if needed
        if log.get('userID'):
            user_detail_response = supabase_client.table('Users')\
                .select('username')\
                .eq('userID', log.get('userID'))\
                .execute()
                
            if user_detail_response.data and len(user_detail_response.data) > 0:
                log['username'] = user_detail_response.data[0].get('username', 'Unknown User')
            else:
                log['username'] = 'Unknown User'
                
        return jsonify({
            "status": "success",
            "data": log,
            "admin": admin_status
        })
    except Exception as e:
        print(f"Error in get_wastelog_detail: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/update/<log_id>', methods=['POST'])
@auth_required
def update_wastelog(log_id):
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get user info to determine if admin
        admin_status = is_user_admin(email)
        
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Get the waste log to check permissions
        log_response = supabase_client.table('Wastelogs')\
            .select('userID, businessID')\
            .eq('logID', log_id)\
            .execute()
            
        if not log_response.data or len(log_response.data) == 0:
            return jsonify({"error": "Waste log not found"}), 404
            
        log = log_response.data[0]
        
        # Security check: Ensure user has permission to update this log
        if not admin_status and log.get('userID') != user_id:
            return jsonify({"error": "You don't have permission to update this log"}), 403
            
        if log.get('businessID') != business_id:
            return jsonify({"error": "You don't have permission to update this log"}), 403
            
        # Prepare update data
        update_data = {}
        if 'wasteType' in data:
            update_data['wasteType'] = data.get('wasteType')
            
        if 'weight' in data:
            try:
                weight = float(data.get('weight'))
                if weight < 0:
                    return jsonify({"error": "Weight cannot be negative"}), 400
                update_data['weight'] = weight
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid weight value"}), 400
                
        if 'location' in data:
            update_data['location'] = data.get('location')
            
        if 'notes' in data:
            update_data['notes'] = data.get('notes')
            
        # Admin can update user assignment
        if admin_status and 'userID' in data:
            # Verify the user belongs to the same business
            user_check_response = supabase_client.table('Users')\
                .select('businessID')\
                .eq('userID', data.get('userID'))\
                .execute()
                
            if not user_check_response.data or len(user_check_response.data) == 0:
                return jsonify({"error": "Assigned user not found"}), 400
                
            if user_check_response.data[0].get('businessID') != business_id:
                return jsonify({"error": "Cannot assign to user from different business"}), 403
                
            update_data['userID'] = data.get('userID')
            
        if not update_data:
            return jsonify({"error": "No valid update fields provided"}), 400
            
        # Perform the update
        update_response = supabase_client.table('Wastelogs')\
            .update(update_data)\
            .eq('logID', log_id)\
            .execute()
            
        if update_response.error:
            raise Exception(f"Error updating log: {update_response.error}")
            
        return jsonify({
            "status": "success",
            "message": "Waste log updated successfully"
        })
    except Exception as e:
        print(f"Error in update_wastelog: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/delete/<log_id>', methods=['DELETE'])
@auth_required
def delete_wastelog(log_id):
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get user info to determine if admin
        admin_status = is_user_admin(email)
        
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Get the waste log to check permissions
        log_response = supabase_client.table('Wastelogs')\
            .select('userID, businessID')\
            .eq('logID', log_id)\
            .execute()
            
        if not log_response.data or len(log_response.data) == 0:
            return jsonify({"error": "Waste log not found"}), 404
            
        log = log_response.data[0]
        
        # Security check: Ensure user has permission to delete this log
        if not admin_status and log.get('userID') != user_id:
            return jsonify({"error": "You don't have permission to delete this log"}), 403
            
        if log.get('businessID') != business_id:
            return jsonify({"error": "You don't have permission to delete this log"}), 403
            
        # Perform the delete
        delete_response = supabase_client.table('Wastelogs')\
            .delete()\
            .eq('logID', log_id)\
            .execute()
            
        if delete_response.error:
            raise Exception(f"Error deleting log: {delete_response.error}")
            
        return jsonify({
            "status": "success",
            "message": "Waste log deleted successfully"
        })
    except Exception as e:
        print(f"Error in delete_wastelog: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/stats', methods=['GET'])
@auth_required
def get_wastelog_stats():
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get user info to determine if admin
        admin_status = is_user_admin(email)
        
        # Get user's business ID
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Construct query based on admin status
        if admin_status:
            # Admins see stats for all logs in their business
            query = supabase_client.table('Wastelogs')\
                .select('*')\
                .eq('businessID', business_id)
        else:
            # Regular users only see stats for their own logs
            query = supabase_client.table('Wastelogs')\
                .select('*')\
                .eq('userID', user_id)
                
        # Execute query
        response = query.execute()
        
        if response.error:
            raise Exception(f"Error fetching logs: {response.error}")
            
        logs = response.data or []
        
        # Calculate statistics
        total_waste = sum([float(log.get('weight', 0)) for log in logs])
        average_weight = total_waste / len(logs) if logs else 0
        
        # Get most common waste type
        waste_types = {}
        for log in logs:
            waste_type = log.get('wasteType')
            if waste_type:
                waste_types[waste_type] = waste_types.get(waste_type, 0) + 1
                
        most_common_type = max(waste_types.items(), key=lambda x: x[1])[0] if waste_types else None
        
        # Get recent activity (last 7 days)
        now = datetime.now()
        one_week_ago = now - timedelta(days=7)
        
        recent_logs = [log for log in logs if log.get('created_at') and datetime.fromisoformat(log.get('created_at').replace('Z', '+00:00')) >= one_week_ago]
        
        return jsonify({
            "status": "success",
            "data": {
                "totalWaste": round(total_waste, 2),
                "averageWeight": round(average_weight, 2),
                "mostCommonType": most_common_type,
                "recentActivity": len(recent_logs),
                "totalLogs": len(logs)
            }
        })
    except Exception as e:
        print(f"Error in get_wastelog_stats: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/create', methods=['POST'])
@auth_required
def create_wastelog():
    try:
        from app.utils.db import supabase_client
        
        user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate required fields
        if not data.get('wasteType'):
            return jsonify({"error": "Waste type is required"}), 400
            
        try:
            weight = float(data.get('weight', 0))
            if weight <= 0:
                return jsonify({"error": "Weight must be greater than zero"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid weight value"}), 400
            
        # Get user info
        user_response = supabase_client.table('Users')\
            .select('businessID, userID')\
            .eq('email', email)\
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({"error": "User not found"}), 404
            
        business_id = user_response.data[0]['businessID']
        user_id = user_response.data[0]['userID']
        
        # Admin can create logs for other users
        target_user_id = user_id
        admin_status = is_user_admin(email)
        
        if admin_status and data.get('userID'):
            # Verify the user belongs to the same business
            user_check_response = supabase_client.table('Users')\
                .select('businessID')\
                .eq('userID', data.get('userID'))\
                .execute()
                
            if not user_check_response.data or len(user_check_response.data) == 0:
                return jsonify({"error": "Assigned user not found"}), 400
                
            if user_check_response.data[0].get('businessID') != business_id:
                return jsonify({"error": "Cannot assign to user from different business"}), 403
                
            target_user_id = data.get('userID')
            
        # Prepare insert data
        insert_data = {
            'userID': target_user_id,
            'businessID': business_id,
            'wasteType': data.get('wasteType'),
            'weight': weight,
            'location': data.get('location'),
            'created_at': datetime.now().isoformat()
        }
        
        # Add image link if provided
        if data.get('trashImageLink'):
            insert_data['trashImageLink'] = data.get('trashImageLink')
            
        # Perform the insert
        insert_response = supabase_client.table('Wastelogs')\
            .insert(insert_data)\
            .execute()
            
        if insert_response.error:
            raise Exception(f"Error creating log: {insert_response.error}")
            
        return jsonify({
            "status": "success",
            "message": "Waste log created successfully",
            "data": insert_response.data[0] if insert_response.data else None
        })
    except Exception as e:
        print(f"Error in create_wastelog: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500