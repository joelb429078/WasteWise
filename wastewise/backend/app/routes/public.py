from flask import Blueprint, jsonify

bp = Blueprint('public', __name__)

@bp.route('/leaderboard', methods=['GET'])
def get_public_leaderboard():
    try:
        from app.utils.db import supabase_client
        
        # Query businesses
        businesses_response = supabase_client.table('Businesses').select('*').execute()
        businesses = businesses_response.data or []
        print(f"Found {len(businesses)} businesses: {businesses}")
        
        # Query Users to count employees per business
        users_response = supabase_client.table('Users').select('businessID').execute()
        users = users_response.data or []
        print(f"Found {len(users)} users: {users}")
        
        # Count employees per business
        employee_counts = {}
        for user in users:
            business_id = user.get('businessID')
            if business_id:
                employee_counts[business_id] = employee_counts.get(business_id, 0) + 1
        print(f"Employee counts: {employee_counts}")
        
        # Query waste logs to calculate total waste per business
        wastelogs_response = supabase_client.table('Wastelogs').select('businessID, weight').execute()
        wastelogs = wastelogs_response.data or []
        print(f"Found {len(wastelogs)} waste logs: {wastelogs}")
        
        # Calculate total waste per business
        waste_per_business = {}
        for log in wastelogs:
            business_id = log.get('businessID')
            weight = float(log.get('weight', 0))
            if business_id and weight > 0:  # Only include positive weights
                waste_per_business[business_id] = waste_per_business.get(business_id, 0) + weight
        print(f"Waste per business: {waste_per_business}")
        
        # Calculate waste per employee and prepare response
        companies = []
        for business in businesses:
            business_id = business.get('businessID')
            if business_id:
                employee_count = employee_counts.get(business_id, 1)  # Default to 1 to avoid division by zero
                total_waste = waste_per_business.get(business_id, 0)
                waste_per_employee = total_waste / employee_count if total_waste > 0 else 0
                
                if total_waste > 0:  # Only include companies with waste logs
                    companies.append({
                        'businessID': business_id,
                        'companyName': business.get('companyName', 'Unknown'),
                        'wastePerEmployee': waste_per_employee,
                        'rankChange': 0,
                        'wasteType': 'Mixed'
                    })
        
        # Sort by waste per employee (ascending, lower is better)
        companies.sort(key=lambda x: x['wastePerEmployee'])
        top_companies = companies[:5]
        print(f"Top companies: {top_companies}")
        
        # Calculate overall stats (only for companies with waste logs)
        total_employees = sum(employee_counts.get(c['businessID'], 1) for c in companies)
        total_waste = sum(waste_per_business.get(c['businessID'], 0) for c in companies)
        avg_waste_per_employee = total_waste / total_employees if total_employees > 0 else 0
        
        return jsonify({
            'status': 'success',
            'data': {
                'companies': top_companies,
                'stats': {
                    'totalCompanies': len(companies),  # Only count companies with waste logs
                    'averageWastePerEmployee': avg_waste_per_employee
                }
            }
        })
    except Exception as e:
        print(f"Error in public leaderboard: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@bp.route('/leaderboard-full', methods=['GET'])
def get_full_public_leaderboard():
    try:
        from app.utils.db import supabase_client
        
        # Query businesses
        businesses_response = supabase_client.table('Businesses').select('*').execute()
        businesses = businesses_response.data or []
        print(f"Found {len(businesses)} businesses")
        
        # Query Users to count employees per business
        users_response = supabase_client.table('Users').select('businessID').execute()
        users = users_response.data or []
        print(f"Found {len(users)} users")
        
        # Count employees per business
        employee_counts = {}
        for user in users:
            business_id = user.get('businessID')
            if business_id:
                employee_counts[business_id] = employee_counts.get(business_id, 0) + 1
        
        # Query waste logs to calculate total waste per business
        wastelogs_response = supabase_client.table('Wastelogs').select('businessID, weight').execute()
        wastelogs = wastelogs_response.data or []
        print(f"Found {len(wastelogs)} waste logs")
        
        # Calculate total waste per business
        waste_per_business = {}
        for log in wastelogs:
            business_id = log.get('businessID')
            weight = float(log.get('weight', 0))
            if business_id and weight > 0:  # Only include positive weights
                waste_per_business[business_id] = waste_per_business.get(business_id, 0) + weight
        
        # Calculate waste per employee and prepare response
        companies = []
        for business in businesses:
            business_id = business.get('businessID')
            if business_id:
                employee_count = employee_counts.get(business_id, 1)  # Default to 1 to avoid division by zero
                total_waste = waste_per_business.get(business_id, 0)
                waste_per_employee = total_waste / employee_count if total_waste > 0 else 0
                
                if total_waste > 0:  # Only include companies with waste logs
                    companies.append({
                        'businessID': business_id,
                        'companyName': business.get('companyName', 'Unknown'),
                        'wastePerEmployee': waste_per_employee,
                        'totalWaste': total_waste,
                        'rankChange': 0,
                        'wasteType': 'Mixed',
                        'location': business.get('location')
                    })
        
        # Sort by waste per employee (ascending, lower is better)
        companies.sort(key=lambda x: x['wastePerEmployee'])
        print(f"Returning {len(companies)} companies in full leaderboard")
        
        # Calculate overall stats
        total_employees = sum(employee_counts.get(c['businessID'], 1) for c in companies)
        total_waste = sum(waste_per_business.get(c['businessID'], 0) for c in companies)
        avg_waste_per_employee = total_waste / total_employees if total_employees > 0 else 0
        
        return jsonify({
            'status': 'success',
            'data': {
                'companies': companies,  # Return ALL companies, not limited to top 5
                'stats': {
                    'totalCompanies': len(companies),
                    'averageWastePerEmployee': avg_waste_per_employee
                }
            }
        })
    except Exception as e:
        print(f"Error in public full leaderboard: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500