from pymongo import MongoClient
from app.config.config import MONGODB_URI

_db = None

def get_database():
    global _db
    if _db is None:
        try:
            client = MongoClient(MONGODB_URI)
            _db = client.legalassistant
            
            # Ensure required collections exist
            collections = ['users', 'documents', 'contracts']
            for collection in collections:
                if collection not in _db.list_collection_names():
                    _db.create_collection(collection)
                    
        except Exception as e:
            print(f"Error connecting to database: {str(e)}")
            raise e
    
    return _db