from datetime import datetime
from bson import ObjectId
from app.config.database import get_database

db = get_database()

class Contract:
    def __init__(self, user_id, template_id, form_data, file_path=None):
        self.user_id = user_id
        self.template_id = template_id
        self.form_data = form_data
        self.file_path = file_path
        self.created_at = datetime.now()

    def save(self):
        contract_data = {
            'user_id': self.user_id,
            'template_id': self.template_id,
            'form_data': self.form_data,
            'file_path': self.file_path,
            'created_at': self.created_at
        }
        result = db.contracts.insert_one(contract_data)
        return str(result.inserted_id)

    @staticmethod
    def find_by_id(contract_id, user_id):
        try:
            contract = db.contracts.find_one({
                '_id': ObjectId(contract_id),
                'user_id': user_id
            })
            return contract
        except Exception:
            return None