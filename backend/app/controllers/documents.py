from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
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

from ..services.comparison_service import DocumentComparisonService

documents_bp = Blueprint('documents', __name__)
db = get_database()
comparison_service = DocumentComparisonService()

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
    
    # Get category from form data
    category = request.form.get('category', 'Uncategorized')
    
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
        "processed": False,
        "category": category
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
    print("\n\n================= DOCUMENT REQUEST =================")
    print("Headers received:")
    for header, value in request.headers.items():
        print(f"  {header}: {value}")
    
    # Extract and verify authorization header
    auth_header = request.headers.get('Authorization', 'NONE')
    print(f"\nAuthorization header: {auth_header}")
    
    if auth_header == 'NONE':
        print("ERROR: No Authorization header present")
    elif not auth_header.startswith('Bearer '):
        print("ERROR: Authorization header doesn't start with 'Bearer '")
    else:
        token = auth_header[7:]
        print(f"Extracted token: {token[:15]}...")
    
    # Get user ID from JWT token
    try:
        user_id = get_jwt_identity()
        print(f"JWT identity (user_id): {user_id}")
        
        # Get documents for the current user
        documents = list(db.documents.find({"user_id": user_id}))
        print(f"Found {len(documents)} documents for user")
        
        # Convert ObjectId to string for JSON serialization
        for doc in documents:
            doc['_id'] = str(doc['_id'])
            doc['upload_date'] = doc['upload_date'].isoformat()
        
        return jsonify({"documents": documents}), 200
    except Exception as e:
        print(f"ERROR in JWT processing: {str(e)}")
        return jsonify({"message": f"Authentication error: {str(e)}"}), 401
        
 
@documents_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    user_id = get_jwt_identity()
    
    # Get unique categories used by this user
    categories = db.documents.distinct("category", {"user_id": user_id})
    
    # Add default categories if they don't exist
    default_categories = [
        "Uncategorized", 
        "Contract", 
        "NDA", 
        "Agreement", 
        "Employment", 
        "Legal Brief",
        "Terms of Service",
        "Privacy Policy",
        "License"
    ]
    
    # Combine user categories with defaults, remove duplicates
    all_categories = list(set(categories + default_categories))
    all_categories.sort()
    
    return jsonify({"categories": all_categories}), 200

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

# Add DELETE endpoint for document deletion
@documents_bp.route('/<document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify document ownership
        document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
        if not document:
            return jsonify({"message": "Document not found"}), 404
        
        # Get file path before deleting from DB
        file_path = document.get('file_path')
        
        # Delete document from database
        result = db.documents.delete_one({"_id": ObjectId(document_id), "user_id": user_id})
        
        if result.deleted_count == 0:
            return jsonify({"message": "Failed to delete document"}), 500
        
        # Delete the file from file system if it exists
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                # Don't fail the request if file deletion fails
                print(f"Warning: Could not delete file {file_path}: {str(e)}")
        
        return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting document: {str(e)}"}), 500

# Updated OPTIONS routes with proper CORS headers
@documents_bp.route('/', methods=['OPTIONS'])
@cross_origin()
def options_documents():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@documents_bp.route('/categories', methods=['OPTIONS'])
@cross_origin()
def options_categories():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@documents_bp.route('/<document_id>', methods=['OPTIONS'])
@cross_origin()
def options_document_detail():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@documents_bp.route('/<document_id>/summarize', methods=['OPTIONS'])
@cross_origin()
def options_document_summarize():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@documents_bp.route('/<document_id>/extract-info', methods=['OPTIONS'])
@cross_origin()
def options_document_extract_info():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@documents_bp.route('/compare', methods=['OPTIONS'])
@cross_origin()
def options_document_compare():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '86400')  # 24 hours
    return response

@documents_bp.route('/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify document exists and belongs to current user
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
    

@documents_bp.route('/<document_id>/suggest-category', methods=['POST'])
@jwt_required()
def suggest_document_category(document_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify document ownership
        document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": user_id})
        if not document:
            return jsonify({"message": "Document not found"}), 404
        
        # Only suggest category if document doesn't already have a non-default category
        if document.get('category') not in ["Uncategorized", None, ""]:
            return jsonify({
                "message": "Document already has a category", 
                "category": document['category']
            }), 200
        
        # Suggest category
        from app.services.ai_processor import suggest_document_category
        suggested_category = suggest_document_category(ObjectId(document_id))
        
        if not suggested_category:
            return jsonify({"message": "Failed to suggest category"}), 500
        
        # Update document with suggested category
        db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"category": suggested_category}}
        )
        
        return jsonify({
            "message": "Category suggested successfully", 
            "category": suggested_category
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error suggesting category: {str(e)}"}), 500

@documents_bp.route('/<document_id>/suggest-category', methods=['OPTIONS'])
@cross_origin()
def options_document_suggest_category():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# UPDATED: Enhanced document comparison route with better authentication and error handling
@documents_bp.route('/compare', methods=['POST'])
@jwt_required()
def compare_documents():
    try:
        # Log authentication info for debugging
        user_id = get_jwt_identity()
        print(f"Compare documents request from user_id: {user_id}")
        
        # Get request data
        data = request.get_json()
        doc_ids = data.get('documentIds', [])
        
        print(f"Comparing document IDs: {doc_ids}")
            
        if len(doc_ids) < 2:
            return jsonify({
                'error': 'At least two documents required for comparison'
            }), 400
            
        # Fetch documents from MongoDB and verify ownership
        documents = []
        for doc_id in doc_ids:
            try:
                # Ensure document ID is valid
                object_id = ObjectId(doc_id)
                # Find document and verify it belongs to the user
                doc = db.documents.find_one({"_id": object_id, "user_id": user_id})
                
                print(f"Document {doc_id} found: {doc is not None}")
                
                if not doc:
                    return jsonify({
                        'error': f'Document with ID {doc_id} not found or access denied'
                    }), 404
                    
                if 'extracted_text' not in doc:
                    print(f"Document {doc_id} missing extracted_text")
                    return jsonify({
                        'error': f'Document {doc_id} has no content or has not been processed yet'
                    }), 400
                    
                documents.append(doc)
            except Exception as doc_error:
                print(f"Error processing document {doc_id}: {str(doc_error)}")
                return jsonify({
                    'error': f'Invalid document ID: {doc_id}'
                }), 400
        
        # Compare documents
        print("Comparing document contents...")
        comparison_result = comparison_service.compare_documents(
            documents[0].get('extracted_text', ''),
            documents[1].get('extracted_text', '')
        )
        
        # Update comparison metadata
        for doc_id in doc_ids:
            db.documents.update_one(
                {"_id": ObjectId(doc_id)},
                {
                    "$set": {
                        "last_compared": datetime.utcnow(),
                        "comparison_count": 1
                    }
                }
            )
        
        print("Comparison completed successfully")
        return jsonify({
            'success': True,
            'comparison': comparison_result
        })
        
    except Exception as e:
        print(f"Comparison error: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500