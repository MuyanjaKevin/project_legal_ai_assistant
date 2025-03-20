from datetime import datetime
from bson import ObjectId
from app.config.database import mongo

class Document:
    def __init__(self, title, content, file_type, user_id):
        self.title = title
        self.content = content
        self.file_type = file_type
        self.user_id = user_id
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.last_compared = None
        self.comparison_count = 0

    @staticmethod
    def get_by_id(document_id):
        return mongo.db.documents.find_one({"_id": ObjectId(document_id)})

    def save(self):
        document = {
            "title": self.title,
            "content": self.content,
            "file_type": self.file_type,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_compared": self.last_compared,
            "comparison_count": self.comparison_count
        }
        result = mongo.db.documents.insert_one(document)
        return str(result.inserted_id)

    def update_comparison_metadata(self):
        mongo.db.documents.update_one(
            {"_id": self._id},
            {
                "$set": {
                    "last_compared": datetime.utcnow(),
                    "comparison_count": self.comparison_count + 1
                }
            }
        )