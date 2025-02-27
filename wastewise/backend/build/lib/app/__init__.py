from flask import Flask
from flask_cors import CORS
from config import Config

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)

    # Import and register blueprints
    from app.routes.auth import bp as auth_bp
    from app.routes.admin import bp as admin_bp
    from app.routes.employee import bp as employee_bp
    from app.routes.employeeSignUp import bp as employeeSignUp_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employee_bp, url_prefix='/api/employee')
    app.register_blueprint(employeeSignUp_bp, url_prefix='/api/employeeSignUp')

    return app