# app/controllers/contracts.py

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
from datetime import datetime
from app.config.database import get_database
from bson import ObjectId
from app.services.contract_service import (
    generate_contract_html, 
    save_contract_html_for_frontend,
    get_contract_html,
    get_ai_field_suggestions,
    analyze_contract,
    recommend_template
)
from app.services.ai_processor import suggest_contract_template

contracts_bp = Blueprint('contracts', __name__)
db = get_database()

@contracts_bp.route('/templates', methods=['GET'])
@jwt_required()
def get_templates():
    """Return all available contract templates"""
    # In a real app, these would come from a database
    templates = [
        {
            "id": "nda",
            "name": "Non-Disclosure Agreement",
            "description": "A standard confidentiality agreement to protect sensitive information"
        },
        {
            "id": "service-agreement",
            "name": "Service Agreement",
            "description": "A contract defining the terms of services provided between parties"
        },
        {
            "id": "employment-agreement",
            "name": "Employment Agreement",
            "description": "A contract between employer and employee defining the terms of employment"
        }
    ]
    
    return jsonify({"templates": templates}), 200

@contracts_bp.route('/template/<template_id>/fields', methods=['GET'])
@jwt_required()
def get_template_fields(template_id):
    """Get fields for a specific template"""
    
    # Define template fields (in a real app, this would come from a database)
    template_fields = {
        "nda": [
            { "id": "party1_name", "label": "First Party Name", "type": "text", "required": True },
            { "id": "party1_address", "label": "First Party Address", "type": "textarea", "required": True },
            { "id": "party2_name", "label": "Second Party Name", "type": "text", "required": True },
            { "id": "party2_address", "label": "Second Party Address", "type": "textarea", "required": True },
            { "id": "effective_date", "label": "Effective Date", "type": "date", "required": True },
            { "id": "term_months", "label": "Term (Months)", "type": "number", "required": True },
            { "id": "governing_law", "label": "Governing Law State/Country", "type": "text", "required": True },
            { "id": "confidential_info_definition", "label": "Definition of Confidential Information", "type": "textarea", "required": False }
        ],
        "service-agreement": [
            { "id": "service_provider", "label": "Service Provider Name", "type": "text", "required": True },
            { "id": "provider_address", "label": "Provider Address", "type": "textarea", "required": True },
            { "id": "client_name", "label": "Client Name", "type": "text", "required": True },
            { "id": "client_address", "label": "Client Address", "type": "textarea", "required": True },
            { "id": "effective_date", "label": "Effective Date", "type": "date", "required": True },
            { "id": "services", "label": "Description of Services", "type": "textarea", "required": True },
            { "id": "payment_terms", "label": "Payment Terms", "type": "textarea", "required": True },
            { "id": "term_length", "label": "Term Length", "type": "text", "required": True },
            { "id": "governing_law", "label": "Governing Law", "type": "text", "required": True }
        ],
        "employment-agreement": [
            { "id": "employer_name", "label": "Employer Name", "type": "text", "required": True },
            { "id": "employer_address", "label": "Employer Address", "type": "textarea", "required": True },
            { "id": "employee_name", "label": "Employee Name", "type": "text", "required": True },
            { "id": "employee_address", "label": "Employee Address", "type": "textarea", "required": True },
            { "id": "position", "label": "Position/Title", "type": "text", "required": True },
            { "id": "start_date", "label": "Start Date", "type": "date", "required": True },
            { "id": "salary", "label": "Salary", "type": "text", "required": True },
            { "id": "work_hours", "label": "Work Hours", "type": "text", "required": True },
            { "id": "benefits", "label": "Benefits", "type": "textarea", "required": False },
            { "id": "termination_terms", "label": "Termination Terms", "type": "textarea", "required": True },
            { "id": "governing_law", "label": "Governing Law", "type": "text", "required": True }
        ]
    }
    
    if template_id not in template_fields:
        return jsonify({"message": "Template not found"}), 404
    
    return jsonify({"fields": template_fields[template_id]}), 200

@contracts_bp.route('/template/<template_id>/suggest-fields', methods=['POST'])
@jwt_required()
def suggest_template_fields(template_id):
    """Get AI-suggested values for template fields"""
    try:
        user_id = get_jwt_identity()
        data = request.json or {}
        
        # Get suggestions based on context provided
        suggestions = get_ai_field_suggestions(template_id, data.get('context', {}))
        
        return jsonify({
            "message": "Field suggestions generated",
            "suggestions": suggestions
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error generating suggestions: {str(e)}"}), 500

@contracts_bp.route('/generate-html', methods=['POST'])
@jwt_required()
def generate_contract_html_endpoint():
    """Generate HTML content for a contract"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        print(f"Generating contract HTML, user_id: {user_id}")
        print(f"Request data: {json.dumps(data)}")
        
        if not data or 'templateId' not in data or 'formData' not in data:
            print("Missing required data in request")
            return jsonify({"message": "Missing required data"}), 400
            
        template_id = data['templateId']
        form_data = data['formData']
        
        print(f"Generating HTML for template: {template_id}")
        
        # Validate form data
        if not isinstance(form_data, dict):
            return jsonify({"message": "Form data must be an object"}), 400
            
        # Sanitize form data - ensure no empty strings or None values that could break template
        sanitized_form_data = {}
        for key, value in form_data.items():
            if value is not None:
                sanitized_form_data[key] = str(value).strip()
            else:
                sanitized_form_data[key] = ""
        
        # Generate HTML content
        html_content = generate_contract_html(template_id, sanitized_form_data)
        
        if not html_content:
            print("Failed to generate contract HTML")
            return jsonify({"message": "Failed to generate contract HTML"}), 500
        
        print(f"Generated HTML content, length: {len(html_content)}")
        
        # Ensure HTML has proper structure
        if not html_content.strip().startswith('<!DOCTYPE html>'):
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{template_id.replace('-', ' ').title()} Contract</title>
                <style>
                    body {{
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.5;
                        color: #000;
                        padding: 2rem;
                    }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
            </html>
            """
        
        # Save HTML content and return contract ID
        contract_id = save_contract_html_for_frontend(html_content, user_id, template_id, sanitized_form_data)
        
        print(f"Saved contract with ID: {contract_id}")
        
        # Return both the HTML content and contract ID
        return jsonify({
            "message": "Contract HTML generated successfully",
            "contract_id": contract_id,
            "html_content": html_content
        }), 200
    
    except Exception as e:
        print(f"Error generating contract HTML: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error generating contract HTML: {str(e)}"}), 500

@contracts_bp.route('/<contract_id>/html', methods=['GET'])
@jwt_required()
def get_contract_html_endpoint(contract_id):
    """Get HTML content for a contract"""
    try:
        user_id = get_jwt_identity()
        
        # Get HTML content
        html_content = get_contract_html(contract_id, user_id)
        
        if not html_content:
            return jsonify({"message": "Contract not found"}), 404
        
        return jsonify({
            "message": "Contract HTML retrieved successfully",
            "html_content": html_content,
            "contract_id": contract_id
        }), 200
    
    except Exception as e:
        return jsonify({"message": f"Error retrieving contract HTML: {str(e)}"}), 500

@contracts_bp.route('/<contract_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_contract_endpoint(contract_id):
    """Analyze a contract for potential issues or improvements"""
    try:
        user_id = get_jwt_identity()
        
        # Analyze contract
        analysis = analyze_contract(contract_id, user_id)
        
        if not analysis:
            return jsonify({"message": "Contract not found or analysis failed"}), 404
        
        return jsonify({
            "message": "Contract analyzed successfully",
            "analysis": analysis
        }), 200
    
    except Exception as e:
        return jsonify({"message": f"Error analyzing contract: {str(e)}"}), 500

@contracts_bp.route('/recommend-template', methods=['POST'])
@jwt_required()
def recommend_template_endpoint():
    """Recommend a contract template based on user requirements"""
    try:
        data = request.json
        
        if not data or 'requirements' not in data:
            return jsonify({"message": "Missing requirements"}), 400
        
        user_requirements = data['requirements']
        
        # Get recommendation from AI
        recommendation = suggest_contract_template(user_requirements)
        
        return jsonify({
            "message": "Template recommendation generated",
            "recommendation": recommendation
        }), 200
    
    except Exception as e:
        return jsonify({"message": f"Error recommending template: {str(e)}"}), 500

# Keep the original endpoints for backward compatibility
@contracts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_contract():
    """Generate a contract from a template and form data"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        if not data or 'templateId' not in data or 'formData' not in data:
            return jsonify({"message": "Missing required data"}), 400
            
        template_id = data['templateId']
        form_data = data['formData']
        
        # Validate and sanitize form data (applying the same improvements)
        if not isinstance(form_data, dict):
            return jsonify({"message": "Form data must be an object"}), 400
            
        # Sanitize form data
        sanitized_form_data = {}
        for key, value in form_data.items():
            if value is not None:
                sanitized_form_data[key] = str(value).strip()
            else:
                sanitized_form_data[key] = ""
        
        # Generate HTML content first
        html_content = generate_contract_html(template_id, sanitized_form_data)
        
        if not html_content:
            return jsonify({"message": "Failed to generate contract HTML"}), 500
        
        # Ensure HTML has proper structure (same improvement as above)
        if not html_content.strip().startswith('<!DOCTYPE html>'):
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{template_id.replace('-', ' ').title()} Contract</title>
                <style>
                    body {{
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.5;
                        color: #000;
                        padding: 2rem;
                    }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
            </html>
            """
        
        # Save contract metadata with HTML content
        contract_id = save_contract_html_for_frontend(html_content, user_id, template_id, sanitized_form_data)
        
        # Return contract ID and HTML content for frontend rendering
        return jsonify({
            "message": "Contract generated successfully",
            "contract_id": str(contract_id),
            "html_content": html_content,
            "download_url": f"/api/contracts/{contract_id}/download"
        }), 200
    
    except Exception as e:
        print(f"Error generating contract: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error generating contract: {str(e)}"}), 500