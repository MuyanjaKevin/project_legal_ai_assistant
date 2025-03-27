# Modify backend/app.py to include the new search controller

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity
import os

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-for-development')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-key')
    
    # Configure JWT
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 60 * 60 * 24 * 7  # 7 days
    app.config['JWT_EXEMPT_METHODS'] = ['OPTIONS']  # Exempt OPTIONS from JWT
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Add global before_request handler to handle preflight requests
    @app.before_request
    def handle_preflight():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Max-Age', '86400')
            return response
    
    # Configure CORS after JWT
    CORS(app, 
         resources={r"/api/*": {"origins": "http://localhost:3000"}},
         supports_credentials=True)
    
    # Add JWT error handlers for better debugging
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        print(f"Invalid JWT token: {error_string}")
        return jsonify({
            'message': 'Invalid token',
            'error': error_string
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        print(f"Missing JWT token: {error_string}")
        return jsonify({
            'message': 'Missing Authorization header',
            'error': error_string
        }), 401
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"Expired JWT token: {jwt_payload}")
        return jsonify({
            'message': 'Token has expired',
        }), 401
    
    # Register blueprints
    from app.controllers.auth import auth_bp
    from app.controllers.documents import documents_bp
    from app.controllers.contracts import contracts_bp
    from app.controllers.search import search_bp, setup_search_indexes  # Import the new search controller
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(contracts_bp, url_prefix='/api/contracts')
    app.register_blueprint(search_bp)  # The search blueprint already has /api/search prefix in its routes
    
    # Set up MongoDB indexes for search on application startup
    with app.app_context():
        setup_search_indexes()
    
    # Add a simple test route
    @app.route('/api/test', methods=['GET'])
    def test_route():
        return jsonify({"message": "API is working"}), 200
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)