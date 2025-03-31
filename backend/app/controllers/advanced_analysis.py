# backend/app/controllers/advanced_analysis.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from app.config.database import get_database
from app.services.advanced_legal_ai import AdvancedLegalAnalysis
from datetime import datetime

advanced_analysis_bp = Blueprint('advanced_analysis', __name__)
db = get_database()
legal_ai = AdvancedLegalAnalysis()

@advanced_analysis_bp.route('/risk-assessment/<document_id>', methods=['POST'])
@jwt_required()
def assess_contract_risks(document_id):
    """Assess legal risks in a contract"""
    user_id = get_jwt_identity()
    
    # Verify document access
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
    if not document:
        return jsonify({"message": "Document not found or access denied"}), 404
    
    # Perform risk assessment
    try:
        results = legal_ai.assess_contract_risks(document_id)
        return jsonify({
            "message": "Risk assessment completed",
            "results": results
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during risk assessment: {str(e)}"}), 500

@advanced_analysis_bp.route('/clause-recommendations/<document_id>', methods=['POST'])
@jwt_required()
def recommend_clauses(document_id):
    """Get clause improvement recommendations"""
    user_id = get_jwt_identity()
    
    # Verify document access
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
    if not document:
        return jsonify({"message": "Document not found or access denied"}), 404
    
    # Get specific clause if provided
    data = request.get_json()
    clause_text = data.get('clause_text') if data else None
    
    # Perform clause analysis
    try:
        results = legal_ai.recommend_clause_improvements(document_id, clause_text)
        return jsonify({
            "message": "Clause analysis completed",
            "results": results
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during clause analysis: {str(e)}"}), 500

@advanced_analysis_bp.route('/precedent-matching/<document_id>', methods=['POST'])
@jwt_required()
def find_precedents(document_id):
    """Find similar legal precedents"""
    user_id = get_jwt_identity()
    
    # Verify document access
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
    if not document:
        return jsonify({"message": "Document not found or access denied"}), 404
    
    # Get custom query if provided
    data = request.get_json()
    query = data.get('query') if data else None
    
    # Find precedents
    try:
        results = legal_ai.find_similar_precedents(document_id, query)
        return jsonify({
            "message": "Precedent matching completed",
            "results": results
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during precedent matching: {str(e)}"}), 500

@advanced_analysis_bp.route('/compliance-check/<document_id>', methods=['POST'])
@jwt_required()
def check_compliance(document_id):
    """Check contract compliance with regulations"""
    user_id = get_jwt_identity()
    
    # Verify document access
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
    if not document:
        return jsonify({"message": "Document not found or access denied"}), 404
    
    # Get jurisdiction and regulation type if provided
    data = request.get_json() or {}
    jurisdiction = data.get('jurisdiction')
    regulation_type = data.get('regulation_type')
    
    # Perform compliance check
    try:
        results = legal_ai.check_compliance(document_id, jurisdiction, regulation_type)
        return jsonify({
            "message": "Compliance check completed",
            "results": results
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during compliance check: {str(e)}"}), 500