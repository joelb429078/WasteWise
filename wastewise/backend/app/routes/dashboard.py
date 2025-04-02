# backend/app/routes/dashboard.py
from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, timedelta

bp = Blueprint('dashboard', __name__)

# Auth middleware (unchanged)
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

def return_empty_metrics():
    return jsonify({
        "status": "success",
        "data": {
            "co2Emissions": 0,
            "co2Change": 0,
            "totalWaste": 0,
            "wasteChange": 0,
            "mostRecentLog": {"date": datetime.now().isoformat(), "weight": 0},
            "mostRecentChange": 0,
            "currentRank": 0,
            "rankChange": 0
        }
    })

def return_default_chart_data(timeframe):
    if timeframe == 'day':
        data = [{"date": day, "waste": 0} for day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']]
    elif timeframe == 'month':
        data = [{"date": f"Week {i}", "waste": 0} for i in range(1, 6)]
    elif timeframe == 'quarter':
        data = [{"date": month, "waste": 0} for month in ['Jan', 'Feb', 'Mar']]
    elif timeframe == 'year':
        data = [{"date": f"Q{i}", "waste": 0} for i in range(1, 5)]
    else:
        data = [{"date": "No Data", "waste": 0}]
    return jsonify({"status": "success", "data": data})

def return_default_waste_types():
    return jsonify({
        "status": "success",
        "data": [
            {"name": "Paper", "value": 0},
            {"name": "Plastic", "value": 0},
            {"name": "Food", "value": 0},
            {"name": "Other", "value": 0}
        ]
    })

def process_waste_data_by_timeframe(waste_logs, timeframe):
    result = []
    if not waste_logs:
        if timeframe == 'day':
            return [{"date": day, "waste": 0} for day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']]
        elif timeframe == 'month':
            return [{"date": f"Week {i}", "waste": 0} for i in range(1, 6)]
        elif timeframe == 'quarter':
            return [{"date": month, "waste": 0} for month in ['Jan', 'Feb', 'Mar']]
        elif timeframe == 'year':
            return [{"date": f"Q{i}", "waste": 0} for i in range(1, 5)]
        else:
            return [{"date": "No Data", "waste": 0}]
    logs_by_date = {}
    for log in waste_logs:
        try:
            if not log.get('created_at'):
                continue
            created_at_obj = log['created_at']
            if isinstance(created_at_obj, str):
                if created_at_obj.endswith('Z'):
                    created_at_obj = created_at_obj.replace('Z', '+00:00')
                created_at = datetime.fromisoformat(created_at_obj)
            else:
                created_at = created_at_obj
            if timeframe == 'day':
                key = created_at.strftime('%a')
            elif timeframe == 'month':
                week_num = (created_at.day - 1) // 7 + 1
                key = f'Week {week_num}'
            elif timeframe == 'quarter':
                key = created_at.strftime('%b')
            elif timeframe == 'year':
                quarter = (created_at.month - 1) // 3 + 1
                key = f'Q{quarter}'
            else:
                key = created_at.strftime('%Y-%m-%d')
            logs_by_date[key] = logs_by_date.get(key, 0) + float(log.get('weight', 0))
        except (ValueError, KeyError) as e:
            print(f"Error processing log: {e}")
            continue
    if timeframe == 'day':
        for day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']:
            result.append({"date": day, "waste": round(logs_by_date.get(day, 0), 1)})
    elif timeframe == 'month':
        for i in range(1, 6):
            week = f'Week {i}'
            result.append({"date": week, "waste": round(logs_by_date.get(week, 0), 1)})
    elif timeframe == 'quarter':
        today = datetime.now()
        current_quarter = (today.month - 1) // 3
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        quarter_months = months[current_quarter*3:(current_quarter+1)*3]
        for month in quarter_months:
            result.append({"date": month, "waste": round(logs_by_date.get(month, 0), 1)})
    elif timeframe == 'year':
        for i in range(1, 5):
            quarter = f'Q{i}'
            result.append({"date": quarter, "waste": round(logs_by_date.get(quarter, 0), 1)})
    else:
        for date in sorted(logs_by_date.keys()):
            result.append({"date": date, "waste": round(logs_by_date[date], 1)})
    return result

@bp.route('/metrics', methods=['GET'])
@auth_required
def get_dashboard_metrics():
    try:
        from app.utils.db import supabase_client
        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        print(f"[METRICS] Incoming headers: User-ID={auth_user_id}, User-Email={email}")
        
        if not email:
            try:
                user_data = supabase_client.auth.get_user(auth_user_id)
                if user_data and hasattr(user_data, 'user') and user_data.user:
                    email = user_data.user.email
                    print(f"[METRICS] Retrieved email from auth: {email}")
            except Exception as e:
                print(f"[METRICS] Error getting user email: {e}")
        print(f"[METRICS] Fetching metrics for auth user ID: {auth_user_id}, email: {email}")
        user_response = supabase_client.table('Users')\
            .select('userID, businessID')\
            .eq('email', email)\
            .execute()
        print(f"[METRICS] User query response: {user_response.data}")

        if not user_response.data or len(user_response.data) == 0:
            print(f"[METRICS] No user found with email: {email}")
            return return_empty_metrics()

        user_id = user_response.data[0]['userID']
        business_id = user_response.data[0]['businessID']
        print(f"[METRICS] Found userID: {user_id}, businessID: {business_id}")

        # Query total waste from Wastelogs using businessID
        waste_response = supabase_client.table('Wastelogs')\
            .select('weight')\
            .eq('businessID', business_id)\
            .execute()
        waste_logs = waste_response.data
        total_waste = sum([float(item.get('weight', 0)) for item in waste_logs]) if waste_logs else 0
        print(f"[METRICS] Total waste computed: {total_waste}")

        # (Process recent logs for other metrics as before)
        recent_logs_response = supabase_client.table('Wastelogs')\
            .select('*')\
            .eq('businessID', business_id)\
            .order('created_at', desc=True)\
            .limit(2)\
            .execute()
        recent_logs = recent_logs_response.data
        most_recent_log = {}
        most_recent_change = 0
        if recent_logs and len(recent_logs) > 0:
            created_at = recent_logs[0]['created_at']
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            most_recent_log = {
                "date": created_at,
                "weight": float(recent_logs[0]['weight']) if recent_logs[0]['weight'] else 0
            }
            if len(recent_logs) > 1:
                current = float(recent_logs[0]['weight']) if recent_logs[0]['weight'] else 0
                previous = float(recent_logs[1]['weight']) if recent_logs[1]['weight'] else 0
                if previous > 0:
                    most_recent_change = ((current - previous) / previous) * 100
        else:
            most_recent_log = {"date": datetime.now().isoformat(), "weight": 0}
        print(f"[METRICS] Processed waste metrics: totalWaste={total_waste}, mostRecentLog={most_recent_log}")

        # ---- New: Compute current rank for the current business ----
        leaderboard_all_response = supabase_client.table('Leaderboards')\
            .select('businessID, seasonalWaste, lastSeasonReset')\
            .order('lastSeasonReset', desc=True)\
            .execute()
        leaderboard_all = leaderboard_all_response.data

        groups = {}
        for entry in leaderboard_all:
            bid = entry.get('businessID')
            if bid not in groups:
                groups[bid] = []
            groups[bid].append(entry)
        leaderboard_list = []
        for bid, entries in groups.items():
            entries.sort(key=lambda x: x.get('lastSeasonReset'), reverse=True)
            current_entry = entries[0]
            previous_entry = entries[1] if len(entries) > 1 else None
            current_waste = float(current_entry.get('seasonalWaste', 0))
            previous_waste = float(previous_entry.get('seasonalWaste', current_waste)) if previous_entry else current_waste
            leaderboard_list.append({
                'businessID': bid,
                'seasonalWaste': current_waste,
                'previousSeasonalWaste': previous_waste,
            })
        sorted_current = sorted(leaderboard_list, key=lambda x: x['seasonalWaste'])
        current_rank_map = {}
        for i, entry in enumerate(sorted_current, start=1):
            current_rank_map[entry['businessID']] = i
        sorted_previous = sorted(leaderboard_list, key=lambda x: x['previousSeasonalWaste'])
        previous_rank_map = {}
        for i, entry in enumerate(sorted_previous, start=1):
            previous_rank_map[entry['businessID']] = i

        current_business_rank = current_rank_map.get(business_id, 0)
        previous_business_rank = previous_rank_map.get(business_id, current_business_rank)
        rank_change = previous_business_rank - current_business_rank
        # -------------------------------------------------------------

        response_data = {
            "co2Emissions": round(total_waste * 2.5) if total_waste else 0,
            "co2Change": 0,  # Optionally derive this from rank change or other metrics
            "totalWaste": round(total_waste) if total_waste else 0,
            "wasteChange": round(most_recent_change, 1) if most_recent_change else 0,
            "mostRecentLog": most_recent_log,
            "mostRecentChange": round(most_recent_change, 1) if most_recent_change else 0,
            "leaderboardChange": round(most_recent_change, 1),  # (or remove if not needed)
            "currentRank": current_business_rank,
            "rankChange": rank_change
        }
        print(f"[METRICS] Final response data: {response_data}")
        return jsonify({"status": "success", "data": response_data})
    except Exception as e:
        print(f"[METRICS] Error in get_dashboard_metrics: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return return_empty_metrics()


@bp.route('/waste-chart', methods=['GET'])
@auth_required
def get_waste_chart_data():
    try:
        from app.utils.db import supabase_client
        auth_user_id = request.headers.get('User-ID')
        email = request.headers.get('User-Email')
        timeframe = request.args.get('timeframe', 'month')
        if not email:
            try:
                user_data = supabase_client.auth.get_user(auth_user_id)
                if user_data and hasattr(user_data, 'user') and user_data.user:
                    email = user_data.user.email
            except Exception as e:
                print(f"Error getting user email: {e}")
        print(f"Fetching waste chart for user email: {email}, timeframe: {timeframe}")
        user_response = supabase_client.table('Users')\
            .select('businessID')\
            .eq('email', email)\
            .execute()
        if not user_response.data:
            print(f"User not found with email: {email}")
            return return_default_chart_data(timeframe)
        business_id = user_response.data[0]['businessID']

        # Query logs directly using businessID
        logs_response = supabase_client.table('Wastelogs')\
            .select('created_at,weight,wasteType')\
            .eq('businessID', business_id)\
            .execute()
        logs = logs_response.data
        result = process_waste_data_by_timeframe(logs, timeframe)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        print(f"Error in get_waste_chart_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return return_default_chart_data(timeframe)


@bp.route('/waste-types', methods=['GET'])
@auth_required
def get_waste_types_data():
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
                print(f"Error getting user email: {e}")
        print(f"Fetching waste types for user email: {email}")
        user_response = supabase_client.table('Users')\
            .select('businessID')\
            .eq('email', email)\
            .execute()
        if not user_response.data:
            print(f"User not found with email: {email}")
            return return_default_waste_types()
        business_id = user_response.data[0]['businessID']

        # Query waste types directly using businessID
        waste_types_response = supabase_client.table('Wastelogs')\
            .select('wasteType,weight')\
            .eq('businessID', business_id)\
            .execute()
        pie_data = {}
        for item in waste_types_response.data:
            waste_type = item.get('wasteType', 'Unknown')
            weight_value = float(item.get('weight', 0)) if item.get('weight') is not None else 0
            pie_data[waste_type] = pie_data.get(waste_type, 0) + weight_value
        formatted_pie_data = [{"name": wt, "value": total} for wt, total in pie_data.items()]
        if not formatted_pie_data:
            return return_default_waste_types()
        return jsonify({"status": "success", "data": formatted_pie_data})
    except Exception as e:
        print(f"Error in get_waste_types_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return return_default_waste_types()


@bp.route('/debug-info', methods=['GET'])
@auth_required
def debug_info():
    try:
        from app.utils.db import supabase_client
        
        # Get user info
        email = request.headers.get('User-Email')
        result = {"user_email": email}
        
        # Test Users table
        try:
            user_response = supabase_client.table('Users')\
                .select('*')\
                .eq('email', email)\
                .execute()
            result["user_info"] = user_response.data[0] if user_response.data else None
        except Exception as e:
            result["user_info_error"] = str(e)
        
        # Get business ID
        business_id = None
        if result.get("user_info"):
            business_id = result["user_info"].get("businessID")
            result["business_id"] = business_id
        
        # Test Wastelogs table
        if business_id:
            try:
                wastelogs_response = supabase_client.table('Wastelogs')\
                    .select('*')\
                    .eq('businessID', business_id)\
                    .limit(5)\
                    .execute()
                result["wastelogs_sample"] = wastelogs_response.data
                result["wastelogs_count"] = len(wastelogs_response.data)
            except Exception as e:
                result["wastelogs_error"] = str(e)
        
        # Check if Wastelogs table exists and has businessID column
        try:
            table_info_response = supabase_client.table('Wastelogs')\
                .select('*')\
                .limit(1)\
                .execute()
            if table_info_response.data and len(table_info_response.data) > 0:
                result["wastelogs_columns"] = list(table_info_response.data[0].keys())
            else:
                result["wastelogs_columns"] = "Table exists but no data found"
        except Exception as e:
            result["wastelogs_table_error"] = str(e)
        
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()})