from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from app.config.database import get_database
from datetime import datetime
import secrets

settings_bp = Blueprint('settings', __name__)
db = get_database()

@settings_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get user profile and settings"""
    user_id = get_jwt_identity()
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Return user profile data without sensitive information
    profile = {
        "name": user.get('name', ''),
        "email": user.get('email', ''),
        "role": user.get('role', 'user'),
        "preferences": user.get('preferences', {
            "theme": "light",
            "notifications": {
                "email": True,
                "browser": True
            },
            "ui_settings": {
                "language": "en",
                "document_view": "list"
            }
        })
    }
    
    return jsonify({"profile": profile}), 200

@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update user profile information"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input
    if not data:
        return jsonify({"message": "No data provided"}), 400
    
    # Only allow updating specific fields
    allowed_updates = ['name']
    updates = {}
    
    for field in allowed_updates:
        if field in data:
            updates[field] = data[field]
    
    if not updates:
        return jsonify({"message": "No valid fields to update"}), 400
    
    # Update user in database
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        return jsonify({"message": "User not found or no changes made"}), 404
    
    return jsonify({"message": "Profile updated successfully"}), 200

@settings_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_user_preferences():
    """Get user preferences"""
    user_id = get_jwt_identity()
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Get or create default preferences
    preferences = user.get('preferences', {
        "theme": "light",
        "notifications": {
            "email": True,
            "browser": True
        },
        "ui_settings": {
            "language": "en",
            "document_view": "list"
        }
    })
    
    return jsonify({"preferences": preferences}), 200

@settings_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_user_preferences():
    """Update user preferences"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input
    if not data or not isinstance(data, dict):
        return jsonify({"message": "Invalid preferences data"}), 400
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Get current preferences or create default
    current_preferences = user.get('preferences', {
        "theme": "light",
        "notifications": {
            "email": True,
            "browser": True
        },
        "ui_settings": {
            "language": "en",
            "document_view": "list"
        }
    })
    
    # Update preferences (merge)
    if 'theme' in data:
        current_preferences['theme'] = data['theme']
    
    if 'notifications' in data and isinstance(data['notifications'], dict):
        if 'email' in data['notifications']:
            current_preferences.setdefault('notifications', {})['email'] = bool(data['notifications']['email'])
        if 'browser' in data['notifications']:
            current_preferences.setdefault('notifications', {})['browser'] = bool(data['notifications']['browser'])
    
    if 'ui_settings' in data and isinstance(data['ui_settings'], dict):
        if 'language' in data['ui_settings']:
            current_preferences.setdefault('ui_settings', {})['language'] = data['ui_settings']['language']
        if 'document_view' in data['ui_settings']:
            current_preferences.setdefault('ui_settings', {})['document_view'] = data['ui_settings']['document_view']
    
    # Update user in database
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"preferences": current_preferences}}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    
    return jsonify({
        "message": "Preferences updated successfully",
        "preferences": current_preferences
    }), 200

@settings_bp.route('/api-keys', methods=['GET'])
@jwt_required()
def get_api_keys():
    """Get user API keys (enterprise users only)"""
    user_id = get_jwt_identity()
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Check if user is enterprise
    if user.get('role') != 'enterprise':
        return jsonify({"message": "API keys are only available for enterprise users"}), 403
    
    # Get API keys
    api_keys = list(db.api_keys.find({"user_id": user_id}))
    keys_list = []
    
    for key in api_keys:
        keys_list.append({
            "id": str(key['_id']),
            "name": key.get('name', 'Unnamed Key'),
            "created_at": key.get('created_at').isoformat() if 'created_at' in key else '',
            "last_used": key.get('last_used', None),
            # Only show last 4 characters of the key
            "key_preview": '•' * 8 + key.get('key', '')[-4:] if key.get('key') else None
        })
    
    return jsonify({"api_keys": keys_list}), 200

@settings_bp.route('/api-keys', methods=['POST'])
@jwt_required()
def create_api_key():
    """Create a new API key (enterprise users only)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Check if user is enterprise
    if user.get('role') != 'enterprise':
        return jsonify({"message": "API keys are only available for enterprise users"}), 403
    
    # Validate input
    if not data or not data.get('name'):
        return jsonify({"message": "API key name is required"}), 400
    
    # Generate a new API key
    api_key = secrets.token_hex(16)
    
    # Store in database
    key_data = {
        "user_id": user_id,
        "name": data['name'],
        "key": api_key,
        "created_at": datetime.utcnow(),
        "last_used": None
    }
    
    result = db.api_keys.insert_one(key_data)
    
    return jsonify({
        "message": "API key created successfully",
        "api_key": {
            "id": str(result.inserted_id),
            "name": data['name'],
            "key": api_key,  # Only returned once at creation
            "created_at": key_data["created_at"].isoformat()
        }
    }), 201

@settings_bp.route('/api-keys/<key_id>', methods=['DELETE'])
@jwt_required()
def delete_api_key(key_id):
    """Delete an API key"""
    user_id = get_jwt_identity()
    
    # Get user from database
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Check if user is enterprise
    if user.get('role') != 'enterprise':
        return jsonify({"message": "API keys are only available for enterprise users"}), 403
    
    # Delete the key
    try:
        result = db.api_keys.delete_one({
            "_id": ObjectId(key_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            return jsonify({"message": "API key not found or access denied"}), 404
            
        return jsonify({"message": "API key deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting API key: {str(e)}"}), 500