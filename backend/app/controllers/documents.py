from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime
from app.services.document_processor import extract_text_from_document

try:
    from app.services.ai_processor import summarize_document, extract_key_info
except ImportError:
    from app.services.ai_processor import summarize_document, extract_key_info

documents_bp = Blueprint('documents', __name__)
db = get_database()

# Ensure uploads directory exists
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@documents_bp.route('/', methods=['POST'])
@jwt_required()
def upload_document():
    user_id = get_jwt_identity()
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
        
    file = request.files['file']
    
    # Check if filename is empty
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
        
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({"message": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Save file
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, new_filename)
    file.save(file_path)
    
    # Save document metadata to database
    document = {
        "name": filename,
        "file_path": file_path,
        "upload_date": datetime.now(),
        "user_id": user_id,
        "file_type": filename.rsplit('.', 1)[1].lower(),
        "status": "uploaded",
        "processed": False
    }
    
    result = db.documents.insert_one(document)
    document_id = result.inserted_id
    
    # Extract text asynchronously (in a real app, you'd use a task queue)
    # For now, we'll do it synchronously
    extract_text_from_document(document_id)
    
    return jsonify({
        "message": "Document uploaded successfully",
        "document_id": str(document_id)
    }), 201

@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    user_id = get_jwt_identity()
    
    # Get documents for the current user
    documents = list(db.documents.find({"user_id": user_id}))
    
    # Convert ObjectId to string for JSON serialization
    for doc in documents:
        doc['_id'] = str(doc['_id'])
        doc['upload_date'] = doc['upload_date'].isoformat()
    
    return jsonify({"documents": documents}), 200

@documents_bp.route('/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    try:
        user_id = get_jwt_identity()
        
        document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
        if not document:
            return jsonify({"message": "Document not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        document['_id'] = str(document['_id'])
        if 'upload_date' in document:
            document['upload_date'] = document['upload_date'].isoformat()
        
        return jsonify({"document": document}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving document: {str(e)}"}), 500

# Add route to generate document summary
@documents_bp.route('/<document_id>/summarize', methods=['POST'])
@jwt_required()
def generate_summary(document_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify document ownership
        document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
        if not document:
            return jsonify({"message": "Document not found"}), 404
        
        # Generate summary
        summary = summarize_document(ObjectId(document_id))
        if not summary:
            return jsonify({"message": "Failed to generate summary"}), 500
        
        return jsonify({"message": "Summary generated successfully", "summary": summary}), 200
    except Exception as e:
        return jsonify({"message": f"Error generating summary: {str(e)}"}), 500

# Add route to extract key information
@documents_bp.route('/<document_id>/extract-info', methods=['POST'])
@jwt_required()
def extract_document_info(document_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify document ownership
        document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
        if not document:
            return jsonify({"message": "Document not found"}), 404
        
        # Extract key information
        key_info = extract_key_info(ObjectId(document_id))
        if not key_info:
            return jsonify({"message": "Failed to extract key information"}), 500
        
        return jsonify({"message": "Key information extracted successfully", "key_info": key_info}), 200
    except Exception as e:
        return jsonify({"message": f"Error extracting key information: {str(e)}"}), 500