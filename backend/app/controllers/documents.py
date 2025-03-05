from flask import Blueprint, request, jsonify 
 
documents_bp = Blueprint('documents', __name__) 
 
@documents_bp.route('/', methods=['GET']) 
def get_documents(): 
    # TODO: Implement get all documents 
    return jsonify({"message": "Get documents endpoint"}), 200 
 
@documents_bp.route('/', methods=['POST']) 
def upload_document(): 
    # TODO: Implement document upload 
    return jsonify({"message": "Upload document endpoint"}), 200 
