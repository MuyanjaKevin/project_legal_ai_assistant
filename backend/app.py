from flask import Flask 
from flask_cors import CORS 
from flask_jwt_extended import JWTManager 
import os 
 
def create_app(): 
    app = Flask(__name__) 
 
    # Configure app 
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-for-development') 
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-key') 
 
    # Initialize extensions 
    CORS(app) 
    JWTManager(app) 
 
    # Register blueprints 
    from app.controllers.auth import auth_bp 
    from app.controllers.documents import documents_bp 
 
    app.register_blueprint(auth_bp, url_prefix='/api/auth') 
    app.register_blueprint(documents_bp, url_prefix='/api/documents') 
 
    return app 
 
if __name__ == '__main__': 
    app = create_app() 
    app.run(debug=True) 
