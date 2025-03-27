# app/controllers/search.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database
import pymongo
import re
import html
from difflib import get_close_matches

search_bp = Blueprint('search', __name__)
db = get_database()

# Set up text index on application startup
def setup_search_indexes():
    """
    Create MongoDB text indexes for search functionality.
    Should be called during application startup.
    """
    try:
        # Create text index on searchable document fields
        db.documents.create_index([
            ("name", "text"),
            ("extracted_text", "text"),
            ("category", "text")
        ], name="document_search_index")
        
        # Create regular indexes for filtering
        db.documents.create_index([("user_id", pymongo.ASCENDING)], name="user_id_index")
        db.documents.create_index([("category", pymongo.ASCENDING)], name="category_index")
        db.documents.create_index([("upload_date", pymongo.ASCENDING)], name="upload_date_index")
        db.documents.create_index([("file_type", pymongo.ASCENDING)], name="file_type_index")
        db.documents.create_index([("tags", pymongo.ASCENDING)], name="tags_index")
        db.documents.create_index([("status", pymongo.ASCENDING)], name="status_index")
        
        # Create indexes for saved searches
        db.saved_searches.create_index([("user_id", pymongo.ASCENDING)], name="saved_search_user_index")
        
        print("MongoDB search indexes have been set up successfully")
    except Exception as e:
        print(f"Error setting up MongoDB indexes: {str(e)}")


def highlight_text(text, query_terms):
    """Highlight search terms in text snippets"""
    if not text or not query_terms:
        return text
        
    # Sanitize the text first
    text = html.escape(str(text))
    
    # Create a highlighted version for each term
    highlighted_text = text
    for term in query_terms:
        if term.strip():
            # Escape regex special characters
            escaped_term = re.escape(term.strip())
            # Case insensitive replacement
            pattern = f"(?i)({escaped_term})"
            replacement = f"<mark>\\1</mark>"
            highlighted_text = re.sub(pattern, replacement, highlighted_text)
            
    return highlighted_text


def create_text_snippet(text, query_terms, max_length=300):
    """Create a snippet of text around the first occurrence of search terms"""
    if not text or not query_terms:
        return text[:max_length] + "..." if len(text) > max_length else text
        
    text = str(text)
    
    # Find the first occurrence of any search term
    position = -1
    best_term = ""
    for term in query_terms:
        if term.strip():
            term_pos = text.lower().find(term.lower())
            if term_pos != -1 and (position == -1 or term_pos < position):
                position = term_pos
                best_term = term
    
    # If found, create snippet with context
    if position != -1:
        term_length = len(best_term)
        context_size = (max_length - term_length) // 2
        
        start = max(0, position - context_size)
        end = min(len(text), position + term_length + context_size)
        
        snippet = text[start:end]
        
        # Add ellipsis if we've truncated the text
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
            
        return snippet
    
    # Fallback to beginning of text if no terms found
    return text[:max_length] + "..." if len(text) > max_length else text


@search_bp.route('/api/search', methods=['GET'])
@jwt_required()
def search_documents():
    """
    Enhanced search endpoint with highlighting and advanced filtering.
    
    Query parameters:
    - q: Search query string
    - category: Filter by document category
    - start_date: Filter for documents uploaded after this date (ISO format)
    - end_date: Filter for documents uploaded before this date (ISO format)
    - file_type: Filter by file type (pdf, docx, txt, etc.)
    - status: Filter by document status
    - tags: Filter by document tags (can be multiple)
    - page: Page number (default: 1)
    - per_page: Results per page (default: 10)
    """
    current_user = get_jwt_identity()
    
    # Extract search parameters
    query = request.args.get('q', '')
    category = request.args.get('category')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    file_type = request.args.get('file_type')
    status = request.args.get('status')
    tags = request.args.getlist('tags')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    # Build MongoDB query
    mongo_query = {"user_id": current_user}
    
    # Split query into terms for highlighting
    query_terms = []
    if query:
        # Add text search
        mongo_query["$text"] = {"$search": query}
        # Store terms for highlighting
        query_terms = query.split()
    
    # Add category filter
    if category and category not in ['All', 'all', '']:
        mongo_query["category"] = category
    
    # Add date range filter
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            # Add 23:59:59 to include the entire end day
            date_query["$lte"] = datetime.fromisoformat(end_date + "T23:59:59" if "T" not in end_date else end_date)
        
        mongo_query["upload_date"] = date_query
    
    # Add file type filter
    if file_type and file_type != '':
        mongo_query["file_type"] = file_type
    
    # Add status filter
    if status and status != '':
        mongo_query["status"] = status
    
    # Add tags filter (all specified tags must be present)
    if tags and len(tags) > 0:
        valid_tags = [tag for tag in tags if tag and tag.strip()]
        if valid_tags:
            mongo_query["tags"] = {"$all": valid_tags}
    
    # Determine sort order (by text score if text search, otherwise by date)
    sort_params = []
    projection = None
    
    if query:
        # Sort by text score for relevance when performing text search
        sort_params.append(("score", {"$meta": "textScore"}))
        projection = {"score": {"$meta": "textScore"}}
    
    # Always include date as a sort parameter
    sort_params.append(("upload_date", pymongo.DESCENDING))
    
    try:
        # Get total count for pagination
        total = db.documents.count_documents(mongo_query)
        
        # Calculate skip for pagination
        skip = (page - 1) * per_page
        
        # Execute query with pagination
        documents = list(db.documents.find(
            mongo_query,
            projection
        ).sort(sort_params).skip(skip).limit(per_page))
        
        # Prepare search suggestions if no results and query provided
        suggestion = None
        if total == 0 and query:
            # Try to suggest alternative search terms from the document collection
            all_terms = []
            # Get terms from recent documents (limit to 50 to avoid processing too much)
            recent_docs = list(db.documents.find(
                {"user_id": current_user},
                {"extracted_text": 1}
            ).sort("upload_date", pymongo.DESCENDING).limit(50))
            
            # Extract words for suggestion matching
            for doc in recent_docs:
                if "extracted_text" in doc and doc["extracted_text"]:
                    # Simple tokenization for suggestion purposes
                    words = re.findall(r'\b\w+\b', doc["extracted_text"].lower())
                    all_terms.extend([w for w in words if len(w) > 3])
            
            # Remove duplicates
            all_terms = list(set(all_terms))
            
            # Find suggestions for each query term
            suggested_terms = {}
            for term in query_terms:
                if len(term) > 3:  # Only suggest for longer terms
                    matches = get_close_matches(term.lower(), all_terms, n=1, cutoff=0.75)
                    if matches and matches[0] != term.lower():
                        suggested_terms[term] = matches[0]
            
            # Create a suggested query if there are matches
            if suggested_terms:
                suggested_query = query
                for original, suggestion in suggested_terms.items():
                    suggested_query = suggested_query.replace(original, suggestion)
                
                if suggested_query != query:
                    suggestion = suggested_query
        
        # Process results - add highlighting and format for JSON
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            
            # Format date fields for JSON
            if "upload_date" in doc:
                doc["upload_date"] = doc["upload_date"].isoformat()
            
            # Create highlighted snippets for extracted text if query provided
            if "extracted_text" in doc and doc["extracted_text"] and query_terms:
                # Create a snippet around search terms
                snippet = create_text_snippet(doc["extracted_text"], query_terms)
                
                # Highlight the terms in the snippet
                doc["highlighted_snippet"] = highlight_text(snippet, query_terms)
                
                # Keep a limited preview in the main result
                doc["extracted_text"] = doc["extracted_text"][:250] + "..." if len(doc["extracted_text"]) > 250 else doc["extracted_text"]
            
            # Highlight the document name if it matches search terms
            if "name" in doc and doc["name"] and query_terms:
                doc["highlighted_name"] = highlight_text(doc["name"], query_terms)
                
        # Create response with search results, pagination info, and optional suggestion
        response_data = {
            "results": documents,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
        if suggestion:
            response_data["suggestion"] = suggestion
            
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({"message": f"Error performing search: {str(e)}"}), 500


@search_bp.route('/api/search/filters', methods=['GET'])
@jwt_required()
def get_filter_options():
    """Get available filter options for the current user"""
    current_user = get_jwt_identity()
    
    try:
        # Get distinct categories
        categories = db.documents.distinct("category", {"user_id": current_user})
        
        # Get distinct file types
        file_types = db.documents.distinct("file_type", {"user_id": current_user})
        
        # Get distinct tags
        tags = db.documents.distinct("tags", {"user_id": current_user})
        
        # Get distinct statuses
        statuses = db.documents.distinct("status", {"user_id": current_user})
        
        # Ensure "Uncategorized" is in categories
        if "Uncategorized" not in categories:
            categories.append("Uncategorized")
            
        # Sort lists
        categories.sort()
        tags.sort()
        
        return jsonify({
            "categories": categories,
            "file_types": file_types,
            "tags": tags,
            "statuses": statuses
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching filter options: {str(e)}"}), 500


@search_bp.route('/api/search/categories', methods=['GET'])
@jwt_required()
def get_search_categories():
    """Get all document categories for the current user (for search filters)"""
    current_user = get_jwt_identity()
    
    try:
        # Get distinct categories used by this user
        categories = db.documents.distinct("category", {"user_id": current_user})
        
        # Make sure we have an 'Uncategorized' option
        if "Uncategorized" not in categories:
            categories.append("Uncategorized")
            
        # Sort categories alphabetically
        categories.sort()
        
        return jsonify({"categories": categories}), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching categories: {str(e)}"}), 500


@search_bp.route('/api/saved-searches', methods=['GET'])
@jwt_required()
def get_saved_searches():
    """Get all saved searches for the current user"""
    current_user = get_jwt_identity()
    
    try:
        # Get saved searches for the current user, sorted by most recent first
        saved_searches = list(db.saved_searches.find(
            {"user_id": current_user}
        ).sort("created_at", pymongo.DESCENDING))
        
        # Convert ObjectId to string for JSON serialization
        for search in saved_searches:
            search["_id"] = str(search["_id"])
            if "created_at" in search:
                search["created_at"] = search["created_at"].isoformat()
        
        return jsonify({"saved_searches": saved_searches}), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching saved searches: {str(e)}"}), 500


@search_bp.route('/api/saved-searches', methods=['POST'])
@jwt_required()
def save_search():
    """Save a search configuration for later use"""
    current_user = get_jwt_identity()
    data = request.json
    
    try:
        # Validate request
        if not data or not data.get("name") or not data.get("query"):
            return jsonify({"message": "Name and query parameters are required"}), 400
        
        # Create saved search record
        saved_search = {
            "user_id": current_user,
            "name": data["name"],
            "query": data["query"],
            "created_at": datetime.utcnow()
        }
        
        # Save to database
        result = db.saved_searches.insert_one(saved_search)
        
        return jsonify({
            "message": "Search saved successfully",
            "id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"message": f"Error saving search: {str(e)}"}), 500


@search_bp.route('/api/saved-searches/<search_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_search(search_id):
    """Delete a saved search"""
    current_user = get_jwt_identity()
    
    try:
        # Delete the saved search
        result = db.saved_searches.delete_one({
            "_id": ObjectId(search_id),
            "user_id": current_user
        })
        
        if result.deleted_count:
            return jsonify({"message": "Search deleted successfully"}), 200
        else:
            return jsonify({"message": "Search not found or you don't have permission to delete it"}), 404
    except Exception as e:
        return jsonify({"message": f"Error deleting saved search: {str(e)}"}), 500