# backend/app/routes/leaderboard.py
from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, timedelta

bp = Blueprint('leaderboard', __name__)

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

@bp.route('/leaderboard', methods=['GET'])
@auth_required
def get_enhanced_leaderboard():
    try:
        from app.utils.db import supabase_client

        # Get timeframe from query parameters
        timeframe = request.args.get('timeframe', 'season')
        
        # Get user info for context
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

        print(f"[LEADERBOARD] Fetching leaderboard for user email: {email}, timeframe: {timeframe}")

        # Retrieve user info (to get business ID)
        user_response = supabase_client.table('Users') \
            .select('userID,businessID') \
            .eq('email', email) \
            .execute()
            
        if not user_response.data or len(user_response.data) == 0:
            print(f"[LEADERBOARD] No user found with email: {email}")
            return jsonify({"error": "User not found"}), 404

        current_business_id = user_response.data[0]['businessID']
        print(f"[LEADERBOARD] Current user's business ID: {current_business_id}")
        
        # Determine date range based on timeframe
        now = datetime.now()
        from_date = None
        
        if timeframe == 'week':
            from_date = now - timedelta(days=7)
        elif timeframe == 'month':
            from_date = now - timedelta(days=30)
        elif timeframe == 'quarter':
            from_date = now - timedelta(days=90)
        elif timeframe == 'year':
            from_date = now - timedelta(days=365)
        # Season and 'all' will use all data
        
        # Build query for Leaderboard data
        leaderboard_data = []
        
        if timeframe in ['season', 'all']:
            # Use the Leaderboards table for seasonal data
            leaderboard_response = supabase_client.table('Leaderboards') \
                .select('businessID, seasonalWaste, companyName, lastSeasonReset') \
                .order('lastSeasonReset', desc=True) \
                .execute()
            
            if leaderboard_response.error:
                raise Exception(f"Error fetching leaderboard: {leaderboard_response.error}")
                
            # Process data from Leaderboards table
            business_groups = {}
            for entry in leaderboard_response.data or []:
                bid = entry.get('businessID')
                if bid is None:
                    continue
                business_groups.setdefault(bid, []).append(entry)
            
            for bid, entries in business_groups.items():
                # Sort each business's entries so index 0 is the most recent
                entries.sort(key=lambda x: x.get('lastSeasonReset'), reverse=True)
                current_entry = entries[0]
                previous_entry = entries[1] if len(entries) > 1 else None

                # Calculate rank change
                rank_change = 0
                try:
                    current_waste = float(current_entry.get('seasonalWaste', 0))
                    if previous_entry:
                        previous_waste = float(previous_entry.get('seasonalWaste', 0))
                        change_pct = ((current_waste - previous_waste) / previous_waste) * 100 if previous_waste else 0
                        # Convert percentage to approx position change
                        if change_pct > 25:
                            rank_change = -3  # Large decrease = rank improvement
                        elif change_pct > 10:
                            rank_change = -2
                        elif change_pct > 0:
                            rank_change = -1
                        elif change_pct < -25:
                            rank_change = 3  # Large increase = rank decline
                        elif change_pct < -10:
                            rank_change = 2
                        elif change_pct < 0:
                            rank_change = 1
                except Exception as e:
                    print(f"[LEADERBOARD] Error computing rank change for businessID {bid}: {e}")

                # Get company info for better display
                business_info_response = supabase_client.table('Businesses') \
                    .select('companyName') \
                    .eq('businessID', bid) \
                    .single() \
                    .execute()
                    
                company_name = None
                if not business_info_response.error and business_info_response.data:
                    company_name = business_info_response.data.get('companyName')
                
                leaderboard_data.append({
                    'businessID': bid,
                    'seasonalWaste': current_entry.get('seasonalWaste'),
                    'username': company_name or current_entry.get('companyName') or 'Unknown Company',
                    'lastUpdate': current_entry.get('lastSeasonReset'),
                    'rankChange': rank_change,
                })
        else:
            # For other timeframes, aggregate waste logs directly
            print(f"[LEADERBOARD] Using time-based aggregation for timeframe: {timeframe}")
            
            # Get all businesses
            businesses_response = supabase_client.table('Businesses') \
                .select('businessID, companyName') \
                .execute()
                
            if businesses_response.error:
                raise Exception(f"Error fetching businesses: {businesses_response.error}")
                
            # For each business, sum waste within the time period
            for business in businesses_response.data or []:
                bid = business.get('businessID')
                if not bid:
                    continue
                    
                # Query waste logs for the time period
                query = supabase_client.table('Wastelogs') \
                    .select('weight') \
                    .eq('businessID', bid)
                    
                if from_date:
                    query = query.gte('created_at', from_date.isoformat())
                    
                logs_response = query.execute()
                
                if logs_response.error:
                    print(f"Error fetching logs for business {bid}: {logs_response.error}")
                    continue
                    
                # Sum waste
                total_waste = sum([float(log.get('weight', 0)) for log in logs_response.data or []])
                
                if total_waste > 0:  # Only include businesses with data
                    leaderboard_data.append({
                        'businessID': bid,
                        'seasonalWaste': total_waste,
                        'username': business.get('companyName', 'Unknown Company'),
                        'lastUpdate': now.isoformat(),
                        'rankChange': 0  # No rank change info for custom timeframes
                    })
        
        # Sort by waste amount (highest to lowest)
        sorted_leaderboard = sorted(
            leaderboard_data,
            key=lambda x: float(x.get('seasonalWaste', 0)),
            reverse=True
        )
        
        # Assign ranks
        for idx, entry in enumerate(sorted_leaderboard, 1):
            entry['rank'] = idx
            
        # Update rank changes based on new rankings, if needed
        # This could be enhanced with more sophisticated algorithms
        
        print(f"[LEADERBOARD] Returning {len(sorted_leaderboard)} entries")
        return jsonify({
            "status": "success",
            "data": sorted_leaderboard,
            "userBusinessID": current_business_id,
            "timeframe": timeframe
        })
    except Exception as e:
        print(f"[LEADERBOARD] Error in get_enhanced_leaderboard: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/details/<business_id>', methods=['GET'])
@auth_required
def get_business_details(business_id):
    try:
        from app.utils.db import supabase_client
        
        # Get user info for context
        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Verify business exists
        business_response = supabase_client.table('Businesses') \
            .select('businessID, companyName, created_at') \
            .eq('businessID', business_id) \
            .single() \
            .execute()
            
        if business_response.error or not business_response.data:
            return jsonify({"error": "Business not found"}), 404
            
        business = business_response.data
        
        # Get business statistics
        
        # 1. Total waste reported (all time)
        total_waste_response = supabase_client.table('Wastelogs') \
            .select('weight') \
            .eq('businessID', business_id) \
            .execute()
            
        total_waste = sum([float(log.get('weight', 0)) for log in total_waste_response.data or []])
        
        # 2. Number of employees
        employees_response = supabase_client.table('Users') \
            .select('userID') \
            .eq('businessID', business_id) \
            .execute()
            
        employee_count = len(employees_response.data or [])
        
        # 3. Current rank in leaderboard
        leaderboard_response = supabase_client.table('Leaderboards') \
            .select('businessID, seasonalWaste') \
            .order('seasonalWaste', desc=True) \
            .execute()
            
        current_rank = None
        seasonal_waste = 0
        
        if not leaderboard_response.error and leaderboard_response.data:
            for idx, entry in enumerate(leaderboard_response.data, 1):
                if entry.get('businessID') == business_id:
                    current_rank = idx
                    seasonal_waste = float(entry.get('seasonalWaste', 0))
                    break
        
        # 4. Recent waste logs
        recent_logs_response = supabase_client.table('Wastelogs') \
            .select('wasteType, weight, created_at, userID') \
            .eq('businessID', business_id) \
            .order('created_at', desc=True) \
            .limit(5) \
            .execute()
            
        recent_logs = []
        
        if not recent_logs_response.error and recent_logs_response.data:
            # Get user IDs to fetch usernames
            user_ids = list(set([log.get('userID') for log in recent_logs_response.data if log.get('userID')]))
            
            # Fetch usernames in batch
            usernames = {}
            if user_ids:
                users_response = supabase_client.table('Users') \
                    .select('userID, username') \
                    .in_('userID', user_ids) \
                    .execute()
                    
                if not users_response.error and users_response.data:
                    usernames = {user.get('userID'): user.get('username') for user in users_response.data}
            
            # Format logs with usernames
            for log in recent_logs_response.data:
                user_id = log.get('userID')
                username = usernames.get(user_id, 'Unknown User')
                
                recent_logs.append({
                    'username': username,
                    'wasteType': log.get('wasteType'),
                    'weight': log.get('weight'),
                    'created_at': log.get('created_at')
                })
        
        # 5. Waste by type distribution
        waste_types_response = supabase_client.table('Wastelogs') \
            .select('wasteType, weight') \
            .eq('businessID', business_id) \
            .execute()
            
        waste_by_type = {}
        
        if not waste_types_response.error and waste_types_response.data:
            for log in waste_types_response.data:
                waste_type = log.get('wasteType', 'Other')
                weight = float(log.get('weight', 0))
                
                waste_by_type[waste_type] = waste_by_type.get(waste_type, 0) + weight
                
        # Format waste by type for frontend
        waste_type_data = [{'name': waste_type, 'value': weight} for waste_type, weight in waste_by_type.items()]
        
        return jsonify({
            "status": "success",
            "data": {
                "business": {
                    "businessID": business.get('businessID'),
                    "companyName": business.get('companyName'),
                    "joined": business.get('created_at')
                },
                "stats": {
                    "totalWaste": round(total_waste, 2),
                    "seasonalWaste": round(seasonal_waste, 2),
                    "employeeCount": employee_count,
                    "currentRank": current_rank
                },
                "recentLogs": recent_logs,
                "wasteByType": waste_type_data
            }
        })
    except Exception as e:
        print(f"[LEADERBOARD] Error in get_business_details: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/rank-history/<business_id>', methods=['GET'])
@auth_required
def get_rank_history(business_id):
    try:
        from app.utils.db import supabase_client
        
        # Get all leaderboard entries for this business, ordered by date
        leaderboard_response = supabase_client.table('Leaderboards') \
            .select('businessID, seasonalWaste, lastSeasonReset') \
            .eq('businessID', business_id) \
            .order('lastSeasonReset', asc=True) \
            .execute()
            
        if leaderboard_response.error:
            raise Exception(f"Error fetching leaderboard history: {leaderboard_response.error}")
            
        # Process rank history
        history_data = []
        
        for entry in leaderboard_response.data or []:
            # For each date point, we need to calculate the rank
            reset_date = entry.get('lastSeasonReset')
            waste_amount = float(entry.get('seasonalWaste', 0))
            
            # Get all businesses' data for this reset date
            all_entries_response = supabase_client.table('Leaderboards') \
                .select('businessID, seasonalWaste') \
                .eq('lastSeasonReset', reset_date) \
                .order('seasonalWaste', desc=True) \
                .execute()
                
            if all_entries_response.error:
                print(f"Error fetching entries for date {reset_date}: {all_entries_response.error}")
                continue
                
            # Calculate rank for this date
            rank = None
            
            for idx, business_entry in enumerate(all_entries_response.data or [], 1):
                if business_entry.get('businessID') == business_id:
                    rank = idx
                    break
            
            if rank:
                history_data.append({
                    'date': reset_date,
                    'rank': rank,
                    'waste': waste_amount
                })
        
        return jsonify({
            "status": "success",
            "data": history_data
        })
    except Exception as e:
        print(f"[LEADERBOARD] Error in get_rank_history: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@bp.route('/comparison', methods=['GET'])
@auth_required
def get_comparison_data():
    try:
        from app.utils.db import supabase_client
        
        # Get user info for context
        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        
        # Get user's business
        user_response = supabase_client.table('Users') \
            .select('businessID') \
            .eq('email', email) \
            .single() \
            .execute()
            
        if user_response.error or not user_response.data:
            return jsonify({"error": "User not found"}), 404
            
        user_business_id = user_response.data.get('businessID')
        
        # Get comparison businesses from query params
        comparison_ids = request.args.get('businesses', '').split(',')
        
        # Always include user's business
        if user_business_id not in comparison_ids:
            comparison_ids.append(user_business_id)
        
        # Filter out empty strings
        comparison_ids = [bid for bid in comparison_ids if bid]
        
        if not comparison_ids:
            return jsonify({"error": "No valid business IDs provided"}), 400
        
        # Get data for each business
        comparison_data = []
        
        for business_id in comparison_ids:
            # Get basic business info
            business_response = supabase_client.table('Businesses') \
                .select('companyName') \
                .eq('businessID', business_id) \
                .single() \
                .execute()
                
            if business_response.error or not business_response.data:
                continue
                
            company_name = business_response.data.get('companyName', 'Unknown Company')
            
            # Get current leaderboard data
            leaderboard_response = supabase_client.table('Leaderboards') \
                .select('seasonalWaste, lastSeasonReset') \
                .eq('businessID', business_id) \
                .order('lastSeasonReset', desc=True) \
                .limit(1) \
                .execute()
                
            seasonal_waste = 0
            
            if not leaderboard_response.error and leaderboard_response.data:
                seasonal_waste = float(leaderboard_response.data[0].get('seasonalWaste', 0))
            
            # Get total waste (all time)
            total_waste_response = supabase_client.table('Wastelogs') \
                .select('weight') \
                .eq('businessID', business_id) \
                .execute()
                
            total_waste = sum([float(log.get('weight', 0)) for log in total_waste_response.data or []])
            
            # Get employee count
            employees_response = supabase_client.table('Users') \
                .select('userID') \
                .eq('businessID', business_id) \
                .execute()
                
            employee_count = len(employees_response.data or [])
            
            # Format comparison data
            comparison_data.append({
                'businessID': business_id,
                'companyName': company_name,
                'isCurrentUser': business_id == user_business_id,
                'seasonalWaste': round(seasonal_waste, 2),
                'totalWaste': round(total_waste, 2),
                'employeeCount': employee_count,
                # Calculate average waste per employee
                'wastePerEmployee': round(total_waste / employee_count, 2) if employee_count > 0 else 0
            })
        
        return jsonify({
            "status": "success",
            "data": comparison_data
        })
    except Exception as e:
        print(f"[LEADERBOARD] Error in get_comparison_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500