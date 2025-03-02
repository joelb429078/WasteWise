import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

def create_app():
    app = Flask(__name__)
    
    # Configure CORS with proper settings - adding User-Email to allowed headers
    CORS(app, 
         resources={r"/*": {"origins": "*"}}, 
         supports_credentials=True, 
         allow_headers=["Content-Type", "Authorization", "User-ID", "User-Email"])  # Added User-Email here


    app.config.from_object(Config)

    # Import and register blueprints
    from app.routes.auth import bp as auth_bp
    from app.routes.admin import bp as admin_bp
    from app.routes.employee import bp as employee_bp
    from app.routes.employeeSignUp import bp as employeeSignUp_bp
    from app.routes.dashboard import bp as dashboard_bp  # Import the new blueprint

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employee_bp, url_prefix='/api/employee')
    app.register_blueprint(employeeSignUp_bp, url_prefix='/api/employeeSignUp')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')  # Register dashboard blueprint

    # Add a health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok"}), 200

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)