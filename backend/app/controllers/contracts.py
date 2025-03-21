# In app/controllers/contracts.py

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import tempfile
from docx import Document
import pdfkit
from datetime import datetime, timedelta
from app.config.database import get_database
from bson import ObjectId

contracts_bp = Blueprint('contracts', __name__)
db = get_database()

STORAGE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'storage', 'contracts')
os.makedirs(STORAGE_PATH, exist_ok=True)

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
        output_format = data.get('outputFormat', 'pdf')  # Default to PDF
        
        # In a real app, you'd load the template from a database or file system
        # For now, we'll use a simple switch statement
        template_content = get_template_content(template_id, form_data)
        
        if not template_content:
            return jsonify({"message": "Template not found"}), 404
        
        # Generate temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        
        if output_format == 'pdf':
            # Generate PDF
            pdf_path = generate_pdf(template_content, temp_file.name)
            
            # Save contract metadata to database
            contract_id = save_contract_metadata(user_id, template_id, form_data, pdf_path)
            
            # Return file download path
            return jsonify({
                "message": "Contract generated successfully",
                "contract_id": str(contract_id),
                "download_url": f"/api/contracts/{contract_id}/download"
            }), 200
        
        elif output_format == 'docx':
            # Generate DOCX
            docx_path = generate_docx(template_content, temp_file.name)
            
            # Save contract metadata to database
            contract_id = save_contract_metadata(user_id, template_id, form_data, docx_path)
            
            # Return file download path
            return jsonify({
                "message": "Contract generated successfully",
                "contract_id": str(contract_id),
                "download_url": f"/api/contracts/{contract_id}/download"
            }), 200
        
        else:
            return jsonify({"message": "Unsupported output format"}), 400
    
    except Exception as e:
        return jsonify({"message": f"Error generating contract: {str(e)}"}), 500

@contracts_bp.route('/<contract_id>/download', methods=['GET'])
@jwt_required()
def download_contract(contract_id):
    """Download a generated contract"""
    try:
        user_id = get_jwt_identity()
        
        # Find contract in database
        contract = db.contracts.find_one({"_id": ObjectId(contract_id), "user_id": user_id})
        
        if not contract:
            return jsonify({"message": "Contract not found"}), 404
        
        file_path = contract.get('file_path')
        if not file_path or not os.path.exists(file_path):
            return jsonify({"message": "Contract file not found"}), 404
        
        # Get file format from path
        file_format = os.path.splitext(file_path)[1].lstrip('.')
        
        # Set appropriate content type
        content_type = 'application/pdf' if file_format == 'pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        
        # Return file download
        return send_file(
            file_path, 
            as_attachment=True,
            download_name=f"{contract.get('template_id')}_{datetime.now().strftime('%Y%m%d')}.{file_format}",
            mimetype=content_type
        )
    
    except Exception as e:
        return jsonify({"message": f"Error downloading contract: {str(e)}"}), 500

def get_template_content(template_id, form_data):
    """Get the template content with variables replaced"""
    # In a real app, load template from file or database
    # For now, use hardcoded templates
    templates = {
        "nda": """NON-DISCLOSURE AGREEMENT\n\nTHIS NON-DISCLOSURE AGREEMENT (the "Agreement") is made and entered into as of {effective_date} by and between {party1_name}, located at {party1_address} ("Disclosing Party") and {party2_name}, located at {party2_address} ("Receiving Party").\n\n1. PURPOSE...""",
        "service-agreement": """SERVICE AGREEMENT\n\nTHIS SERVICE AGREEMENT (the "Agreement") is made and entered into as of {effective_date} by and between {service_provider}, located at {provider_address} ("Service Provider") and {client_name}, located at {client_address} ("Client")...""",
        "employment-agreement": """EMPLOYMENT AGREEMENT\n\nTHIS EMPLOYMENT AGREEMENT (the "Agreement") is made and entered into as of {start_date} by and between {employer_name}, located at {employer_address} ("Employer") and {employee_name}, located at {employee_address} ("Employee")..."""
    }
    
    if template_id not in templates:
        return None
    
    # Replace variables in template
    content = templates[template_id]
    for key, value in form_data.items():
        content = content.replace(f"{{{key}}}", value)
    
    return content

def generate_pdf(content, output_path):
    """Generate PDF file from content"""
    # In a real app, use a proper HTML template with styling
    html_content = f"<pre>{content}</pre>"
    
    # Use pdfkit to convert HTML to PDF
    pdf_path = f"{output_path}.pdf"
    pdfkit.from_string(html_content, pdf_path)
    
    return pdf_path

def generate_docx(content, output_path):
    """Generate DOCX file from content"""
    doc = Document()
    
    # Split content by newlines and add as paragraphs
    for paragraph in content.split('\n'):
        doc.add_paragraph(paragraph)
    
    # Save document
    docx_path = f"{output_path}.docx"
    doc.save(docx_path)
    
    return docx_path

def save_contract_metadata(user_id, template_id, form_data, file_path):
    """Save contract metadata to database"""
    contract = {
        "user_id": user_id,
        "template_id": template_id,
        "form_data": form_data,
        "file_path": file_path,
        "created_at": datetime.now()
    }
    
    result = db.contracts.insert_one(contract)
    return result.inserted_id

def cleanup_old_contracts():
    """Remove contract files older than 24 hours"""
    cutoff = datetime.now() - timedelta(hours=24)
    old_contracts = db.contracts.find({'created_at': {'$lt': cutoff}})
    
    for contract in old_contracts:
        try:
            os.remove(contract['file_path'])
            db.contracts.delete_one({'_id': contract['_id']})
        except Exception as e:
            print(f"Error cleaning up contract {contract['_id']}: {e}")