import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Hard-coded configuration (temporary solution)
class Config:
    DATABASE_URL = "postgresql://postgres:kse4akd8vDqSpWYz@lawvohentnnnaxadgjfz.supabase.co:5432/postgres"
    SUPABASE_URL = "https://lawvohentnnnaxadgjfz.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd3ZvaGVudG5ubmF4YWRnamZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NDI3MDksImV4cCI6MjA1NTIxODcwOX0.KXnu4bSoHzeTS0OHB3jC0PlrKX3b5PlCHOeOA0H0q8I"

def create_app():
    app = Flask(__name__)
   
    # Configure CORS with proper settings - adding User-Email to allowed headers
    CORS(app,
         resources={r"/*": {"origins": "*"}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "User-ID", "User-Email"])
    
    app.config.from_object(Config)  # Use the hard-coded Config class
    
    # Import and register blueprints
    from app.routes.auth import bp as auth_bp
    from app.routes.admin import bp as admin_bp
    from app.routes.employee import bp as employee_bp
    from app.routes.employeeSignUp import bp as employeeSignUp_bp
    from app.routes.dashboard import bp as dashboard_bp
    from app.routes.public import bp as public_bp

    app.register_blueprint(public_bp, url_prefix='/api/public')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employee_bp, url_prefix='/api/employee')
    app.register_blueprint(employeeSignUp_bp, url_prefix='/api/employeeSignUp')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    # Add a health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok"}), 200
    
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)