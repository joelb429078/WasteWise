# backend/app/routes/auth.py
import os
from flask import Blueprint, request, jsonify
import hashlib
import hmac
import base64

bp = Blueprint('auth', __name__)

def verify_password(password, hashed_password, secret):
    """
    Verify a password against a hashed password and secret
    """
    # Create an HMAC with the secret
    h = hmac.new(secret.encode(), password.encode(), hashlib.sha256)
    # Get the calculated hash
    calculated_hash = base64.b64encode(h.digest()).decode()
    # Compare with stored hash
    return hmac.compare_digest(calculated_hash, hashed_password)

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    
    if not all(k in data for k in ['email', 'password', 'hashedPassword', 'secret']):
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        # Verify password using HMAC
        is_valid = verify_password(
            data['password'],
            data['hashedPassword'],
            data['secret']
        )
        
        if not is_valid:
            return jsonify({"error": "Invalid email or password"}), 401
            
        return jsonify({"status": "success"})
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "An error occurred during login"}), 500

@bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    
    if not all(k in data for k in ['email', 'password', 'username']):
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        # Generate a new random secret
        secret = base64.b64encode(os.urandom(32)).decode()
        
        # Create HMAC hash of password
        h = hmac.new(secret.encode(), data['password'].encode(), hashlib.sha256)
        hashed_password = base64.b64encode(h.digest()).decode()
        
        return jsonify({
            "status": "success",
            "hashedPassword": hashed_password,
            "secret": secret
        })
        
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({"error": "An error occurred during signup"}), 500