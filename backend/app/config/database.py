from pymongo import MongoClient
import os

def get_database():
    # Get MongoDB URI from environment variable or use default
    mongodb_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/legalassistant')
    
    # Create a connection
    client = MongoClient(mongodb_uri)
    
    # Get database name from URI
    db_name = mongodb_uri.split('/')[-1]
    
    # Return database instance
    return client[db_name]