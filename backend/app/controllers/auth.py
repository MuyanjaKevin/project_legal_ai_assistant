from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from datetime import timedelta
from app.config.database import get_database
from bson import ObjectId

auth_bp = Blueprint('auth', __name__)
db = get_database()

@auth_bp.route('/register', methods=['POST'])
def register():
    # Get request data
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing email or password"}), 400
    
    # Check if user exists
    if db.users.find_one({"email": data['email']}):
        return jsonify({"message": "User already exists"}), 409
    
    # Create user
    user = {
        "name": data.get('name', ''),
        "email": data['email'],
        "password": generate_password_hash(data['password']),
        "role": "user"  # Default role
    }
    
    # Insert user into database
    db.users.insert_one(user)
    
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    # Get request data
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing email or password"}), 400
    
    # Check if user exists
    user = db.users.find_one({"email": data['email']})
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({"message": "Invalid credentials"}), 401
    
    # Create access token
    access_token = create_access_token(
        identity=str(user['_id']),
        additional_claims={"role": user.get('role', 'user')},
        expires_delta=timedelta(days=1)
    )
    
    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": {
            "name": user.get('name', ''),
            "email": user['email'],
            "role": user.get('role', 'user')
        }
    }), 200