# backend/app/controllers/translation.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from app.config.database import get_database
from app.services.translation_service import TranslationService

translation_bp = Blueprint('translation', __name__)
db = get_database()
translation_service = TranslationService()

@translation_bp.route('/languages', methods=['GET'])
def get_languages():
    """Get list of supported languages"""
    languages = translation_service.get_supported_languages()
    return jsonify({"languages": languages}), 200

@translation_bp.route('/detect', methods=['POST'])
@jwt_required()
def detect_language():
    """Detect language of provided text"""
    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({"message": "No text provided"}), 400
    
    text = data['text']
    language = translation_service.detect_language(text)
    
    return jsonify({
        "detected_language": language
    }), 200

@translation_bp.route('/document/<document_id>', methods=['POST'])
@jwt_required()
def translate_document(document_id):
    """Translate a document to target language"""
    user_id = get_jwt_identity()
    
    # Verify document access
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
    if not document:
        return jsonify({"message": "Document not found or access denied"}), 404
    
    # Get target language
    data = request.get_json() or {}
    target_language = data.get('target_language', 'en')
    
    # Perform translation
    try:
        result = translation_service.translate_document(document_id, target_language)
        return jsonify({
            "message": "Translation completed",
            "translation": result
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during translation: {str(e)}"}), 500

@translation_bp.route('/search-query', methods=['POST'])
@jwt_required()
def translate_search_query():
    """Translate a search query to multiple languages"""
    data = request.get_json()
    if not data or not data.get('query'):
        return jsonify({"message": "No query provided"}), 400
    
    query = data['query']
    target_languages = data.get('target_languages')
    
    # Translate query
    try:
        translations = translation_service.translate_search_query(query, target_languages)
        return jsonify({
            "message": "Query translation completed",
            "translations": translations
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error translating query: {str(e)}"}), 500